export type QuestionType = "MCQ" | "MSQ" | "TITA" | "QUESTIONSET";

export interface OptionItem {
    key: string;
    value: string;
}

export interface QuizQuestion {
    id: string;
    type: QuestionType;
    question: string;
    options: OptionItem[];
    answer?: string | string[];
    explanation?: string;
    passage?: string; // For RC / QuestionSet
    index: number; // 0-based index
}

export interface UserResponse {
    selectedKeys: string[]; // For MCQ / MSQ
    textAnswer: string; // For TITA
    isGuessed: boolean;
    isMarkedForReview: boolean;
    isAnswered: boolean;
}

export type QuestionFilter = "all" | "answered" | "unanswered" | "review" | "guessed";

export interface QuizResultStats {
    total: number;
    attempted: number;
    unattempted: number;
    right: number;
    guessedRight: number;
    wrong: number;
    guessedWrong: number;
    score: number;
    accuracyPercentage: number;
    guessAccuracyPercentage: number;
    timeSpentSeconds: number;
    totalAllowedSeconds: number;
}

export interface QuizAttemptRecord {
    stats: QuizResultStats;
    questions: QuizQuestion[];
    userResponses: Record<string, UserResponse>;
    timestamp?: number;
}

export interface QuizCollectorSettings {
    timePerQuestionSeconds: number;
    enableTimer: boolean;
    warningTimeSeconds: number;
    autoAdvanceOnSelect: boolean;
    confirmBeforeSubmit: boolean;
    thresholdPercentage: number;
    randomizeQuestions: boolean;
    randomizeOptions: boolean;
}

export const DEFAULT_SETTINGS: QuizCollectorSettings = {
    timePerQuestionSeconds: 60,
    enableTimer: true,
    warningTimeSeconds: 15,
    autoAdvanceOnSelect: false,
    confirmBeforeSubmit: true,
    thresholdPercentage: 50,
    randomizeQuestions: true,
    randomizeOptions: true,
};

