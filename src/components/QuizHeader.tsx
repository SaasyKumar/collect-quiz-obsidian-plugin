import React from "react";
import { Play, Pause, Send, Timer, HelpCircle, CheckCircle2, Bookmark } from "lucide-react";
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
    userResponses: Record<string, UserResponse>;
    questions: QuizQuestion[];
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
    userResponses,
    questions,
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

    // Progress percentage
    const progressPercent = totalQuestions > 0 ? Math.round(((currentIndex + 1) / totalQuestions) * 100) : 0;

    return (
        <header className="qc-quiz-header">
            <div className="qc-header-left">
                <div className="qc-badge qc-title-badge">
                    <span className="qc-badge-icon">📝</span>
                    <span className="qc-quiz-title" title={title}>
                        {title || "Quiz Collector"}
                    </span>
                </div>
                <div className="qc-question-progress-chip">
                    <span className="qc-progress-curr">Question {currentIndex + 1}</span>
                    <span className="qc-progress-sep">/</span>
                    <span className="qc-progress-total">{totalQuestions}</span>
                </div>
            </div>

            {/* Timer section */}
            <div className="qc-header-center">
                {isTimerEnabled ? (
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
                )}
            </div>

            <div className="qc-header-right">
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

                <button
                    type="button"
                    className="qc-btn qc-btn-primary qc-submit-btn"
                    onClick={onSubmitQuiz}
                >
                    <Send size={15} />
                    <span>Submit</span>
                </button>
            </div>
        </header>
    );
};
