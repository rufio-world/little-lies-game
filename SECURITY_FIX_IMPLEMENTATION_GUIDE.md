# Security Phase 2: RLS Implementation Guide

**Last Updated:** November 12, 2025

---

## Overview

This guide provides step-by-step instructions to implement the remaining 3 critical RLS security fixes (Issues #2, #3, #4). These fixes are **blocking for production** and should be prioritized.

---

## Prerequisites

- [ ] Supabase project access (admin role)
- [ ] Git access to apply migrations
- [ ] Test environment for verification
- [ ] ~4-6 hours of development time
- [ ] Read: `SECURITY_PHASE_2_STATUS.md`

---

## Implementation Order

**Recommended sequence** (least to most impactful):

1. **Fix #4: Player Visibility** (1-2 hours) → Least breaking, good warm-up
2. **Fix #3: Room Visibility** (2-3 hours) → More complex, needs app changes
3. **Fix #2: Correct Answer** (2-3 hours) → Most critical, highest complexity

---

## Fix #1: Player Data Visibility (Priority: HIGH)

### What This Fixes
- **Vulnerability:** All player data exposed to any authenticated user
- **Attack:** Player enumeration, harassment, tracking
- **Severity:** HIGH

### Implementation Steps

#### Step 1.1: Apply Migration
```bash
# The migration is already in supabase/migrations/20251112_fix_rls_player_visibility.sql
# Review it first:
cat supabase/migrations/20251112_fix_rls_player_visibility.sql

# Deploy to Supabase:
supabase db push
```

#### Step 1.2: Verify RLS Policy
In Supabase Dashboard → SQL Editor, run:
```sql
-- Test 1: Non-room member cannot view room players
SELECT * FROM players 
WHERE room_id = (SELECT id FROM game_rooms LIMIT 1)
LIMIT 1;
-- Expected: Empty result (RLS should block)

-- Test 2: Room participant can view their players
-- (You need to set role to authenticated user in their room first)
SELECT * FROM players 
WHERE room_id IN (SELECT room_id FROM players WHERE id = auth.uid());
-- Expected: Returns players in user's room
```

#### Step 1.3: Test in Application
1. Create a test game with 2 players
2. Player A logs in → should see Player B (same room)
3. Player C logs in separately → should NOT see Player A or B
4. Player C creates their own game → should see their own players only

#### Step 1.4: Rollback (if needed)
```bash
supabase db reset  # In dev
# Then reapply previous migrations without 20251112_fix_rls_player_visibility.sql
```

---

## Fix #2: Room Visibility (Priority: HIGH)

### What This Fixes
- **Vulnerability:** Room codes exposed during waiting phase
- **Attack:** Uninvited players join; griefing; privacy violation
- **Severity:** HIGH

### Implementation Steps

#### Step 2.1: Apply Migration
```bash
cat supabase/migrations/20251112_fix_rls_room_visibility.sql
# Review the migration

supabase db push
```

#### Step 2.2: **CRITICAL** - Update Application Code

This migration REQUIRES application-level changes to avoid breaking the join flow.

##### Problem:
The old flow was: User enters code → Check if room exists and is waiting
With the new RLS, non-participants can't query by code, so the join flow breaks.

##### Solution: Create a "Join by Code" Function

In Supabase Dashboard → SQL Editor, create this function:

```sql
CREATE OR REPLACE FUNCTION public.get_room_by_code(p_code TEXT)
RETURNS TABLE (
  id TEXT,
  code TEXT,
  name TEXT,
  game_state TEXT
) AS $$
BEGIN
  -- This function bypasses RLS (runs as service role in app context)
  -- Used for join-by-code without requiring pre-existing room access
  RETURN QUERY
  SELECT 
    game_rooms.id,
    game_rooms.code,
    game_rooms.name,
    game_rooms.game_state
  FROM public.game_rooms
  WHERE game_rooms.code = p_code
  AND game_rooms.game_state = 'waiting'
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant access
GRANT EXECUTE ON FUNCTION public.get_room_by_code(TEXT) TO authenticated;
```

##### Update Frontend Code (src/pages/JoinGame.tsx):

Find this section:
```typescript
// OLD CODE - will break with new RLS
const { data: roomData } = await supabase
  .from('game_rooms')
  .select('*')
  .eq('code', gameCode)
  .single();
```

Replace with:
```typescript
// NEW CODE - uses the function
const { data: roomData, error } = await supabase
  .rpc('get_room_by_code', { p_code: gameCode });

if (error || !roomData) {
  throw new Error('Invalid game code or game has already started');
}
```

#### Step 2.3: Verify RLS Policy

In Supabase SQL Editor:
```sql
-- Test 1: Non-participant cannot view room by direct query
SELECT * FROM game_rooms WHERE code = 'TESTCODE';
-- Expected: Empty (RLS blocks access)

-- Test 2: Using the function works
SELECT * FROM public.get_room_by_code('TESTCODE');
-- Expected: Returns room if it exists and is waiting

-- Test 3: Participant can view their room
SELECT * FROM game_rooms 
WHERE id IN (SELECT room_id FROM players WHERE id = auth.uid());
-- Expected: Returns participant's rooms
```

#### Step 2.4: Test Join Flow
1. Create game A with Player 1
2. Get the game code
3. Log in as Player 2 (different session)
4. Enter the code in JoinGame
5. Click Join
6. Verify: Player 2 joins successfully
7. Verify: Player 2 cannot query other game rooms directly

#### Step 2.5: Rollback (if needed)
```bash
# Drop the function first
supabase db reset
```

---

## Fix #3: Correct Answer Exposure (Priority: CRITICAL)

### What This Fixes
- **Vulnerability:** Correct answers visible during gameplay
- **Attack:** Open browser DevTools → Query DB → See all answers before voting
- **Severity:** CRITICAL (game-breaking)

### Implementation Steps

#### Step 3.1: Apply Migration
```bash
cat supabase/migrations/20251112_fix_rls_correct_answer.sql
supabase db push
```

#### Step 3.2: Update GameRoundService

File: `src/services/gameRoundService.ts`

Find the `getCurrentRound` method:
```typescript
// OLD CODE
static async getCurrentRound(roomId: string): Promise<GameRound | null> {
  const { data, error } = await supabase
    .from('game_rounds')
    .select('*')
    .eq('room_id', roomId)
    .order('round_number', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as GameRound | null;
}
```

Replace with:
```typescript
// NEW CODE - hide correct_answer during non-results phases
static async getCurrentRound(roomId: string): Promise<GameRound | null> {
  const { data: round, error } = await supabase
    .from('game_rounds')
    .select('*')
    .eq('room_id', roomId)
    .order('round_number', { ascending: false })
    .limit(1)
    .maybeSingle();
    
  if (error) throw error;
  if (!round) return null;
  
  // Hide correct_answer during gameplay phases
  // Only show during results phase
  if (round.phase !== 'results') {
    round.correct_answer = '';  // Clear the answer
  }
  
  return round as GameRound | null;
}
```

Also update `getRoundAnswers` and other queries to use `game_rounds_safe` view:
```typescript
// Add this helper method
static async getCurrentRoundSafe(roomId: string): Promise<GameRound | null> {
  // Use the safe view that hides answers during gameplay
  const { data, error } = await supabase
    .from('game_rounds_safe')
    .select('*')
    .eq('room_id', roomId)
    .order('round_number', { ascending: false })
    .limit(1)
    .maybeSingle();
  
  if (error) throw error;
  return data as GameRound | null;
}

// Update all game round queries to use this view instead
```

#### Step 3.3: Update GameRound.tsx

File: `src/pages/GameRound.tsx`

Find where `currentRound` is used to display the correct answer. This should only happen during results phase:

```typescript
// BEFORE: 
<p>{currentRound.correct_answer}</p>

// AFTER: Add guard
{currentRound?.phase === 'results' && (
  <p>{currentRound.correct_answer}</p>
)}
```

#### Step 3.4: Verify Security

In Supabase SQL Editor:
```sql
-- Test 1: During voting phase, correct_answer should be hidden
SELECT correct_answer FROM game_rounds_safe 
WHERE phase = 'voting' 
LIMIT 1;
-- Expected: '[HIDDEN]' or empty

-- Test 2: During results phase, correct_answer visible
SELECT correct_answer FROM game_rounds_safe 
WHERE phase = 'results' 
LIMIT 1;
-- Expected: Actual answer text

-- Test 3: Try direct query (should work but application should ignore)
SELECT correct_answer FROM game_rounds 
WHERE phase = 'voting' 
LIMIT 1;
-- Expected: Returns actual answer (no RLS protection at DB level)
-- But application layer should hide it
```

#### Step 3.5: Test Gameplay Security
1. Start a game
2. During voting phase:
   - Open browser DevTools → Console
   - Try: `supabase.from('game_rounds').select('*')`
   - Verify: `correct_answer` is either empty or excluded
3. During results phase:
   - Same query should show correct_answer
4. Complete game and verify scoring is correct

#### Step 3.6: Rollback (if needed)
```bash
supabase db reset
```

---

## Post-Implementation Checklist

### Immediate (After each fix)
- [ ] Run migration in dev environment
- [ ] Run verification SQL queries
- [ ] Test affected gameplay flows
- [ ] Check for console errors
- [ ] Verify no performance degradation

### Before Production Deployment
- [ ] [ ] All 3 fixes applied and tested in staging
- [ ] [ ] Run full gameplay test scenario (5+ players, multiple rounds)
- [ ] [ ] Verify scoring is accurate
- [ ] [ ] Check network requests in DevTools for data exposure
- [ ] [ ] Performance test (query times, database load)
- [ ] [ ] Document any app behavior changes in CHANGELOG
- [ ] [ ] Get security review approval

### Ongoing Monitoring
- [ ] [ ] Enable Supabase audit logs
- [ ] [ ] Set up alerts for unusual RLS policy errors
- [ ] [ ] Review player reports of cheating
- [ ] [ ] Monthly security review

---

## Testing Commands

### Quick Smoke Test (after all fixes)
```bash
npm run dev
# Then manually:
1. Create game with Player 1
2. Join with Player 2
3. Start game
4. Submit answers in voting phase
5. Try to access other rooms' data via console
6. Complete voting and check results phase
7. Verify correct answer only visible in results
```

### Security Test Script (Optional)
Create `test-security.js`:
```javascript
// Run in browser console during gameplay
async function testSecurity() {
  // Test 1: Try to list all players
  const players = await supabase.from('players').select('*');
  console.log('Can list all players?', players.data.length > 0);
  
  // Test 2: Try to query other rooms
  const otherRooms = await supabase
    .from('game_rooms')
    .select('*')
    .not('id', 'eq', currentRoomId);
  console.log('Can query other rooms?', otherRooms.data.length > 0);
  
  // Test 3: Try to see correct answer during voting
  const round = await supabase
    .from('game_rounds')
    .select('*')
    .eq('phase', 'voting')
    .limit(1);
  console.log('Can see answer during voting?', 
    round.data[0]?.correct_answer && 
    round.data[0].correct_answer !== '[HIDDEN]'
  );
}
testSecurity();
```

---

## Troubleshooting

### Problem: Join-by-code returns error after Fix #3
**Solution:** Verify the `get_room_by_code` function exists and is called correctly in JoinGame.tsx

### Problem: Correct answer still visible during voting
**Solution:** Check that:
1. Migration applied successfully
2. GameRoundService uses `game_rounds_safe` view
3. GameRound.tsx guards answer display with phase check

### Problem: Performance degrades after migration
**Solution:**
- Check database query logs
- Verify indexes exist on `room_id`, `players.id`
- Consider query optimization or caching

---

## References

- Supabase RLS Docs: https://supabase.com/docs/guides/auth/row-level-security
- PostgreSQL SECURITY DEFINER: https://www.postgresql.org/docs/current/sql-createfunction.html
- Migration files: `supabase/migrations/20251112_*.sql`
- Status report: `SECURITY_PHASE_2_STATUS.md`

---

## Timeline Summary

| Fix | Complexity | Time | Start | End |
|-----|-----------|------|-------|-----|
| #4 Player Visibility | Medium | 1-2h | Day 1 | Day 1 |
| #3 Room Visibility | High | 2-3h | Day 1-2 | Day 2 |
| #2 Correct Answer | Critical | 2-3h | Day 2-3 | Day 3 |
| Testing | Medium | 2-3h | Day 3 | Day 3 |
| **Total** | | **7-11h** | Day 1 | Day 3 |

