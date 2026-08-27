import React, { useState } from "react";
import {
    Trophy,
    CheckCircle2,
    XCircle,
    Lightbulb,
    HelpCircle,
    RotateCcw,
    FileText,
    X,
    Filter,
    Clock,
    ChevronDown,
    ChevronUp,
    BookOpen,
    Check,
} from "lucide-react";
import { QuizQuestion, UserResponse, QuizResultStats } from "../types";
import { checkIsCorrect, getCorrectAnswerKeys } from "../utils/scorer";

interface ResultViewProps {
    stats: QuizResultStats;
    questions: QuizQuestion[];
    userResponses: Record<string, UserResponse>;
    quizTitle: string;
    onRetakeQuiz: () => void;
    onClose: () => void;
    onExportAsNote: (markdownSummary: string) => void;
}

type ReviewFilter = "all" | "correct" | "incorrect" | "guessed" | "unattempted";

export const ResultView: React.FC<ResultViewProps> = ({
    stats,
    questions,
    userResponses,
    quizTitle,
    onRetakeQuiz,
    onClose,
    onExportAsNote,
}) => {
    const [reviewFilter, setReviewFilter] = useState<ReviewFilter>("all");
    const [expandedQuestionIds, setExpandedQuestionIds] = useState<Record<string, boolean>>({});

    const toggleExpand = (qId: string) => {
        setExpandedQuestionIds((prev) => ({
            ...prev,
            [qId]: !prev[qId],
        }));
    };

    const formatSeconds = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}m ${secs}s`;
    };

    const generateMarkdownReport = (): string => {
        const dateStr = new Date().toLocaleString();
        let md = `# Quiz Results: ${quizTitle || "Untitled Quiz"}\n\n`;
        md += `**Date:** ${dateStr}  \n`;
        md += `**Score:** ${stats.score} / ${stats.total} (${stats.accuracyPercentage}%)  \n`;
        md += `**Time Spent:** ${formatSeconds(stats.timeSpentSeconds)}\n\n`;
        md += `## Performance Summary\n\n`;
        md += `| Metric | Count |\n`;
        md += `| --- | --- |\n`;
        md += `| **Attempted** | ${stats.attempted} |\n`;
        md += `| **Right** | ${stats.right} |\n`;
        md += `| **Guessed Right** | ${stats.guessedRight} |\n`;
        md += `| **Wrong** | ${stats.wrong} |\n`;
        md += `| **Guessed Wrong** | ${stats.guessedWrong} |\n`;
        md += `| **Unattempted** | ${stats.unattempted} |\n\n`;
        md += `## Detailed Question Review\n\n`;

        questions.forEach((q, idx) => {
            const resp = userResponses[q.id];
            const isAns = resp?.isAnswered;
            const isCorrect = checkIsCorrect(q, resp);
            const isGuessed = resp?.isGuessed;
            const correctKeys = getCorrectAnswerKeys(q.answer);

            md += `### ${idx + 1}. ${q.question}\n\n`;
            if (q.passage) {
                md += `> **Passage Context:** ${q.passage}\n\n`;
            }

            if (q.options && q.options.length > 0) {
                q.options.forEach((opt) => {
                    const isSelected = resp?.selectedKeys?.includes(opt.key);
                    const isTarget = correctKeys.includes(opt.key);
                    let prefix = "- [ ]";
                    let marker = "";

                    if (isTarget && isSelected) {
                        prefix = "- [x]";
                        marker = " ✅ *(Your Correct Answer)*";
                    } else if (isSelected) {
                        prefix = "- [x]";
                        marker = " ❌ *(Your Choice)*";
                    } else if (isTarget) {
                        prefix = "- [ ]";
                        marker = " 🎯 *(Correct Answer)*";
                    }

                    if (isSelected && isGuessed) {
                        marker += " 💡 *(Guessed)*";
                    }

                    md += `${prefix} **${opt.key}.** ${opt.value}${marker}\n`;
                });
            } else if (q.type === "TITA") {
                md += `- **Your Answer:** ${resp?.textAnswer || "*(None)*"}${
                    isGuessed ? " 💡 *(Guessed)*" : ""
                }\n`;
                md += `- **Correct Answer:** ${Array.isArray(q.answer) ? q.answer.join(", ") : q.answer}\n`;
            }

            md += `\n**Status:** ${
                !isAns ? "⚪ Unattempted" : isCorrect ? "✅ Correct" : "❌ Incorrect"
            }${isGuessed ? " (💡 Guessed)" : ""}\n`;

            if (q.explanation) {
                md += `\n> **Explanation:** ${q.explanation}\n`;
            }
            md += `\n---\n\n`;
        });

        return md;
    };

    const handleExport = () => {
        const md = generateMarkdownReport();
        onExportAsNote(md);
    };

    const filteredQuestions = questions.filter((q) => {
        const resp = userResponses[q.id];
        const isAns = resp?.isAnswered;
        const isCorrect = checkIsCorrect(q, resp);
        const isGuessed = resp?.isGuessed;

        switch (reviewFilter) {
            case "correct":
                return isAns && isCorrect;
            case "incorrect":
                return isAns && !isCorrect;
            case "guessed":
                return isAns && isGuessed;
            case "unattempted":
                return !isAns;
            case "all":
            default:
                return true;
        }
    });

    return (
        <div className="qc-result-container">
            {/* Top Score Banner */}
            <div className="qc-result-hero">
                <div className="qc-hero-left">
                    <div className="qc-trophy-circle">
                        <Trophy size={36} className="qc-trophy-icon" />
                    </div>
                    <div className="qc-hero-meta">
                        <h2 className="qc-result-title">Quiz Completed!</h2>
                        <p className="qc-result-subtitle">{quizTitle || "Knowledge Check"}</p>
                    </div>
                </div>

                <div className="qc-hero-score-badge">
                    <div className="qc-score-big">
                        <span className="qc-score-num">{stats.score}</span>
                        <span className="qc-score-denom">/{stats.total}</span>
                    </div>
                    <div className="qc-score-percent">{stats.accuracyPercentage}% Accuracy</div>
                </div>

                <div className="qc-hero-time">
                    <Clock size={16} />
                    <span>Time Spent: {formatSeconds(stats.timeSpentSeconds)}</span>
                </div>
            </div>

            {/* Core Metrics Grid required by user */}
            <div className="qc-metrics-grid">
                {/* 1. Attempted */}
                <div className="qc-metric-card qc-metric-attempted">
                    <div className="qc-metric-header">
                        <span className="qc-metric-title">Attempted</span>
                        <HelpCircle size={16} className="qc-metric-icon" />
                    </div>
                    <div className="qc-metric-val">{stats.attempted}</div>
                    <div className="qc-metric-sub">{stats.unattempted} Unattempted</div>
                </div>

                {/* 2. Right */}
                <div className="qc-metric-card qc-metric-right">
                    <div className="qc-metric-header">
                        <span className="qc-metric-title">Right</span>
                        <CheckCircle2 size={16} className="qc-metric-icon qc-icon-green" />
                    </div>
                    <div className="qc-metric-val qc-val-green">{stats.right}</div>
                    <div className="qc-metric-sub">{stats.accuracyPercentage}% of attempted</div>
                </div>

                {/* 3. Guessed Right */}
                <div className="qc-metric-card qc-metric-guessed-right">
                    <div className="qc-metric-header">
                        <span className="qc-metric-title">Guessed Right</span>
                        <Lightbulb size={16} className="qc-metric-icon qc-icon-amber" />
                    </div>
                    <div className="qc-metric-val qc-val-amber">{stats.guessedRight}</div>
                    <div className="qc-metric-sub">Lucky guesses</div>
                </div>

                {/* 4. Wrong */}
                <div className="qc-metric-card qc-metric-wrong">
                    <div className="qc-metric-header">
                        <span className="qc-metric-title">Wrong</span>
                        <XCircle size={16} className="qc-metric-icon qc-icon-red" />
                    </div>
                    <div className="qc-metric-val qc-val-red">{stats.wrong}</div>
                    <div className="qc-metric-sub">Review suggested</div>
                </div>

                {/* 5. Guessed Wrong */}
                <div className="qc-metric-card qc-metric-guessed-wrong">
                    <div className="qc-metric-header">
                        <span className="qc-metric-title">Guessed Wrong</span>
                        <Lightbulb size={16} className="qc-metric-icon qc-icon-orange" />
                    </div>
                    <div className="qc-metric-val qc-val-orange">{stats.guessedWrong}</div>
                    <div className="qc-metric-sub">Unlucky guesses</div>
                </div>
            </div>

            {/* Action Bar */}
            <div className="qc-result-actions-bar">
                <div className="qc-result-tabs">
                    <button
                        type="button"
                        className={`qc-rtab ${reviewFilter === "all" ? "qc-rtab-active" : ""}`}
                        onClick={() => setReviewFilter("all")}
                    >
                        All ({questions.length})
                    </button>
                    <button
                        type="button"
                        className={`qc-rtab ${reviewFilter === "correct" ? "qc-rtab-active" : ""}`}
                        onClick={() => setReviewFilter("correct")}
                    >
                        Correct ({stats.right})
                    </button>
                    <button
                        type="button"
                        className={`qc-rtab ${reviewFilter === "incorrect" ? "qc-rtab-active" : ""}`}
                        onClick={() => setReviewFilter("incorrect")}
                    >
                        Incorrect ({stats.wrong})
                    </button>
                    <button
                        type="button"
                        className={`qc-rtab ${reviewFilter === "guessed" ? "qc-rtab-active" : ""}`}
                        onClick={() => setReviewFilter("guessed")}
                    >
                        Guessed ({stats.guessedRight + stats.guessedWrong})
                    </button>
                    <button
                        type="button"
                        className={`qc-rtab ${reviewFilter === "unattempted" ? "qc-rtab-active" : ""}`}
                        onClick={() => setReviewFilter("unattempted")}
                    >
                        Unattempted ({stats.unattempted})
                    </button>
                </div>

                <div className="qc-result-btn-group">
                    <button
                        type="button"
                        className="qc-btn qc-btn-secondary"
                        onClick={handleExport}
                        title="Export results summary as a markdown note"
                    >
                        <FileText size={15} />
                        <span>Export Note</span>
                    </button>
                    <button
                        type="button"
                        className="qc-btn qc-btn-secondary"
                        onClick={onRetakeQuiz}
                        title="Retake this quiz"
                    >
                        <RotateCcw size={15} />
                        <span>Retake</span>
                    </button>
                    <button
                        type="button"
                        className="qc-btn qc-btn-primary"
                        onClick={onClose}
                    >
                        <X size={15} />
                        <span>Done</span>
                    </button>
                </div>
            </div>

            {/* Detailed Question Review List */}
            <div className="qc-review-list">
                {filteredQuestions.map((q) => {
                    const resp = userResponses[q.id];
                    const isAns = resp?.isAnswered;
                    const isCorrect = checkIsCorrect(q, resp);
                    const isGuessed = resp?.isGuessed;
                    const correctKeys = getCorrectAnswerKeys(q.answer);
                    const isExpanded = expandedQuestionIds[q.id] !== false; // expanded by default

                    let cardStatusClass = "qc-review-card-unattempted";
                    if (isAns && isCorrect) {
                        cardStatusClass = isGuessed
                            ? "qc-review-card-guessed-right"
                            : "qc-review-card-right";
                    } else if (isAns && !isCorrect) {
                        cardStatusClass = isGuessed
                            ? "qc-review-card-guessed-wrong"
                            : "qc-review-card-wrong";
                    }

                    return (
                        <div key={q.id} className={`qc-review-card ${cardStatusClass}`}>
                            <div
                                className="qc-review-card-header"
                                onClick={() => toggleExpand(q.id)}
                            >
                                <div className="qc-review-header-left">
                                    <span className="qc-q-index-pill">Q{q.index + 1}</span>

                                    {/* Outcome Badge */}
                                    {!isAns ? (
                                        <span className="qc-outcome-pill qc-outcome-unattempted">
                                            Unattempted
                                        </span>
                                    ) : isCorrect ? (
                                        <span className="qc-outcome-pill qc-outcome-correct">
                                            <CheckCircle2 size={13} />
                                            {isGuessed ? "Guessed Right" : "Correct"}
                                        </span>
                                    ) : (
                                        <span className="qc-outcome-pill qc-outcome-incorrect">
                                            <XCircle size={13} />
                                            {isGuessed ? "Guessed Wrong" : "Incorrect"}
                                        </span>
                                    )}

                                    {isGuessed && (
                                        <span className="qc-status-pill qc-pill-guessed">
                                            <Lightbulb size={11} /> Guessed
                                        </span>
                                    )}
                                </div>

                                <div className="qc-review-header-right">
                                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                </div>
                            </div>

                            {isExpanded && (
                                <div className="qc-review-card-body">
                                    {/* Context passage if present */}
                                    {q.passage && (
                                        <div className="qc-passage-panel qc-passage-review">
                                            <div className="qc-passage-header">
                                                <BookOpen size={14} />
                                                <span>Context / Passage</span>
                                            </div>
                                            <div className="qc-passage-body">{q.passage}</div>
                                        </div>
                                    )}

                                    <div className="qc-review-q-text">{q.question}</div>

                                    {/* Options breakdown */}
                                    {q.type !== "TITA" && q.options && q.options.length > 0 ? (
                                        <div className="qc-review-options-list">
                                            {q.options.map((opt) => {
                                                const isUserChoice = resp?.selectedKeys?.includes(
                                                    opt.key
                                                );
                                                const isCorrectOption = correctKeys.includes(opt.key);

                                                let optionClass = "qc-ropt-neutral";
                                                if (isCorrectOption) {
                                                    optionClass = "qc-ropt-correct";
                                                } else if (isUserChoice && !isCorrectOption) {
                                                    optionClass = "qc-ropt-incorrect";
                                                }

                                                return (
                                                    <div
                                                        key={opt.key}
                                                        className={`qc-review-option-row ${optionClass}`}
                                                    >
                                                        <div className="qc-ropt-key">{opt.key}</div>
                                                        <div className="qc-ropt-text">{opt.value}</div>
                                                        <div className="qc-ropt-tags">
                                                            {isCorrectOption && (
                                                                <span className="qc-ropt-badge qc-badge-correct">
                                                                    <Check size={12} /> Correct
                                                                </span>
                                                            )}
                                                            {isUserChoice && (
                                                                <span
                                                                    className={`qc-ropt-badge ${
                                                                        isCorrectOption
                                                                            ? "qc-badge-user-correct"
                                                                            : "qc-badge-user-wrong"
                                                                    }`}
                                                                >
                                                                    Your Choice{" "}
                                                                    {isGuessed ? "(💡 Guessed)" : ""}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="qc-review-tita-block">
                                            <div className="qc-tita-row">
                                                <span className="qc-tita-lbl">Your Answer:</span>
                                                <span className="qc-tita-val">
                                                    {resp?.textAnswer || "(No answer entered)"}
                                                    {isGuessed && " 💡 (Guessed)"}
                                                </span>
                                            </div>
                                            <div className="qc-tita-row">
                                                <span className="qc-tita-lbl">Expected Answer:</span>
                                                <span className="qc-tita-val qc-tita-expected">
                                                    {Array.isArray(q.answer)
                                                        ? q.answer.join(", ")
                                                        : q.answer}
                                                </span>
                                            </div>
                                        </div>
                                    )}

                                    {/* Explanation */}
                                    {q.explanation && (
                                        <div className="qc-explanation-box">
                                            <div className="qc-explanation-title">
                                                💡 Explanation
                                            </div>
                                            <div className="qc-explanation-text">
                                                {q.explanation}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
