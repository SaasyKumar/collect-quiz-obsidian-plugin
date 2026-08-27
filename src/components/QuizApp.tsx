import React, { useState, useEffect, useRef } from "react";
import {
    QuizQuestion,
    UserResponse,
    QuizCollectorSettings,
    QuizResultStats,
    QuizAttemptRecord,
} from "../types";
import { QuizHeader } from "./QuizHeader";
import { QuestionCard } from "./QuestionCard";
import { QuestionPalette } from "./QuestionPalette";
import { ResultView } from "./ResultView";
import { calculateQuizResults, checkIsCorrect } from "../utils/scorer";
import { randomizeQuiz } from "../utils/randomizer";
import { Play, AlertCircle, CheckCircle2, Bookmark, Lightbulb } from "lucide-react";

interface QuizAppProps {
    quizTitle: string;
    questions: QuizQuestion[];
    settings: QuizCollectorSettings;
    onCloseModal: () => void;
    onExportAsNote: (content: string) => void;
}

type QuizPhase = "taking" | "results";

export const QuizApp: React.FC<QuizAppProps> = ({
    quizTitle,
    questions: rawQuestions,
    settings,
    onCloseModal,
    onExportAsNote,
}) => {
    // Active questions for the current run (randomized on start)
    const [activeQuestions, setActiveQuestions] = useState<QuizQuestion[]>(() =>
        randomizeQuiz(rawQuestions, settings.randomizeQuestions, settings.randomizeOptions)
    );

    // Initial attempt record if user enters recursive retest mode
    const [initialAttempt, setInitialAttempt] = useState<QuizAttemptRecord | null>(null);
    const [isRecursiveIteration, setIsRecursiveIteration] = useState<boolean>(false);

    // Current question index
    const [currentIndex, setCurrentIndex] = useState(0);

    // User responses indexed by question id
    const [userResponses, setUserResponses] = useState<Record<string, UserResponse>>({});

    // Quiz phases: "taking" | "results"
    const [phase, setPhase] = useState<QuizPhase>("taking");

    // Modal state for confirmation before final submit
    const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);

    // Final calculated statistics
    const [finalStats, setFinalStats] = useState<QuizResultStats | null>(null);

    // Timer calculation: time per question * active questions count
    const totalAllowedSeconds = Math.max(10, settings.timePerQuestionSeconds * activeQuestions.length);
    const [timeLeft, setTimeLeft] = useState<number>(totalAllowedSeconds);
    const [isTimerRunning, setIsTimerRunning] = useState<boolean>(settings.enableTimer);
    const [timeSpent, setTimeSpent] = useState<number>(0);

    // Timer interval ref
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // Start / Tick timer
    useEffect(() => {
        if (phase !== "taking" || !settings.enableTimer) {
            if (timerRef.current) clearInterval(timerRef.current);
            return;
        }

        if (isTimerRunning) {
            timerRef.current = setInterval(() => {
                setTimeLeft((prevTime) => {
                    if (prevTime <= 1) {
                        // Time's up! Auto submit quiz
                        if (timerRef.current) clearInterval(timerRef.current);
                        setIsTimerRunning(false);
                        handleFinalSubmit();
                        return 0;
                    }
                    return prevTime - 1;
                });

                setTimeSpent((prev) => prev + 1);
            }, 1000);
        } else {
            if (timerRef.current) clearInterval(timerRef.current);
        }

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [isTimerRunning, phase, settings.enableTimer]);

    const handleToggleTimer = () => {
        setIsTimerRunning((prev) => !prev);
    };

    // Current active question
    const currentQuestion = activeQuestions[currentIndex] || activeQuestions[0];
    const currentResponse = currentQuestion ? userResponses[currentQuestion.id] : undefined;

    // Option selection handler
    const handleSelectOption = (key: string, isGuessed: boolean) => {
        if (!currentQuestion) return;

        const qId = currentQuestion.id;
        const prevResp = userResponses[qId] || {
            selectedKeys: [],
            textAnswer: "",
            isGuessed: false,
            isMarkedForReview: false,
            isAnswered: false,
        };

        let newSelectedKeys: string[] = [];

        if (currentQuestion.type === "MSQ") {
            // Multi select toggle
            if (prevResp.selectedKeys.includes(key)) {
                newSelectedKeys = prevResp.selectedKeys.filter((k) => k !== key);
            } else {
                newSelectedKeys = [...prevResp.selectedKeys, key];
            }
        } else {
            // Single choice (MCQ)
            newSelectedKeys = [key];
        }

        const isAnswered = newSelectedKeys.length > 0;

        setUserResponses((prev) => ({
            ...prev,
            [qId]: {
                ...prevResp,
                selectedKeys: newSelectedKeys,
                isGuessed: isGuessed,
                isAnswered: isAnswered,
            },
        }));

        // Optional auto-advance on single choice
        if (
            settings.autoAdvanceOnSelect &&
            currentQuestion.type === "MCQ" &&
            currentIndex < activeQuestions.length - 1
        ) {
            setTimeout(() => {
                setCurrentIndex((idx) => Math.min(activeQuestions.length - 1, idx + 1));
            }, 300);
        }
    };

    // Text answer handler for TITA
    const handleTextAnswerChange = (text: string, isGuessed?: boolean) => {
        if (!currentQuestion) return;
        const qId = currentQuestion.id;
        const prevResp = userResponses[qId] || {
            selectedKeys: [],
            textAnswer: "",
            isGuessed: false,
            isMarkedForReview: false,
            isAnswered: false,
        };

        const trimmed = text.trim();
        const guessedFlag = isGuessed !== undefined ? isGuessed : prevResp.isGuessed;

        setUserResponses((prev) => ({
            ...prev,
            [qId]: {
                ...prevResp,
                textAnswer: text,
                isGuessed: guessedFlag,
                isAnswered: trimmed.length > 0,
            },
        }));
    };

    // Mark for review toggle
    const handleToggleMarkForReview = () => {
        if (!currentQuestion) return;
        const qId = currentQuestion.id;
        const prevResp = userResponses[qId] || {
            selectedKeys: [],
            textAnswer: "",
            isGuessed: false,
            isMarkedForReview: false,
            isAnswered: false,
        };

        setUserResponses((prev) => ({
            ...prev,
            [qId]: {
                ...prevResp,
                isMarkedForReview: !prevResp.isMarkedForReview,
            },
        }));
    };

    // Clear answer for current question
    const handleClearAnswer = () => {
        if (!currentQuestion) return;
        const qId = currentQuestion.id;
        const prevResp = userResponses[qId];
        if (!prevResp) return;

        setUserResponses((prev) => ({
            ...prev,
            [qId]: {
                ...prevResp,
                selectedKeys: [],
                textAnswer: "",
                isGuessed: false,
                isAnswered: false,
            },
        }));
    };

    // Navigation
    const handlePrevious = () => {
        setCurrentIndex((prev) => Math.max(0, prev - 1));
    };

    const handleNext = () => {
        setCurrentIndex((prev) => Math.min(activeQuestions.length - 1, prev + 1));
    };

    const handleJumpToQuestion = (index: number) => {
        if (index >= 0 && index < activeQuestions.length) {
            setCurrentIndex(index);
        }
    };

    // Submit dialog triggers
    const handleSubmitClick = () => {
        if (settings.confirmBeforeSubmit) {
            setShowSubmitConfirm(true);
        } else {
            handleFinalSubmit();
        }
    };

    const handleFinalSubmit = () => {
        setShowSubmitConfirm(false);
        setIsTimerRunning(false);
        const stats = calculateQuizResults(
            activeQuestions,
            userResponses,
            timeSpent,
            totalAllowedSeconds
        );
        setFinalStats(stats);
        setPhase("results");
    };

    // Full retake (restart fresh full quiz with newly randomized order & choices)
    const handleRetakeQuiz = () => {
        const freshQuestions = randomizeQuiz(
            rawQuestions,
            settings.randomizeQuestions,
            settings.randomizeOptions
        );
        setActiveQuestions(freshQuestions);
        setInitialAttempt(null);
        setIsRecursiveIteration(false);
        setUserResponses({});
        setCurrentIndex(0);
        const allowed = Math.max(10, settings.timePerQuestionSeconds * freshQuestions.length);
        setTimeLeft(allowed);
        setTimeSpent(0);
        setIsTimerRunning(settings.enableTimer);
        setFinalStats(null);
        setPhase("taking");
    };

    // Recursive Retest: Only wrong/unanswered questions from attempt 1
    const handleStartRecursiveTest = () => {
        if (!finalStats) return;

        // Filter for questions that were answered incorrectly or left unattempted
        const wrongQuestions = activeQuestions.filter((q) => {
            const resp = userResponses[q.id];
            return !checkIsCorrect(q, resp);
        });

        if (wrongQuestions.length === 0) return;

        // Save Attempt 1 snapshot
        const firstAttemptSnapshot: QuizAttemptRecord = {
            stats: finalStats,
            questions: activeQuestions,
            userResponses: { ...userResponses },
            timestamp: Date.now(),
        };
        setInitialAttempt(firstAttemptSnapshot);

        // Randomize the wrong questions subset for Attempt 2
        const randomizedWrong = randomizeQuiz(
            wrongQuestions,
            settings.randomizeQuestions,
            settings.randomizeOptions
        );

        setActiveQuestions(randomizedWrong);
        setUserResponses({});
        setCurrentIndex(0);
        const allowedTime = Math.max(10, settings.timePerQuestionSeconds * randomizedWrong.length);
        setTimeLeft(allowedTime);
        setTimeSpent(0);
        setIsTimerRunning(settings.enableTimer);
        setFinalStats(null);
        setIsRecursiveIteration(true);
        setPhase("taking");
    };

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (
                e.target instanceof HTMLInputElement ||
                e.target instanceof HTMLTextAreaElement ||
                showSubmitConfirm
            ) {
                return;
            }

            if (phase === "taking") {
                if (e.key === "ArrowRight") {
                    e.preventDefault();
                    if (currentIndex < activeQuestions.length - 1) handleNext();
                } else if (e.key === "ArrowLeft") {
                    e.preventDefault();
                    if (currentIndex > 0) handlePrevious();
                } else if (e.key.toLowerCase() === "m") {
                    e.preventDefault();
                    handleToggleMarkForReview();
                } else if (e.code === "Space") {
                    e.preventDefault();
                    handleToggleTimer();
                } else if (["1", "2", "3", "4", "5", "6"].includes(e.key)) {
                    const optIdx = parseInt(e.key, 10) - 1;
                    if (currentQuestion?.options && currentQuestion.options[optIdx]) {
                        e.preventDefault();
                        handleSelectOption(currentQuestion.options[optIdx].key, false);
                    }
                } else if (["a", "b", "c", "d", "e", "f"].includes(e.key.toLowerCase())) {
                    const keyUpper = e.key.toUpperCase();
                    const foundOpt = currentQuestion?.options?.find((o) => o.key === keyUpper);
                    if (foundOpt) {
                        e.preventDefault();
                        handleSelectOption(foundOpt.key, false);
                    }
                }
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [phase, currentIndex, activeQuestions, currentQuestion, showSubmitConfirm]);

    // Count statistics for submit confirmation modal
    const answeredCount = Object.values(userResponses).filter((r) => r.isAnswered).length;
    const unansweredCount = activeQuestions.length - answeredCount;
    const reviewCount = Object.values(userResponses).filter((r) => r.isMarkedForReview).length;
    const guessedCount = Object.values(userResponses).filter((r) => r.isGuessed).length;

    if (!activeQuestions || activeQuestions.length === 0) {
        return (
            <div className="qc-empty-state">
                <AlertCircle size={40} className="qc-empty-icon" />
                <h3>No Questions Found</h3>
                <p>
                    Could not parse any valid questions from this note using <code>skewer-format</code>.
                </p>
                <p className="qc-empty-hint">
                    Make sure your note follows the Skewer format (e.g., <code>QUESTION: ...</code>, <code>A. ...</code>, <code>ANSWER: B</code>).
                </p>
                <button type="button" className="qc-btn qc-btn-primary" onClick={onCloseModal}>
                    Close
                </button>
            </div>
        );
    }

    return (
        <div className="qc-app-root">
            {/* Header */}
            <QuizHeader
                title={quizTitle}
                currentIndex={currentIndex}
                totalQuestions={activeQuestions.length}
                timeLeft={timeLeft}
                totalTime={totalAllowedSeconds}
                isTimerRunning={isTimerRunning}
                isTimerEnabled={settings.enableTimer}
                warningTimeSeconds={settings.warningTimeSeconds}
                onToggleTimer={handleToggleTimer}
                onSubmitQuiz={handleSubmitClick}
                onClose={onCloseModal}
                userResponses={userResponses}
                questions={activeQuestions}
                phase={phase}
                isRecursive={isRecursiveIteration}
            />

            {/* Main Taking Area */}
            {phase === "taking" && (
                <div className="qc-main-layout">
                    {/* Paused Overlay */}
                    {!isTimerRunning && settings.enableTimer && (
                        <div className="qc-paused-banner">
                            <div className="qc-paused-box">
                                <span className="qc-paused-title">⏸️ Quiz Paused</span>
                                <p>Timer is stopped. Take a breather and resume when you're ready.</p>
                                <button
                                    type="button"
                                    className="qc-btn qc-btn-primary qc-resume-btn"
                                    onClick={handleToggleTimer}
                                >
                                    <Play size={16} /> Resume Quiz
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Question Card (Left / Center) */}
                    <main className="qc-question-column">
                        <QuestionCard
                            question={currentQuestion}
                            totalQuestions={activeQuestions.length}
                            currentResponse={currentResponse}
                            onSelectOption={handleSelectOption}
                            onTextAnswerChange={handleTextAnswerChange}
                            onToggleMarkForReview={handleToggleMarkForReview}
                            onClearAnswer={handleClearAnswer}
                            onPrevious={handlePrevious}
                            onNext={handleNext}
                            canPrevious={currentIndex > 0}
                            canNext={currentIndex < activeQuestions.length - 1}
                            isLastQuestion={currentIndex === activeQuestions.length - 1}
                            onSubmitQuiz={handleSubmitClick}
                        />
                    </main>

                    {/* Right Sidebar: Status & Question Palette */}
                    <aside className="qc-sidebar-column">
                        <QuestionPalette
                            questions={activeQuestions}
                            currentIndex={currentIndex}
                            userResponses={userResponses}
                            onSelectQuestion={handleJumpToQuestion}
                        />
                    </aside>
                </div>
            )}

            {/* Results Phase */}
            {phase === "results" && finalStats && (
                <div className="qc-results-layout">
                    <ResultView
                        stats={finalStats}
                        questions={activeQuestions}
                        userResponses={userResponses}
                        quizTitle={quizTitle}
                        thresholdPercentage={settings.thresholdPercentage}
                        initialAttempt={initialAttempt}
                        isRecursiveIteration={isRecursiveIteration}
                        onRetakeQuiz={handleRetakeQuiz}
                        onStartRecursiveRetest={handleStartRecursiveTest}
                        onClose={onCloseModal}
                        onExportAsNote={onExportAsNote}
                    />
                </div>
            )}

            {/* Submit Confirmation Modal */}
            {showSubmitConfirm && (
                <div className="qc-modal-overlay">
                    <div className="qc-confirm-dialog">
                        <h3 className="qc-confirm-title">Submit Quiz?</h3>
                        <p className="qc-confirm-desc">
                            Are you sure you want to finish the quiz? Here is your current status:
                        </p>

                        <div className="qc-confirm-stats">
                            <div className="qc-cstat">
                                <CheckCircle2 size={16} className="qc-icon-green" />
                                <span>Answered: <strong>{answeredCount}</strong></span>
                            </div>
                            <div className="qc-cstat">
                                <AlertCircle size={16} className="qc-icon-gray" />
                                <span>Unanswered: <strong>{unansweredCount}</strong></span>
                            </div>
                            {reviewCount > 0 && (
                                <div className="qc-cstat">
                                    <Bookmark size={16} className="qc-icon-purple" />
                                    <span>Marked for Review: <strong>{reviewCount}</strong></span>
                                </div>
                            )}
                            {guessedCount > 0 && (
                                <div className="qc-cstat">
                                    <Lightbulb size={16} className="qc-icon-amber" />
                                    <span>Guessed: <strong>{guessedCount}</strong></span>
                                </div>
                            )}
                        </div>

                        {unansweredCount > 0 && (
                            <div className="qc-confirm-warning">
                                ⚠️ You have {unansweredCount} unanswered questions left.
                            </div>
                        )}

                        <div className="qc-confirm-actions">
                            <button
                                type="button"
                                className="qc-btn qc-btn-ghost"
                                onClick={() => setShowSubmitConfirm(false)}
                            >
                                Keep Reviewing
                            </button>
                            <button
                                type="button"
                                className="qc-btn qc-btn-primary"
                                onClick={handleFinalSubmit}
                            >
                                Yes, Submit Quiz
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
