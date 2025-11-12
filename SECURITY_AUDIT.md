# Security Audit Report — Little Lies Game

**Date**: November 12, 2025  
**Status**: Security review identified critical, high, and medium-priority issues  
**Overall Posture**: Good foundational practices, but data exposure vulnerabilities enable cheating

---

## Executive Summary

A comprehensive security review of the Little Lies trivia game identified **10 actionable security issues** ranging from critical to low priority. The most severe issues involve **data exposure** (correct answers, player data, room codes) that could allow players to cheat or violate privacy.

### Critical Issues (Immediate Action Required)
1. **Correct Answer Exposure** — Players can query game_rounds directly to see answers before voting
2. **Game Room Code Leakage** — Public visibility of room codes allows uninvited players to join
3. **Player Data Exposure** — All player information is publicly readable without authentication

### High Priority (Before Production)
4. Edge function input validation is missing
5. Answer text lacks length limits

### Lower Priority (Nice to Have)
6. Vote/answer timing race conditions
7. Leaked password protection disabled

---

## Detailed Findings

### 🔴 CRITICAL: Players Can Cheat by Viewing Correct Answers

**Severity**: CRITICAL  
**Component**: Supabase `game_rounds` table, RLS policy  
**Issue**: The `correct_answer` field is readable by all room participants during any phase of the game.

**Attack Vector**:
```javascript
// A malicious player can open DevTools and run:
const { data } = await supabase
  .from('game_rounds')
  .select('correct_answer')
  .eq('room_id', roomId)
  .single();
console.log(data.correct_answer); // ✗ Cheater knows the answer!
```

**Impact**: 
- Completely breaks game mechanics
- Players cannot be deceived
- Scores are invalidated
- Game becomes unplayable in competitive mode

**Root Cause**: RLS policy does not restrict `correct_answer` field visibility based on game phase.

**Remediation**:
- [ ] Create a database view that conditionally exposes `correct_answer` only during 'results' phase
- [ ] Modify RLS policy to use this view for SELECT queries
- [ ] Or: Encrypt correct_answer server-side and only decrypt when phase = 'results'
- [ ] Or: Remove correct_answer from SELECT entirely; compute scores server-side in a trusted function

**Implementation Priority**: URGENT (affects core game integrity)

---

### 🔴 CRITICAL: Game Room Codes and Data Are Publicly Visible

**Severity**: CRITICAL  
**Component**: Supabase `game_rooms` table, RLS policy  
**Issue**: RLS allows anyone to SELECT room details when `game_state = 'waiting'`, exposing:
- Room codes (anyone can guess/enumerate codes to join uninvited)
- Host IDs
- Game configurations
- Selected question packs

**Current RLS Policy**:
```sql
(game_state = 'waiting'::text)
```

**Attack Vector**:
```javascript
// Anyone can enumerate active games
const { data } = await supabase
  .from('game_rooms')
  .select('code, host_id, selected_packs')
  .eq('game_state', 'waiting')
  .limit(100);
// Returns all active waiting rooms for griefing/joining uninvited
```

**Impact**:
- Privacy violation (anyone can discover active games)
- Griefing (uninvited players join to disrupt games)
- Uninvited players can gather game info before joining

**Root Cause**: RLS policy does not authenticate that the requester is a participant in the room.

**Remediation**:
- [ ] Remove the `(game_state = 'waiting'::text)` condition from SELECT policy
- [ ] Add check: `EXISTS (SELECT 1 FROM players WHERE players.room_id = game_rooms.id AND players.id = auth.uid())`
- [ ] Implement separate "join by code" endpoint that does NOT require a prior room SELECT
- [ ] Ensure only room participants can view room details

**Implementation Priority**: URGENT (affects privacy and game integrity)

---

### 🔴 CRITICAL: All Player Data Is Publicly Accessible

**Severity**: CRITICAL  
**Component**: Supabase `players` table, RLS policy  
**Issue**: The RLS policy on `players` table has `true` for SELECT, making all player data readable by anyone without authentication.

**Current RLS Policy**:
```sql
-- "Players can view all players" 
(true)
```

**Exposed Data**:
- Player names
- Scores
- Connection status
- Room associations
- Avatar URLs

**Attack Vector**:
```javascript
// Anyone can query without auth
const { data } = await supabase
  .from('players')
  .select('*');
// Returns all players in all games
```

**Impact**:
- Complete privacy violation
- Player tracking/stalking
- Information leakage to competitors
- Potential harassment

**Root Cause**: RLS policy is overly permissive; likely intended for multiplayer visibility within a room, but exposed globally.

**Remediation**:
- [ ] Change SELECT policy from `true` to require room participation:
  ```sql
  EXISTS (SELECT 1 FROM players self 
    WHERE self.room_id = players.room_id 
    AND self.id = auth.uid())
  ```
- [ ] Only authenticated users who are in the same room can see each other
- [ ] Update client-side hooks to expect restricted queries

**Implementation Priority**: URGENT (privacy violation)

---

### 🟡 HIGH: Edge Function Lacks Input Validation

**Severity**: HIGH  
**Component**: `supabase/functions/create-checkout/index.ts`  
**Issue**: The `create-checkout` edge function accepts user input without validation.

**Missing Validations**:
- No maximum length on `packId`, `packName`, `price`
- No type validation (e.g., `price` could be a string or negative)
- No rate limiting to prevent abuse
- No sanitization of input strings

**Attack Vector**:
```javascript
// Attacker could:
await fetch('/.netlify/functions/create-checkout', {
  method: 'POST',
  body: JSON.stringify({
    packId: 'x'.repeat(100000), // Cause service disruption
    packName: '<script>alert(1)</script>', // Injection attempt
    price: -999999, // Invalid checkout session
  })
});
```

**Impact**:
- Service disruption (DoS via large inputs)
- Payment system abuse
- Potential injection attacks
- Poor user experience

**Root Cause**: No input schema validation in edge function.

**Remediation**:
- [ ] Add Zod schema validation to edge function
- [ ] Enforce reasonable limits (packId: max 50 chars, packName: max 100 chars, price: positive number 0-9999)
- [ ] Add rate limiting per user (e.g., 5 requests per minute)
- [ ] Validate price matches known pack prices from database
- [ ] Return clear error messages for validation failures

**Implementation Priority**: HIGH (affects payment system)

---

### 🟡 HIGH: Answer Text Lacks Length Limits

**Severity**: HIGH  
**Component**: `src/services/gameRoundService.ts::submitAnswer()`  
**Issue**: Answer submission only validates that text is not empty; no maximum length is enforced.

**Current Validation**:
```typescript
if (!trimmedAnswer) {
  throw new Error('Answer cannot be empty');
}
```

**Attack Vector**:
```javascript
// Player could submit massive answer
await GameRoundService.submitAnswer(roundId, playerId, 'x'.repeat(1000000));
// Causes database bloat, UI rendering issues, memory exhaustion
```

**Impact**:
- Database storage bloat
- UI rendering performance degradation
- Potential DoS via resource exhaustion
- Poor experience for other players

**Root Cause**: No length validation in service layer or database.

**Remediation**:
- [ ] Add client-side validation in `AnswerSubmission.tsx` (max 200 characters)
- [ ] Add server-side validation in `gameRoundService.ts` (min 2, max 200 characters)
- [ ] Add database constraint: `CHECK (LENGTH(answer_text) BETWEEN 2 AND 200)`
- [ ] Display character counter UI to guide players
- [ ] Return clear error if submission exceeds limit

**Implementation Priority**: HIGH (affects database and UX)

---

### 🟢 INFO: Vote and Answer Timing Race Conditions

**Severity**: INFO (Lower Priority)  
**Component**: `GameRound.tsx`, `useGameRound.ts`  
**Issue**: RLS policies show answers during the "voting" phase and votes during the "results" phase. During phase transitions, there could be race conditions where data is visible prematurely.

**Example Scenario**:
1. Host initiates phase transition from 'answer-submission' → 'voting'
2. Player A's client hasn't refreshed yet; still sees 'answer-submission' phase
3. Player A queries player_answers (expecting to see only their own); RLS allows it because it's technically during voting now
4. Player A sees all other answers (intended for voting phase, but Player A thinks phase hasn't changed)

**Impact**: Minor gameplay integrity concern; mostly mitigated by client-side state management.

**Remediation**:
- [ ] Ensure phase transitions are atomic (single database update)
- [ ] Add logging to detect timing anomalies
- [ ] Consider database triggers to enforce phase transition rules
- [ ] Test phase transitions under high latency/concurrency

**Implementation Priority**: LOW (mitigated by good code practices)

---

### 🟢 INFO: Leaked Password Protection Disabled

**Severity**: INFO  
**Component**: Supabase Authentication settings  
**Issue**: Supabase's leaked password protection feature (checks passwords against known compromised databases) is currently disabled.

**Impact**: User accounts could use compromised passwords, but since this is a game (not a high-security app), risk is minimal.

**Remediation**:
- [ ] Go to Supabase Dashboard → Authentication → Password
- [ ] Enable "Leaked Password Protection"
- [ ] Notify existing users to update passwords

**Implementation Priority**: LOW (nice to have for security best practice)

---

## Recommended Implementation Order

### Phase 1: Critical Fixes (Do First)
1. **Fix Correct Answer Exposure** (Issue #1)
   - Estimated effort: 2-3 hours (database migration + RLS policy)
   - Testing complexity: High (phase transition timing)
   - Rollback risk: Medium (affects scoring logic)

2. **Restrict Game Room Visibility** (Issue #2)
   - Estimated effort: 1-2 hours (RLS policy update)
   - Testing complexity: Medium (join flow must still work)
   - Rollback risk: Low

3. **Protect Player Data** (Issue #3)
   - Estimated effort: 1-2 hours (RLS policy update)
   - Testing complexity: Low (only affects SELECT queries in room)
   - Rollback risk: Low

### Phase 2: High Priority Fixes (Before Production)
4. **Add Edge Function Validation** (Issue #4)
   - Estimated effort: 1-2 hours
   - Testing complexity: Medium
   - Rollback risk: Very low

5. **Enforce Answer Length Limits** (Issue #5)
   - Estimated effort: 1 hour
   - Testing complexity: Low
   - Rollback risk: Very low

### Phase 3: Nice to Have (Post-Launch)
6. Vote/answer timing review
7. Enable leaked password protection

---

## Testing Checklist

After implementing fixes, verify:

- [ ] **Correct Answer**: Player cannot query correct_answer during answer-submission or voting phases
- [ ] **Game Room**: Unauthenticated user cannot list all game rooms
- [ ] **Game Room**: Only room participants can view room details
- [ ] **Player Data**: Unauthenticated user cannot query all players
- [ ] **Player Data**: Player A cannot see Player B's data if not in same room
- [ ] **Join by Code**: New players can still join by entering a code (without prior room SELECT)
- [ ] **Edge Function**: Submission with oversized input is rejected
- [ ] **Edge Function**: Rate limiting works (5+ requests rejected)
- [ ] **Answer Length**: Submission with >200 char answer is rejected
- [ ] **Phase Transitions**: All answers/votes are correctly revealed only after respective phases complete

---

## Implementation Files to Update

### Database Migrations
- [ ] `supabase/migrations/` — New migration for RLS policy changes
- [ ] `supabase/migrations/` — New migration for answer length constraint

### Application Code
- [ ] `src/services/gameRoundService.ts` — Add answer length validation
- [ ] `src/components/game/AnswerSubmission.tsx` — Add character counter UI
- [ ] `supabase/functions/create-checkout/index.ts` — Add input validation
- [ ] `.github/copilot-instructions.md` — Update with security guidelines

### Documentation
- [ ] Create `SECURITY_FIXES.md` with implementation details
- [ ] Update `README.md` with security best practices for contributors

---

## Security Posture Summary

| Category | Status | Notes |
|----------|--------|-------|
| **Authentication** | ✅ Good | Supabase Auth properly configured |
| **Authorization** | ⚠️ Needs Work | RLS policies too permissive; needs immediate fixes |
| **Input Validation** | ⚠️ Partial | Auth flow validated; game functions lack validation |
| **Data Exposure** | 🔴 Critical | Correct answers, room codes, player data all exposed |
| **Encryption** | ✅ Good | HTTPS/TLS enforced; data in transit is encrypted |
| **Secrets** | ✅ Good | Public keys only in frontend; no server secrets leaked |
| **Logging** | ⚠️ Partial | Good for game state; could improve for security events |

---

## Next Steps

1. **Immediate**: Create database migration for RLS policy fixes
2. **Today**: Implement answer length validation
3. **This week**: Test all critical fixes thoroughly
4. **Before launch**: Get security review sign-off on all changes

---

**Document Version**: 1.0  
**Last Updated**: November 12, 2025  
**Next Review**: After critical fixes are implemented
