import React from "react";
import { Play, Pause, Send, Timer, CheckCircle2, Bookmark, X, RotateCcw, BarChart3 } from "lucide-react";
import { QuizQuestion, UserResponse } from "../types";

interface QuizHeaderProps {
    title: string;
    currentIndex: number;
    totalQuestions: number;
    timeLeft: number;
    totalTime: number;
    isTimerRunning: boolean;
    isTimerEnabled: boolean;
    warningTimeSeconds: number;
    onToggleTimer: () => void;
    onSubmitQuiz: () => void;
    onClose?: () => void;
    userResponses: Record<string, UserResponse>;
    questions: QuizQuestion[];
    phase: "taking" | "results";
    isRecursive?: boolean;
}

export const QuizHeader: React.FC<QuizHeaderProps> = ({
    title,
    currentIndex,
    totalQuestions,
    timeLeft,
    totalTime,
    isTimerRunning,
    isTimerEnabled,
    warningTimeSeconds,
    onToggleTimer,
    onSubmitQuiz,
    onClose,
    userResponses,
    questions,
    phase,
    isRecursive = false,
}) => {
    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    };

    const isLowTime = isTimerEnabled && timeLeft <= warningTimeSeconds && timeLeft > 0;
    const isTimesUp = isTimerEnabled && timeLeft === 0;

    // Calculate quick counts for tooltip / status
    const answeredCount = Object.values(userResponses).filter((r) => r.isAnswered).length;
    const reviewCount = Object.values(userResponses).filter((r) => r.isMarkedForReview).length;

    return (
        <header className="qc-quiz-header">
            <div className="qc-header-left">
                <div className="qc-badge qc-title-badge">
                    <span className="qc-badge-icon">📝</span>
                    <span className="qc-quiz-title" title={title}>
                        {title || "Quiz Collector"}
                    </span>
                </div>

                {isRecursive && (
                    <div className="qc-recursive-header-chip" title="Retesting only previously wrong questions">
                        <RotateCcw size={13} />
                        <span>Recursive Retest</span>
                    </div>
                )}

                {phase === "taking" ? (
                    <div className="qc-question-progress-chip">
                        <span className="qc-progress-curr">Question {currentIndex + 1}</span>
                        <span className="qc-progress-sep">/</span>
                        <span className="qc-progress-total">{totalQuestions}</span>
                    </div>
                ) : (
                    <div className="qc-question-progress-chip qc-analysis-chip">
                        <BarChart3 size={13} />
                        <span>Analysis</span>
                    </div>
                )}
            </div>

            {/* Center section */}
            <div className="qc-header-center">
                {phase === "taking" ? (
                    isTimerEnabled ? (
                        <div
                            className={`qc-timer-widget ${isLowTime ? "qc-timer-warning" : ""} ${
                                isTimesUp ? "qc-timer-expired" : ""
                            } ${!isTimerRunning ? "qc-timer-paused" : ""}`}
                        >
                            <button
                                type="button"
                                className="qc-timer-btn"
                                onClick={onToggleTimer}
                                title={isTimerRunning ? "Pause Timer (Space)" : "Resume Timer (Space)"}
                            >
                                {isTimerRunning ? <Pause size={16} /> : <Play size={16} />}
                            </button>
                            <div className="qc-timer-display">
                                <Timer size={16} className="qc-timer-icon" />
                                <span className="qc-timer-digits">{formatTime(timeLeft)}</span>
                            </div>
                            {!isTimerRunning && <span className="qc-paused-pill">PAUSED</span>}
                        </div>
                    ) : (
                        <div className="qc-timer-widget qc-timer-untimed">
                            <Timer size={16} className="qc-timer-icon" />
                            <span>Untimed Mode</span>
                        </div>
                    )
                ) : (
                    <div className="qc-analysis-mode-pill">
                        <span>📊 Performance Breakdown</span>
                    </div>
                )}
            </div>

            <div className="qc-header-right">
                {phase === "taking" && (
                    <div className="qc-quick-stats">
                        <span className="qc-quick-stat" title="Answered questions">
                            <CheckCircle2 size={14} className="qc-stat-icon-green" />
                            {answeredCount}/{totalQuestions}
                        </span>
                        {reviewCount > 0 && (
                            <span className="qc-quick-stat" title="Marked for review">
                                <Bookmark size={14} className="qc-stat-icon-purple" />
                                {reviewCount}
                            </span>
                        )}
                    </div>
                )}

                {phase === "taking" ? (
                    <button
                        type="button"
                        className="qc-btn qc-btn-primary qc-submit-btn"
                        onClick={onSubmitQuiz}
                    >
                        <Send size={15} />
                        <span>Submit</span>
                    </button>
                ) : (
                    <button
                        type="button"
                        className="qc-btn qc-btn-primary qc-close-btn"
                        onClick={onClose || onSubmitQuiz}
                        title="Close Quiz Modal"
                    >
                        <X size={15} />
                        <span>Close</span>
                    </button>
                )}
            </div>
        </header>
    );
};

