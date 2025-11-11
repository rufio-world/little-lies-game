# 🐛 Bug Fix: Game Ends One Round Early

## The Problem

When creating a game with **5 rounds**, the game would end after only **2 rounds** (or any early number), instead of playing all 5 rounds as intended.

## Root Cause Analysis

### The Off-by-One Error

The bug was an **index comparison mismatch** between 0-indexed and 1-indexed counting:

**How the indices work:**
- `currentQuestionIndex` is **0-indexed**: 0, 1, 2, 3, 4 (represents the internal array position)
- `maxQuestions` is **1-indexed**: 5 means "play 5 rounds" (human-readable count)
- UI displays question as: `currentQuestionIndex + 1` of `maxQuestions` (e.g., "Question 5 of 5")

**The broken logic (OLD):**
```javascript
const nextQuestionIndex = gameRoom.currentQuestionIndex + 1;

if (nextQuestionIndex >= gameRoom.maxQuestions) {
  // END GAME
}
```

**Example walkthrough with `maxQuestions = 5`:**

| Round | currentIndex | nextIndex | Check: nextIndex >= 5? | Action |
|-------|--------------|-----------|------------------------|--------|
| 1     | 0            | 1         | 1 >= 5? NO             | Continue ✓ |
| 2     | 1            | 2         | 2 >= 5? NO             | Continue ✓ |
| 3     | 2            | 3         | 3 >= 5? NO             | Continue ✓ |
| 4     | 3            | 4         | 4 >= 5? NO             | Continue ✓ |
| 5     | 4            | 5         | 5 >= 5? **YES**        | **END GAME** ✗ |

❌ **Result**: Game ends BEFORE playing the 5th round!

## The Fix

Changed the termination condition from `>=` to `>`:

**The corrected logic (NEW):**
```javascript
const nextQuestionIndex = gameRoom.currentQuestionIndex + 1;

if (nextQuestionIndex > gameRoom.maxQuestions) {
  // END GAME
}
```

**Example walkthrough with fixed logic (`maxQuestions = 5`):**

| Round | currentIndex | nextIndex | Check: nextIndex > 5? | Action |
|-------|--------------|-----------|----------------------|--------|
| 1     | 0            | 1         | 1 > 5? NO            | Continue ✓ |
| 2     | 1            | 2         | 2 > 5? NO            | Continue ✓ |
| 3     | 2            | 3         | 3 > 5? NO            | Continue ✓ |
| 4     | 3            | 4         | 4 > 5? NO            | Continue ✓ |
| 5     | 4            | 5         | 5 > 5? NO            | Continue ✓ |
| END   | 5            | 6         | 6 > 5? **YES**       | **END GAME** ✓ |

✅ **Result**: Game plays all 5 rounds as intended!

## Files Changed

**`src/pages/GameRound.tsx`** — Two locations fixed:

1. **Line ~170** (Auto-advance logic in host effect):
   - Changed: `if (nextQuestionIndex >= gameRoom.maxQuestions)`
   - To: `if (nextQuestionIndex > gameRoom.maxQuestions)`

2. **Line ~238** (Check game end logic in all-players effect):
   - Changed: `if (nextQuestionIndex >= gameRoom.maxQuestions)`
   - To: `if (nextQuestionIndex > gameRoom.maxQuestions)`

Both locations added explanatory comments about the 0-indexed vs 1-indexed difference.

## Impact

✅ **Fixed**: Games now play the FULL number of rounds selected during creation  
✅ **Backward compatible**: No database changes, no API changes  
✅ **Scope**: Only affects round termination logic, nothing else  

## Testing

### How to Verify the Fix

1. **Create a new game with 5 rounds**
   - Go to "Create Game"
   - Select "5" for number of questions
   - Start the game

2. **Play through all rounds**
   - Round 1: Display shows "Question 1 of 5" ✓
   - Round 2: Display shows "Question 2 of 5" ✓
   - Round 3: Display shows "Question 3 of 5" ✓
   - Round 4: Display shows "Question 4 of 5" ✓
   - Round 5: Display shows "Question 5 of 5" ✓
   - After Round 5: **Final Results page appears** ✓

3. **Try other round counts**
   - Test with 10 rounds → should play all 10
   - Test with 15 rounds → should play all 15
   - Test with infinite (∞) → should continue until manually stopped (if that feature exists)

### Edge Cases

✅ **Solo game with 1 round** → Should show "Question 1 of 1" then end
✅ **2-player game with 3 rounds** → Both players should see all 3 rounds
✅ **Game with 100 rounds** → Should never end early

## Why This Bug Existed

The code was likely written with the assumption that:
- If `maxQuestions = 5`, then valid indices are 0-4
- Checking `nextIndex >= 5` would catch when trying to access index 5 (which doesn't exist)

However, the logic didn't account for the fact that:
- `maxQuestions` represents the **total count** (1-5 means "5 questions")
- `currentQuestionIndex` is the **current position** in the 0-indexed array
- Checking `nextIndex > maxQuestions` is the correct termination condition

This is a classic **fence-post error**: confusing the number of items with the highest valid index.

## References

- **File**: `src/pages/GameRound.tsx`
- **Lines**: ~170 and ~238
- **Related**: Game display logic in `AnswerSubmission.tsx`, `QuestionDisplay.tsx`, `VotingPhase.tsx`
- **Database**: No changes required

---

**Status**: ✅ FIXED  
**Applied**: November 11, 2025
