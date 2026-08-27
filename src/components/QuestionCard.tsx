import React from "react";
import { Lightbulb, Bookmark, ArrowLeft, ArrowRight, RotateCcw, BookOpen, Check } from "lucide-react";
import { QuizQuestion, UserResponse } from "../types";

interface QuestionCardProps {
    question: QuizQuestion;
    totalQuestions: number;
    currentResponse?: UserResponse;
    onSelectOption: (optionKey: string, isGuessed: boolean) => void;
    onTextAnswerChange: (text: string, isGuessed?: boolean) => void;
    onToggleMarkForReview: () => void;
    onClearAnswer: () => void;
    onPrevious: () => void;
    onNext: () => void;
    canPrevious: boolean;
    canNext: boolean;
    isLastQuestion: boolean;
    onSubmitQuiz: () => void;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({
    question,
    totalQuestions,
    currentResponse,
    onSelectOption,
    onTextAnswerChange,
    onToggleMarkForReview,
    onClearAnswer,
    onPrevious,
    onNext,
    canPrevious,
    canNext,
    isLastQuestion,
    onSubmitQuiz,
}) => {
    const isMSQ = question.type === "MSQ";
    const selectedKeys = currentResponse?.selectedKeys || [];
    const isGuessed = !isMSQ && (currentResponse?.isGuessed || false);
    const isMarkedForReview = currentResponse?.isMarkedForReview || false;
    const textAnswer = currentResponse?.textAnswer || "";

    const handleOptionClick = (key: string) => {
        // MSQ has no guess mechanism; MCQ retains current guess flag
        onSelectOption(key, isMSQ ? false : isGuessed);
    };

    const handleBulbClick = (e: React.MouseEvent, key: string) => {
        e.stopPropagation(); // Only trigger bulb guess behavior on single-choice MCQ
        if (isMSQ) return;

        if (selectedKeys.includes(key) && isGuessed) {
            // Un-guess (keep selected, but remove guess flag)
            onSelectOption(key, false);
        } else {
            // Select and flag as guessed
            onSelectOption(key, true);
        }
    };

    const renderQuestionTypeBadge = () => {
        switch (question.type) {
            case "MSQ":
                return (
                    <span className="qc-type-pill qc-type-msq" title="Multiple options can be correct. Select all that apply.">
                        ☑️ Multiple Select (MSQ)
                    </span>
                );
            case "TITA":
                return (
                    <span className="qc-type-pill qc-type-tita" title="Direct numerical or text answer. No options.">
                        ⌨️ Type In The Answer (TITA)
                    </span>
                );
            case "MCQ":
            default:
                return (
                    <span className="qc-type-pill qc-type-mcq" title="Only one single option is correct.">
                        🔘 Single Choice (MCQ)
                    </span>
                );
        }
    };

    return (
        <div className="qc-question-card-container">
            {/* Passage if Reading Comprehension / QuestionSet */}
            {question.passage && (
                <div className="qc-passage-panel">
                    <div className="qc-passage-header">
                        <BookOpen size={16} />
                        <span>Reference Context / Passage</span>
                    </div>
                    <div className="qc-passage-body">{question.passage}</div>
                </div>
            )}

            <div className="qc-question-main-card">
                {/* Question Header */}
                <div className="qc-card-top-bar">
                    <div className="qc-card-meta">
                        <span className="qc-q-index-pill">Q{question.index + 1}</span>
                        {renderQuestionTypeBadge()}
                        {!isMSQ && isGuessed && (
                            <span className="qc-status-pill qc-pill-guessed" title="Marked as Guessed">
                                <Lightbulb size={12} /> Guessed
                            </span>
                        )}
                        {isMarkedForReview && (
                            <span className="qc-status-pill qc-pill-review" title="Marked for Review">
                                <Bookmark size={12} /> For Review
                            </span>
                        )}
                    </div>

                    <button
                        type="button"
                        className={`qc-btn qc-btn-ghost qc-review-toggle ${
                            isMarkedForReview ? "qc-review-active" : ""
                        }`}
                        onClick={onToggleMarkForReview}
                        title="Mark / Unmark this question for review (M)"
                    >
                        <Bookmark size={16} />
                        <span>{isMarkedForReview ? "Marked for Review" : "Mark for Review"}</span>
                    </button>
                </div>

                {/* Question Statement */}
                <div className="qc-question-text">{question.question}</div>

                {/* Options List for MCQ & MSQ */}
                {question.type !== "TITA" && question.options && question.options.length > 0 ? (
                    <div className="qc-options-list" role="group" aria-label="Question Options">
                        {question.options.map((opt) => {
                            const isSelected = selectedKeys.includes(opt.key);
                            const isOptionGuessed = !isMSQ && isSelected && isGuessed;

                            return (
                                <div
                                    key={opt.key}
                                    className={`qc-option-row ${isMSQ ? "qc-option-msq-row" : ""} ${
                                        isSelected ? "qc-option-selected" : ""
                                    } ${isOptionGuessed ? "qc-option-guessed" : ""}`}
                                    onClick={() => handleOptionClick(opt.key)}
                                >
                                    {/* Bulb mark only on MCQ questions */}
                                    {!isMSQ && (
                                        <button
                                            type="button"
                                            className={`qc-bulb-btn ${isOptionGuessed ? "qc-bulb-active" : ""}`}
                                            onClick={(e) => handleBulbClick(e, opt.key)}
                                            title={
                                                isOptionGuessed
                                                    ? "Click to remove Guess flag"
                                                    : "Click bulb to select as a GUESS"
                                            }
                                            aria-label={`Mark option ${opt.key} as guessed`}
                                        >
                                            <Lightbulb size={16} />
                                        </button>
                                    )}

                                    {/* Checkbox Box for MSQ */}
                                    {isMSQ && (
                                        <div
                                            className={`qc-option-checkbox ${
                                                isSelected ? "qc-checkbox-checked" : ""
                                            }`}
                                        >
                                            {isSelected && <Check size={13} />}
                                        </div>
                                    )}

                                    {/* Option Key Badge */}
                                    <div className="qc-option-key-badge">{opt.key}</div>

                                    {/* Option Value Text */}
                                    <div className="qc-option-text">{opt.value}</div>
                                </div>
                            );
                        })}
                    </div>
                ) : null}

                {/* TITA input */}
                {question.type === "TITA" && (
                    <div className="qc-tita-container">
                        <label className="qc-tita-label">Enter your answer below:</label>
                        <div className="qc-tita-input-wrapper">
                            <input
                                type="text"
                                className="qc-tita-input"
                                placeholder="Type your answer here..."
                                value={textAnswer}
                                onChange={(e) => onTextAnswerChange(e.target.value, isGuessed)}
                            />
                            <button
                                type="button"
                                className={`qc-btn qc-btn-ghost qc-tita-guess-btn ${
                                    isGuessed ? "qc-bulb-active" : ""
                                }`}
                                onClick={() => onTextAnswerChange(textAnswer, !isGuessed)}
                                title="Toggle guess mark for this answer"
                            >
                                <Lightbulb size={16} />
                                <span>{isGuessed ? "Guessed" : "Guess"}</span>
                            </button>
                        </div>
                    </div>
                )}

                {/* Bottom Navigation and actions */}
                <div className="qc-card-bottom-actions">
                    <div className="qc-actions-left">
                        <button
                            type="button"
                            className="qc-btn qc-btn-ghost qc-clear-btn"
                            onClick={onClearAnswer}
                            disabled={!currentResponse?.isAnswered && !isMarkedForReview}
                            title="Clear answer for this question"
                        >
                            <RotateCcw size={15} />
                            <span>Clear Answer</span>
                        </button>
                    </div>

                    <div className="qc-actions-right">
                        <button
                            type="button"
                            className="qc-btn qc-btn-secondary"
                            onClick={onPrevious}
                            disabled={!canPrevious}
                            title="Previous question (Left Arrow)"
                        >
                            <ArrowLeft size={16} />
                            <span>Previous</span>
                        </button>

                        {isLastQuestion ? (
                            <button
                                type="button"
                                className="qc-btn qc-btn-primary"
                                onClick={onSubmitQuiz}
                            >
                                <span>Submit Quiz</span>
                            </button>
                        ) : (
                            <button
                                type="button"
                                className="qc-btn qc-btn-primary"
                                onClick={onNext}
                                disabled={!canNext}
                                title="Next question (Right Arrow)"
                            >
                                <span>Next</span>
                                <ArrowRight size={16} />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
