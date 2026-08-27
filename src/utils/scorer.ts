import { QuizQuestion, UserResponse, QuizResultStats } from "../types";

export function calculateQuizResults(
    questions: QuizQuestion[],
    userResponses: Record<string, UserResponse>,
    timeSpentSeconds: number,
    totalAllowedSeconds: number
): QuizResultStats {
    let attempted = 0;
    let unattempted = 0;
    let right = 0;
    let guessedRight = 0;
    let wrong = 0;
    let guessedWrong = 0;

    for (const q of questions) {
        const resp = userResponses[q.id];
        const isAttempted = resp ? resp.isAnswered : false;

        if (!isAttempted) {
            unattempted++;
            continue;
        }

        attempted++;
        const isCorrect = checkIsCorrect(q, resp);
        const isGuessed = resp.isGuessed;

        if (isCorrect) {
            right++;
            if (isGuessed) {
                guessedRight++;
            }
        } else {
            wrong++;
            if (isGuessed) {
                guessedWrong++;
            }
        }
    }

    const total = questions.length;
    const score = right; // 1 mark per correct question
    const accuracyPercentage = attempted > 0 ? Math.round((right / attempted) * 100) : 0;
    const totalGuessed = guessedRight + guessedWrong;
    const guessAccuracyPercentage = totalGuessed > 0 ? Math.round((guessedRight / totalGuessed) * 100) : 0;

    return {
        total,
        attempted,
        unattempted,
        right,
        guessedRight,
        wrong,
        guessedWrong,
        score,
        accuracyPercentage,
        guessAccuracyPercentage,
        timeSpentSeconds,
        totalAllowedSeconds,
    };
}

export function checkIsCorrect(q: QuizQuestion, resp: UserResponse): boolean {
    if (!q || !resp || !resp.isAnswered) return false;

    if (q.type === "TITA") {
        const userText = (resp.textAnswer || "").trim().toLowerCase();
        if (typeof q.answer === "string") {
            return userText === q.answer.trim().toLowerCase();
        } else if (Array.isArray(q.answer)) {
            return q.answer.some((ans) => userText === ans.trim().toLowerCase());
        }
        return false;
    }

    // MCQ or MSQ
    const correctKeys = getCorrectAnswerKeys(q.answer);
    const userKeys = (resp.selectedKeys || []).map((k) => k.trim().toUpperCase()).sort();

    if (correctKeys.length === 0) return false;

    if (q.type === "MSQ") {
        if (userKeys.length !== correctKeys.length) return false;
        return correctKeys.every((key) => userKeys.includes(key));
    }

    // Standard MCQ
    if (userKeys.length !== 1) return false;
    return correctKeys.includes(userKeys[0]);
}

export function getCorrectAnswerKeys(answer: string | string[] | undefined): string[] {
    if (!answer) return [];
    if (Array.isArray(answer)) {
        return answer.map((a) => a.trim().toUpperCase()).filter(Boolean);
    }
    if (typeof answer === "string") {
        return answer
            .split(",")
            .map((a) => a.trim().toUpperCase())
            .filter(Boolean);
    }
    return [];
}
