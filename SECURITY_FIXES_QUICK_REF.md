# Security Fixes — Quick Reference Card

## ✅ Phase 1: Complete

### Answer Length Validation (Done)
- **What**: Answers must be 2-200 characters
- **Why**: Prevents DoS, database bloat
- **Where**: `gameRoundService.ts`, `AnswerSubmission.tsx`
- **Test**: Try submitting 'a' (fails) or 201 chars (fails)

**User Facing**:
```
📝 Your Answer
┌─────────────────────┐
│ Type your answer... │
│                     │
└─────────────────────┘
45/200 characters [Almost at limit badge visible at 180+]
```

---

## 🔄 Phase 2: In Progress (Must Do Before Launch)

### 1. Fix Correct Answer Exposure (CRITICAL)
- **Status**: Documented in `SECURITY_RLS_MIGRATION.sql`
- **Action**: Create database view, update RLS policy
- **Estimated**: 2-3 hours
- **Risk**: HIGH (core game logic affected)
- **PR**: Will need thorough testing + code review

**What's Currently Exposed**:
```javascript
// Bad actor can see this in DevTools:
const { data } = await supabase
  .from('game_rounds')
  .select('correct_answer') // ← Should be hidden!
  .eq('room_id', roomId);
```

**How to Fix**:
1. Create view `game_rounds_public` that filters correct_answer by phase
2. Update RLS to use the view and restrict by room participation
3. Test all phase transitions

---

### 2. Restrict Game Room Visibility (CRITICAL)
- **Status**: Documented in `SECURITY_RLS_MIGRATION.sql`
- **Action**: Update RLS policy, create `get_game_by_code()` function
- **Estimated**: 1-2 hours
- **Risk**: MEDIUM (join flow must still work)
- **Files to Change**: 
  - Database: RLS policy + new function
  - `src/pages/JoinGame.tsx` — Use new function
  - `src/services/gameService.ts` — Update joinGame()

**What's Currently Exposed**:
```javascript
// Anyone can enumerate all waiting games:
const { data } = await supabase
  .from('game_rooms')
  .select('code, host_id, selected_packs')
  .eq('game_state', 'waiting');
// Result: 100+ active games exposed to public!
```

**How to Fix**:
1. Remove `game_state = 'waiting'` from RLS policy
2. Create function `get_game_by_code(code)` with SECURITY DEFINER
3. Update join flow to call function instead of direct SELECT
4. Test: New player can still join by entering code

---

### 3. Protect Player Data (CRITICAL)
- **Status**: Documented in `SECURITY_RLS_MIGRATION.sql`
- **Action**: Update RLS policy on players table
- **Estimated**: 1-2 hours
- **Risk**: LOW (restriction only)
- **Files to Change**: Database RLS policy only

**What's Currently Exposed**:
```javascript
// Anyone can see all players:
const { data } = await supabase
  .from('players')
  .select('*');
// Result: Names, scores, avatars of players in all games!
```

**How to Fix**:
1. Change RLS from `(true)` to `EXISTS (SELECT ... same room)`
2. Test: Player in Room A can't see Room B players
3. Test: Existing room subscriptions still work

---

## 🟡 Phase 3: High Priority (Before First Game)

### 4. Edge Function Input Validation (HIGH)
- **File**: `supabase/functions/create-checkout/index.ts`
- **Action**: Add Zod validation
- **Estimated**: 1-2 hours
- **Risk**: VERY LOW (validation only)

**What's Missing**:
- No max length on `packId`, `packName`
- No type checking on `price`
- No rate limiting

**How to Fix**:
```typescript
import { z } from 'zod';

const schema = z.object({
  packId: z.string().max(50),
  packName: z.string().max(100),
  price: z.number().min(0).max(9999),
});

const validData = schema.parse(request.body);
```

---

## 🟢 Phase 4: Nice to Have

- [ ] Enable leaked password protection (Supabase Auth settings)
- [ ] Add logging for security events
- [ ] Review phase transition timing

---

## Testing Checklist

### Before Merging Any PR:
- [ ] Build passes: `npm run build`
- [ ] No console errors in dev: `npm run dev`
- [ ] Answer validation: Try 1 char (fail), 201 chars (fail), normal (pass)
- [ ] Character counter: Shows real-time count + warning

### Before Deploying Phase 2:
- [ ] Unauthenticated user cannot query game_rounds
- [ ] Unauthenticated user cannot list game_rooms
- [ ] Join-by-code still works (test with and without auth)
- [ ] Game in progress doesn't break when policies change
- [ ] Performance: RLS queries complete in <100ms

### Before Launch:
- [ ] All Phase 2 & 3 tests pass
- [ ] No security test failures
- [ ] Privacy policy updated
- [ ] Team sign-off on security posture

---

## File Manifest

### Documentation (Read These!)
| File | Purpose | Priority |
|------|---------|----------|
| `SECURITY_AUDIT.md` | Detailed findings | HIGH |
| `SECURITY_RLS_MIGRATION.sql` | Database changes | CRITICAL |
| `SECURITY_FIX_IMPLEMENTATION.md` | Step-by-step guide | HIGH |
| `SECURITY_RESPONSE_SUMMARY.md` | Executive summary | HIGH |
| `SECURITY_FIXES_QUICK_REF.md` | This file | QUICK |

### Code Changes (Phase 1 Done)
- ✅ `src/services/gameRoundService.ts` — Validation added
- ✅ `src/components/game/AnswerSubmission.tsx` — UI updated

### Code Changes (Phase 2 Pending)
- ⏳ Database: RLS policies
- ⏳ `src/pages/JoinGame.tsx` — Use new function
- ⏳ `src/services/gameService.ts` — Update joinGame()

---

## Emergency Contacts

**If Phase 2 Breaks Join Flow**:
1. Rollback database migration
2. Revert join code changes
3. Re-enable old RLS policies
4. Test thoroughly before re-attempting

**If Correct Answer Still Visible**:
1. Verify RLS policy is applied
2. Verify game_rounds_public view exists
3. Check that phase transitions work
4. Review RLS policy syntax

---

## Success Criteria (Phase Complete When...)

- ✅ Answer validation prevents injection attacks
- ✅ Character counter improves UX
- ✅ No breaking changes to existing games
- ✅ Build passes with no errors
- ✅ Documentation complete and reviewed

---

**Version**: 1.0  
**Last Updated**: November 12, 2025  
**Print & Post**: Yes 👍
