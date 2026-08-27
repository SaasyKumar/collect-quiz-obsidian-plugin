import React, { useState } from "react";
import { CheckCircle2, Circle, Bookmark, Lightbulb, Filter } from "lucide-react";
import { QuizQuestion, UserResponse, QuestionFilter } from "../types";

interface QuestionPaletteProps {
    questions: QuizQuestion[];
    currentIndex: number;
    userResponses: Record<string, UserResponse>;
    onSelectQuestion: (index: number) => void;
}

export const QuestionPalette: React.FC<QuestionPaletteProps> = ({
    questions,
    currentIndex,
    userResponses,
    onSelectQuestion,
}) => {
    const [filter, setFilter] = useState<QuestionFilter>("all");

    // Calculate status counts
    let answeredCount = 0;
    let notAnsweredCount = 0;
    let reviewCount = 0;
    let guessedCount = 0;

    questions.forEach((q) => {
        const resp = userResponses[q.id];
        const isAns = resp?.isAnswered;
        const isRev = resp?.isMarkedForReview;
        const isGsd = resp?.isGuessed;

        if (isAns) answeredCount++;
        else notAnsweredCount++;

        if (isRev) reviewCount++;
        if (isGsd) guessedCount++;
    });

    const getQuestionStatus = (q: QuizQuestion) => {
        const resp = userResponses[q.id];
        const isAns = resp?.isAnswered;
        const isRev = resp?.isMarkedForReview;
        const isGsd = resp?.isGuessed;

        return { isAns, isRev, isGsd };
    };

    const filteredQuestions = questions.filter((q) => {
        const { isAns, isRev, isGsd } = getQuestionStatus(q);
        switch (filter) {
            case "answered":
                return isAns;
            case "unanswered":
                return !isAns;
            case "review":
                return isRev;
            case "guessed":
                return isGsd;
            case "all":
            default:
                return true;
        }
    });

    return (
        <aside className="qc-sidebar-palette">
            <div className="qc-palette-header">
                <h3 className="qc-palette-title">Question Status</h3>
                <span className="qc-palette-total-pill">{questions.length} Questions</span>
            </div>

            {/* Status Legend Cards */}
            <div className="qc-legend-grid">
                <div
                    className={`qc-legend-item qc-legend-answered ${filter === "answered" ? "qc-legend-active" : ""}`}
                    onClick={() => setFilter(filter === "answered" ? "all" : "answered")}
                    role="button"
                    tabIndex={0}
                >
                    <div className="qc-legend-left">
                        <span className="qc-dot qc-dot-answered" />
                        <span className="qc-legend-label">Answered</span>
                    </div>
                    <span className="qc-legend-count">{answeredCount}</span>
                </div>

                <div
                    className={`qc-legend-item qc-legend-unanswered ${filter === "unanswered" ? "qc-legend-active" : ""}`}
                    onClick={() => setFilter(filter === "unanswered" ? "all" : "unanswered")}
                    role="button"
                    tabIndex={0}
                >
                    <div className="qc-legend-left">
                        <span className="qc-dot qc-dot-unanswered" />
                        <span className="qc-legend-label">Not Answered</span>
                    </div>
                    <span className="qc-legend-count">{notAnsweredCount}</span>
                </div>

                <div
                    className={`qc-legend-item qc-legend-review ${filter === "review" ? "qc-legend-active" : ""}`}
                    onClick={() => setFilter(filter === "review" ? "all" : "review")}
                    role="button"
                    tabIndex={0}
                >
                    <div className="qc-legend-left">
                        <Bookmark size={13} className="qc-legend-icon-purple" />
                        <span className="qc-legend-label">For Review</span>
                    </div>
                    <span className="qc-legend-count">{reviewCount}</span>
                </div>

                <div
                    className={`qc-legend-item qc-legend-guessed ${filter === "guessed" ? "qc-legend-active" : ""}`}
                    onClick={() => setFilter(filter === "guessed" ? "all" : "guessed")}
                    role="button"
                    tabIndex={0}
                >
                    <div className="qc-legend-left">
                        <Lightbulb size={13} className="qc-legend-icon-amber" />
                        <span className="qc-legend-label">Guessed</span>
                    </div>
                    <span className="qc-legend-count">{guessedCount}</span>
                </div>
            </div>

            {/* Filter Pills */}
            <div className="qc-filter-tabs">
                <button
                    type="button"
                    className={`qc-filter-tab ${filter === "all" ? "qc-filter-active" : ""}`}
                    onClick={() => setFilter("all")}
                >
                    All
                </button>
                <button
                    type="button"
                    className={`qc-filter-tab ${filter === "answered" ? "qc-filter-active" : ""}`}
                    onClick={() => setFilter("answered")}
                >
                    Answered
                </button>
                <button
                    type="button"
                    className={`qc-filter-tab ${filter === "unanswered" ? "qc-filter-active" : ""}`}
                    onClick={() => setFilter("unanswered")}
                >
                    Unanswered
                </button>
                <button
                    type="button"
                    className={`qc-filter-tab ${filter === "review" ? "qc-filter-active" : ""}`}
                    onClick={() => setFilter("review")}
                >
                    Review
                </button>
                <button
                    type="button"
                    className={`qc-filter-tab ${filter === "guessed" ? "qc-filter-active" : ""}`}
                    onClick={() => setFilter("guessed")}
                >
                    Guessed
                </button>
            </div>

            {/* Questions Number Grid */}
            <div className="qc-palette-grid">
                {filteredQuestions.map((q) => {
                    const isCurrent = q.index === currentIndex;
                    const { isAns, isRev, isGsd } = getQuestionStatus(q);

                    let statusClass = "qc-tile-unanswered";
                    if (isRev && isAns) {
                        statusClass = "qc-tile-review-answered";
                    } else if (isRev) {
                        statusClass = "qc-tile-review";
                    } else if (isGsd) {
                        statusClass = "qc-tile-guessed";
                    } else if (isAns) {
                        statusClass = "qc-tile-answered";
                    }

                    return (
                        <button
                            key={q.id}
                            type="button"
                            className={`qc-palette-tile ${statusClass} ${isCurrent ? "qc-tile-current" : ""}`}
                            onClick={() => onSelectQuestion(q.index)}
                            title={`Question ${q.index + 1}: ${
                                isAns ? "Answered" : "Not Answered"
                            }${isRev ? ", Marked for Review" : ""}${isGsd ? ", Guessed" : ""}`}
                        >
                            <span className="qc-tile-num">{q.index + 1}</span>

                            {/* Mini indicators */}
                            <div className="qc-tile-indicators">
                                {isGsd && <Lightbulb size={9} className="qc-mini-bulb" />}
                                {isRev && <Bookmark size={9} className="qc-mini-bookmark" />}
                            </div>
                        </button>
                    );
                })}
            </div>
        </aside>
    );
};
