# ✅ Testing: Game Round Count Fix

## Quick Test (2 minutes)

### Test Case: 5-Round Game

1. **Open the game**
   ```
   npm run dev
   ```

2. **Create a new game**
   - Click "Create Game"
   - Select "5" questions
   - Name: "Test 5 Rounds"
   - Click "Create Room"

3. **Start as solo player** (for quick testing)
   - You'll be alone in waiting room
   - Click "Start Game" (ignore the solo warning if present)

4. **Play through all 5 rounds**
   - Round 1: Should display "Question 1 of 5"
   - Round 2: Should display "Question 2 of 5"
   - Round 3: Should display "Question 3 of 5"
   - Round 4: Should display "Question 4 of 5"
   - Round 5: Should display "Question 5 of 5" ← **This is the key test!**
   - After voting on Q5 → Should see **Final Results page** ✓

### Expected Result

✅ All 5 rounds complete  
✅ "Question 5 of 5" displays in the UI  
✅ Final Results page appears after round 5

---

## Test Case: Different Round Counts

**Test each of these:**

| Rounds | Test | Expected |
|--------|------|----------|
| 1 | Create game with 1 question | Shows "1 of 1", then ends |
| 3 | Create game with 3 questions | Shows "1 of 3", "2 of 3", "3 of 3", then ends |
| 10 | Create game with 10 questions | All 10 rounds play |
| 15 | Create game with 15 questions | All 15 rounds play |

---

## Console Check

Open browser console (F12) and look for:

✅ **Correct behavior:**
```
✅ All players ready, advancing to next round
✅ All players ready, advancing to next round
✅ All players ready, advancing to next round
✅ All players ready, advancing to next round
✅ All players ready, advancing to next round
```

❌ **Would indicate bug (stops too early):**
```
✅ All players ready, advancing to next round
✅ All players ready, advancing to next round
[missing the rest - game ended early]
```

---

## Browser DevTools: Check Round Progression

1. Open DevTools → Console
2. Watch `currentQuestionIndex` values as you progress
3. For 5 rounds, should see:
   - After round 1 vote: `currentQuestionIndex = 0` (Question 1 of 5)
   - After round 2 vote: `currentQuestionIndex = 1` (Question 2 of 5)
   - After round 3 vote: `currentQuestionIndex = 2` (Question 3 of 5)
   - After round 4 vote: `currentQuestionIndex = 3` (Question 4 of 5)
   - After round 5 vote: `currentQuestionIndex = 4` (Question 5 of 5) ← Last round!
   - Next check: `nextQuestionIndex = 5`, is `5 > 5`? NO → Continue (but no more questions)
   - Should end gracefully to Final Results

---

## Troubleshooting

### Game still ends early after the fix

**Possible causes:**
1. Dev server not reloaded after fix
   - **Solution**: Restart `npm run dev`

2. Browser cache
   - **Solution**: Clear cache or use Private/Incognito window

3. Supabase data not synced
   - **Solution**: Create a brand new game (don't reuse old one)

### Game displays wrong question count

**Example:** Displays "Question 2 of 5" when it should be "Question 3 of 5"

**Possible cause:** `currentQuestionIndex` not updating correctly  
**Solution:** Check that `advanceToNextQuestion()` is being called and updating the DB

---

## Integration Test: 2-Player Game (5 min)

For more thorough testing:

1. **Open 2 browser tabs** (or 2 devices)
2. **Tab 1**: Create game with 5 rounds, select as host
3. **Tab 2**: Join game with same code, select as player 2
4. **Tab 1**: Start game
5. **Both tabs**: Play through all rounds
   - Tab 1 shows "Question X of 5"
   - Tab 2 shows "Question X of 5"
6. **Verify**: After round 5, both see Final Results page

---

## Automated Check

If you have access to run the build:

```bash
npm run build
```

Should complete with no TypeScript errors related to `GameRound.tsx` round logic.

---

**Status**: Ready for testing ✅  
**Expected**: Game now plays the full selected number of rounds  
**Regression risk**: Very low (only changed comparison operator)
