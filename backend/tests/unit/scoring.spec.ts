import { test } from '@japa/runner'
import { scoreSession, earnedTriggers, applyBestScore } from '#services/scoring'

const config = {
  timeLimitSeconds: 75,
  timeBonusSeconds: 3,
  timePenaltySeconds: 5,
  pointsPerCorrect: 100,
  passPercentage: 60,
}
const key = new Map([
  [1, 1],
  [2, 0],
  [3, 2],
])

test.group('scoring', () => {
  test('perfect run: 3x100 + sisa detik x5', ({ assert }) => {
    // 75s - 20s - 15s - 15s + 3*3s = 34s tersisa
    const s = scoreSession(config, key, [
      { quiz_id: 1, selected_index: 1, elapsed_ms: 20000 },
      { quiz_id: 2, selected_index: 0, elapsed_ms: 15000 },
      { quiz_id: 3, selected_index: 2, elapsed_ms: 15000 },
    ])
    assert.deepInclude(s, { score: 470, correctCount: 3, timeLeftMs: 34000, cleared: true, perfect: true })
    assert.deepEqual(earnedTriggers(s, 0), ['chapter_completion', 'perfect_score', 'first_try'])
    assert.deepEqual(earnedTriggers(s, 2), ['chapter_completion', 'perfect_score'])
  })

  test('waktu habis: tidak tamat, tanpa bonus waktu', ({ assert }) => {
    const s = scoreSession(config, key, [
      { quiz_id: 1, selected_index: 1, elapsed_ms: 40000 },
      { quiz_id: 2, selected_index: 0, elapsed_ms: 40000 }, // 75-40+3-40 < 0, tidak dihitung
      { quiz_id: 3, selected_index: 2, elapsed_ms: 1000 },
    ])
    assert.deepInclude(s, { score: 100, correctCount: 1, cleared: false, perfect: false })
    assert.deepEqual(earnedTriggers(s, 0), [])
  })

  test('2/3 benar tetap tamat (>= 60%) tapi bukan perfect', ({ assert }) => {
    const s = scoreSession(config, key, [
      { quiz_id: 1, selected_index: 0, elapsed_ms: 5000 },
      { quiz_id: 2, selected_index: 0, elapsed_ms: 5000 },
      { quiz_id: 3, selected_index: 2, elapsed_ms: 5000 },
    ])
    // 75 - 15 - 5 + 6 = 61s
    assert.deepInclude(s, { score: 200 + 61 * 5, cleared: true, perfect: false })
  })

  test('menolak quiz_id asing / dobel', ({ assert }) => {
    assert.throws(() => scoreSession(config, key, [{ quiz_id: 99, selected_index: 0, elapsed_ms: 1 }]))
    assert.throws(() =>
      scoreSession(config, key, [
        { quiz_id: 1, selected_index: 1, elapsed_ms: 1 },
        { quiz_id: 1, selected_index: 1, elapsed_ms: 1 },
      ])
    )
  })

  test('best score tidak membatalkan poin yang sudah dipakai', ({ assert }) => {
    assert.deepEqual(applyBestScore({ highScore: 470, pointsSpent: 200 }, 520), {
      highScore: 520,
      previousHighScore: 470,
      isNewHighScore: true,
      availablePoints: 320,
    })
    assert.equal(applyBestScore({ highScore: 470, pointsSpent: 200 }, 300).availablePoints, 270)
  })
})
