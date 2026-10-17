/**
 * Logika skor time-attack, murni tanpa DB supaya gampang dites.
 * Server menghitung ulang semuanya dari jawaban mentah; skor dari client diabaikan.
 */

export const POINTS_PER_SECOND_LEFT = 5

export type GameConfig = {
  timeLimitSeconds: number
  timeBonusSeconds: number
  timePenaltySeconds: number
  pointsPerCorrect: number
  passPercentage: number
}

export type SubmittedAnswer = { quiz_id: number; selected_index: number; elapsed_ms: number }

export type TriggerType = 'chapter_completion' | 'perfect_score' | 'first_try'

/**
 * Replay timer: tiap jawaban mengurangi waktu sebesar elapsed_ms, lalu
 * benar = +bonus, salah = -penalti. Jawaban setelah waktu habis tidak dihitung.
 * answerKey: quiz_id -> correct_option_index untuk semua soal aktif chapter.
 */
export function scoreSession(config: GameConfig, answerKey: Map<number, number>, answers: SubmittedAnswer[]) {
  let timeLeftMs = config.timeLimitSeconds * 1000
  let correctCount = 0
  const seen = new Set<number>()
  const results: (SubmittedAnswer & { is_correct: boolean })[] = []

  for (const answer of answers) {
    if (!answerKey.has(answer.quiz_id) || seen.has(answer.quiz_id)) {
      throw new Error(`Invalid or duplicate quiz_id ${answer.quiz_id}`)
    }
    seen.add(answer.quiz_id)

    timeLeftMs -= Math.max(0, answer.elapsed_ms)
    if (timeLeftMs <= 0) break

    const isCorrect = answerKey.get(answer.quiz_id) === answer.selected_index
    if (isCorrect) correctCount++
    timeLeftMs += (isCorrect ? config.timeBonusSeconds : -config.timePenaltySeconds) * 1000
    results.push({ ...answer, is_correct: isCorrect })
    if (timeLeftMs <= 0) break
  }

  timeLeftMs = Math.max(0, timeLeftMs)
  const totalQuestions = answerKey.size
  const finished = totalQuestions > 0 && results.length === totalQuestions && timeLeftMs > 0
  const cleared = finished && correctCount * 100 >= totalQuestions * config.passPercentage
  const perfect = cleared && correctCount === totalQuestions
  const score =
    correctCount * config.pointsPerCorrect +
    (cleared ? Math.floor(timeLeftMs / 1000) * POINTS_PER_SECOND_LEFT : 0)

  return { score, correctCount, totalQuestions, timeLeftMs, cleared, perfect, results }
}

/**
 * Trigger achievement yang terpenuhi sesi ini. Insert-nya pakai
 * ON CONFLICT DO NOTHING, jadi yang sudah pernah unlock aman.
 * priorAttempts = attempts_count SEBELUM sesi ini.
 */
export function earnedTriggers(session: { cleared: boolean; perfect: boolean }, priorAttempts: number) {
  const triggers: TriggerType[] = []
  if (session.cleared) triggers.push('chapter_completion')
  if (session.perfect) triggers.push('perfect_score')
  if (session.cleared && priorAttempts === 0) triggers.push('first_try')
  return triggers
}

/**
 * Best score: high score hanya naik; points_spent tidak pernah disentuh,
 * jadi kupon yang sudah di-redeem tetap terbayar.
 */
export function applyBestScore(progress: { highScore: number; pointsSpent: number }, score: number) {
  const highScore = Math.max(progress.highScore, score)
  return {
    highScore,
    previousHighScore: progress.highScore,
    isNewHighScore: score > progress.highScore,
    availablePoints: highScore - progress.pointsSpent,
  }
}
