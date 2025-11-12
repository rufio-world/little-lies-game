# Security Fix Implementation Guide

## Overview

This guide walks through implementing the security fixes identified in the security audit. We'll prioritize by impact and implementation complexity.

---

## Phase 1: Quick Wins (Done ✅)

### ✅ Answer Length Validation

**Files Modified**:
- `src/services/gameRoundService.ts` — Added min/max length checks (2-200 characters)
- `src/components/game/AnswerSubmission.tsx` — Added character counter UI

**What It Does**:
- Prevents DoS attacks via extremely long answers
- Prevents database bloat
- Improves UX with real-time character count

**Testing**:
```javascript
// Should fail: too short
await submitAnswer('x'); // ❌ "Answer must be at least 2 characters long"

// Should fail: too long
await submitAnswer('x'.repeat(201)); // ❌ "Answer must not exceed 200 characters"

// Should pass
await submitAnswer('This is a valid answer'); // ✅ Accepted
```

**Deployment Risk**: Very Low — Non-breaking change; only rejects invalid inputs

---

## Phase 2: Critical RLS Policy Fixes (Must Do Before Production)

### Issue 1: Fix Correct Answer Exposure

**Current State**: Vulnerable
```sql
-- Current RLS allows anyone to see correct_answer at any time
SELECT correct_answer FROM game_rounds WHERE room_id = $1;
```

**Target State**: Secure
```sql
-- Only expose correct_answer when phase = 'results'
CREATE OR REPLACE VIEW game_rounds_public AS
SELECT 
  id, room_id, round_number, question_id, question_text,
  CASE WHEN phase = 'results' THEN correct_answer ELSE NULL END as correct_answer,
  phase, created_at, updated_at
FROM game_rounds;
```

**Implementation Steps**:

1. **Create database view** (as documented in `SECURITY_RLS_MIGRATION.sql`)
2. **Update RLS policy** to restrict access and prevent querying correct_answer
3. **Test phase transitions** to ensure correct_answer appears after voting → results

**Application Code Changes**:
- Update `useGameRound.ts` subscription to filter on phase
- Update `GameRound.tsx` scoring logic to trust database values

**Deployment Risk**: HIGH — Affects core game logic; requires thorough testing

---

### Issue 2: Restrict Game Room Visibility

**Current State**: Vulnerable
```sql
-- Public can discover all waiting rooms
SELECT code, host_id, selected_packs FROM game_rooms WHERE game_state = 'waiting';
```

**Target State**: Secure
```sql
-- Only room participants can see room details
EXISTS (SELECT 1 FROM players 
  WHERE players.room_id = game_rooms.id 
  AND players.id = auth.uid())
```

**Critical Change**: The **join-by-code** flow needs a workaround because:
- New player isn't in the room yet, so RLS blocks the SELECT
- Solution: Create a **database function** that bypasses RLS

```sql
-- Create a special function that new players can call
CREATE OR REPLACE FUNCTION get_game_by_code(p_code TEXT)
RETURNS TABLE (id UUID, name TEXT, host_id UUID, selected_packs TEXT[], max_questions INT)
LANGUAGE plpgsql
SECURITY DEFINER  -- Runs with table owner permissions, not user permissions
AS $$
BEGIN
  RETURN QUERY
  SELECT gr.id, gr.name, gr.host_id, gr.selected_packs, gr.max_questions
  FROM game_rooms gr
  WHERE gr.code = p_code AND gr.game_state = 'waiting';
END;
$$;

-- Grant permission to authenticated users
GRANT EXECUTE ON FUNCTION get_game_by_code TO authenticated;
```

**Application Code Changes**:
- Update `src/pages/JoinGame.tsx` to call `get_game_by_code()` instead of direct SELECT
- Update `GameService.joinGame()` to use the RPC function

**Deployment Risk**: MEDIUM — Requires updating join flow; must test thoroughly

---

### Issue 3: Protect Player Data

**Current State**: Vulnerable
```sql
-- Anyone can see all players everywhere
(true) -- No restrictions
```

**Target State**: Secure
```sql
-- Only see players in your room
EXISTS (SELECT 1 FROM players self
  WHERE self.room_id = players.room_id 
  AND self.id = auth.uid())
```

**Implementation Steps**:
1. Update RLS policy on `players` table
2. Test that players in Room A can't see Room B players

**Application Code Changes**:
- Update `useGameRoom.ts` subscription — should still work since user is in the room
- No breaking changes expected

**Deployment Risk**: LOW — Mostly a restriction; all current users are room participants

---

## Phase 3: Medium Priority Fixes

### Edge Function Input Validation

**File**: `supabase/functions/create-checkout/index.ts`

**Add Validation**:
```typescript
import { z } from 'zod';

const checkoutSchema = z.object({
  packId: z.string().max(50),
  packName: z.string().max(100),
  price: z.number().min(0).max(9999),
});

// Validate incoming request
const validData = checkoutSchema.parse(body);
```

**Deployment Risk**: Very Low — Only adds validation, no breaking changes

---

## Implementation Timeline

### Week 1: Critical Fixes
- [ ] Day 1: Answer length validation (DONE ✅)
- [ ] Day 2: Create database function for join-by-code
- [ ] Day 3: Update game_rooms RLS policy and test
- [ ] Day 4: Create game_rounds view and update RLS policy
- [ ] Day 5: Update players RLS policy and test all together

### Week 2: High Priority
- [ ] Day 1: Add edge function validation
- [ ] Day 2-3: Full regression testing
- [ ] Day 4-5: Performance testing and optimization

### Week 3: Nice to Have
- [ ] Enable leaked password protection
- [ ] Review vote/answer timing
- [ ] Enhanced logging for security events

---

## Testing Strategy

### Unit Tests
```typescript
// Test answer length validation
test('rejects answer < 2 chars', async () => {
  expect(() => submitAnswer('a')).toThrow('at least 2 characters');
});

test('rejects answer > 200 chars', async () => {
  expect(() => submitAnswer('x'.repeat(201))).toThrow('exceed 200 characters');
});
```

### Integration Tests
```typescript
// Test game round flow with new RLS
test('player cannot see correct_answer during voting phase', async () => {
  // 1. Create game, start round
  // 2. Submit answers (phase = answer-submission)
  // 3. Check: correct_answer should be NULL
  // 4. Move to voting (phase = voting)
  // 5. Check: correct_answer should still be NULL
  // 6. Move to results (phase = results)
  // 7. Check: correct_answer should be visible
});

test('new player can join game by code despite RLS', async () => {
  // 1. Create game with code ABC123
  // 2. New player calls get_game_by_code('ABC123')
  // 3. Should return room data
  // 4. New player joins
  // 5. Verify RLS now allows them to see room data
});

test('players cannot see other room data', async () => {
  // 1. Create Room A with players 1, 2
  // 2. Create Room B with player 3
  // 3. Player 1 tries to SELECT from Room B
  // 4. Should be denied by RLS
});
```

### Security Tests
```typescript
// Test that unauthenticated access is blocked
test('unauthenticated user cannot query game_rounds', async () => {
  const client = createClient(); // No auth
  const result = await client.from('game_rounds').select('*');
  expect(result.error).toBeDefined();
});

test('unauthenticated user cannot list game_rooms', async () => {
  const client = createClient(); // No auth
  const result = await client.from('game_rooms').select('*');
  expect(result.error).toBeDefined();
});
```

---

## Rollback Plan

If issues occur after deployment:

1. **Immediate**: Revert RLS policies to previous state
2. **Short-term**: Disable join-by-code function
3. **Long-term**: Fix root cause and redeploy

**Rollback Commands**:
```sql
-- Revert game_rooms policy
DROP FUNCTION IF EXISTS get_game_by_code;
ALTER TABLE game_rooms SET RLS TO (game_state = 'waiting');

-- Revert players policy
ALTER TABLE players SET RLS TO (true);

-- Revert game_rounds policy
DROP VIEW IF EXISTS game_rounds_public;
ALTER TABLE game_rounds SET RLS TO (true);
```

---

## Sign-Off Checklist

Before marking security fixes as complete:

### Code Review
- [ ] All changes reviewed by team
- [ ] No security regressions introduced
- [ ] Performance impact assessed

### Testing
- [ ] Unit tests passing
- [ ] Integration tests passing
- [ ] Security tests passing
- [ ] Manual testing in staging

### Deployment
- [ ] Database migrations backed up
- [ ] Rollback plan verified
- [ ] Monitoring in place
- [ ] Team on standby during deployment

### Post-Deployment
- [ ] Monitor logs for errors
- [ ] Verify game flow works
- [ ] Gather user feedback
- [ ] Update documentation

---

## Documentation Updates

Update the following after fixes are deployed:

1. **README.md**: Add security best practices section
2. **.github/copilot-instructions.md**: Add security guidelines for contributors
3. **SECURITY.md**: Create formal security policy (if not exists)
4. **CONTRIBUTING.md**: Add security checklist for PRs

---

## Questions & Escalation

- **Q**: What if a game is already in progress when we deploy RLS changes?
  - **A**: Existing games continue to work; new RLS rules apply to future queries.
  
- **Q**: What if performance degrades after RLS changes?
  - **A**: Add indexes to `players.room_id` and `players.id` to speed up EXISTS checks.

- **Q**: Should we notify users about these changes?
  - **A**: Yes — transparency is important. Update privacy policy if needed.

---

**Document Version**: 1.0  
**Last Updated**: November 12, 2025  
**Status**: Ready for Implementation
