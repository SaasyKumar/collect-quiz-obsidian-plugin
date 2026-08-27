import React, { useState, useEffect } from "react";
import {
    Trophy,
    CheckCircle2,
    XCircle,
    Lightbulb,
    HelpCircle,
    RotateCcw,
    FileText,
    X,
    Clock,
    ChevronDown,
    ChevronUp,
    BookOpen,
    Check,
    TrendingUp,
    Sparkles,
    AlertTriangle,
    Layers,
    Lock,
    Eye,
    Pause,
    Play,
    Calculator,
    Percent,
} from "lucide-react";
import { App } from "obsidian";
import { QuizQuestion, UserResponse, QuizResultStats, QuizAttemptRecord } from "../types";
import { checkIsCorrect, getCorrectAnswerKeys } from "../utils/scorer";
import { ExpandableExplanation } from "./ExpandableExplanation";

interface ResultViewProps {
    stats: QuizResultStats;
    questions: QuizQuestion[];
    userResponses: Record<string, UserResponse>;
    quizTitle: string;
    thresholdPercentage?: number;
    defaultCorrectMark?: number;
    defaultNegativeMark?: number;
    initialAttempt?: QuizAttemptRecord | null;
    isRecursiveIteration?: boolean;
    app?: App;
    onRetakeQuiz: () => void;
    onStartRecursiveRetest?: () => void;
    onClose: () => void;
    onExportAsNote: (markdownSummary: string) => void;
}

type ReviewFilter = "all" | "correct" | "incorrect" | "guessed" | "unattempted";

interface MarkingSchemePreset {
    id: string;
    label: string;
    correct: number;
    negative: number;
}

const MARKING_SCHEMES: MarkingSchemePreset[] = [
    { id: "1,0", label: "+1 / 0 (No Negative Penalty)", correct: 1, negative: 0 },
    { id: "1,0.25", label: "+1 / -0.25 (1/4 Negative)", correct: 1, negative: 0.25 },
    { id: "1,0.33", label: "+1 / -0.33 (1/3 Negative)", correct: 1, negative: 0.33 },
    { id: "1,0.5", label: "+1 / -0.5 (1/2 Negative)", correct: 1, negative: 0.5 },
    { id: "1,1", label: "+1 / -1 (1:1 Equal Penalty)", correct: 1, negative: 1 },
    { id: "2,0.66", label: "+2 / -0.66 (Banking / SSC)", correct: 2, negative: 0.66 },
    { id: "3,1", label: "+3 / -1 (CAT / GATE Style)", correct: 3, negative: 1 },
    { id: "4,1", label: "+4 / -1 (JEE / NEET Style)", correct: 4, negative: 1 },
    { id: "custom", label: "Custom Scheme (+X / -Y)", correct: 1, negative: 0 },
];

export const ResultView: React.FC<ResultViewProps> = ({
    stats,
    questions,
    userResponses,
    quizTitle,
    thresholdPercentage = 50,
    defaultCorrectMark = 1,
    defaultNegativeMark = 0,
    initialAttempt = null,
    isRecursiveIteration = false,
    app,
    onRetakeQuiz,
    onStartRecursiveRetest,
    onClose,
    onExportAsNote,
}) => {
    const [reviewFilter, setReviewFilter] = useState<ReviewFilter>("all");
    const [expandedQuestionIds, setExpandedQuestionIds] = useState<Record<string, boolean>>({});

    // Dynamic Marking Scheme State
    const [correctMark, setCorrectMark] = useState<number>(defaultCorrectMark ?? 1);
    const [negativeMark, setNegativeMark] = useState<number>(defaultNegativeMark ?? 0);
    const [isCustomScheme, setIsCustomScheme] = useState<boolean>(() => {
        const matchingPreset = MARKING_SCHEMES.find(
            (p) => p.id !== "custom" && p.correct === defaultCorrectMark && p.negative === defaultNegativeMark
        );
        return !matchingPreset;
    });

    const activeSchemeId = isCustomScheme
        ? "custom"
        : MARKING_SCHEMES.find((p) => p.correct === correctMark && p.negative === negativeMark)?.id || "custom";

    const handleSchemeChange = (schemeId: string) => {
        if (schemeId === "custom") {
            setIsCustomScheme(true);
        } else {
            setIsCustomScheme(false);
            const found = MARKING_SCHEMES.find((p) => p.id === schemeId);
            if (found) {
                setCorrectMark(found.correct);
                setNegativeMark(found.negative);
            }
        }
    };

    // Calculate Dynamic Marks & Accuracy
    const maxPossibleMarks = Number((stats.total * correctMark).toFixed(2));
    const grossMarks = Number((stats.right * correctMark).toFixed(2));
    const negativePenalty = Number((stats.wrong * negativeMark).toFixed(2));
    const totalMarksObtained = Number((grossMarks - negativePenalty).toFixed(2));
    const accuracyPercentage =
        stats.attempted > 0 ? Number(((stats.right / stats.attempted) * 100).toFixed(1)) : 0;
    const marksPercentage =
        maxPossibleMarks > 0 ? Number(((totalMarksObtained / maxPossibleMarks) * 100).toFixed(1)) : 0;

    // Retest recommendation check
    const isBelowThreshold = accuracyPercentage < thresholdPercentage;
    const hasMissedQuestions = stats.wrong + stats.unattempted > 0;
    const canDoRecursiveRetest =
        !isRecursiveIteration && !initialAttempt && isBelowThreshold && hasMissedQuestions && !!onStartRecursiveRetest;

    // Reveal solutions state & 10s countdown timer
    const [isRevealed, setIsRevealed] = useState<boolean>(!canDoRecursiveRetest);
    const [countdown, setCountdown] = useState<number>(10);
    const [isCountdownPaused, setIsCountdownPaused] = useState<boolean>(false);

    useEffect(() => {
        if (!canDoRecursiveRetest || isRevealed || isCountdownPaused) return;

        const timer = setInterval(() => {
            setCountdown((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    setIsRevealed(true);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [canDoRecursiveRetest, isRevealed, isCountdownPaused]);

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

    // Comparative calculations if initialAttempt is present
    const isComparative = !!initialAttempt;
    const initMaxMarks = isComparative ? Number((initialAttempt.stats.total * correctMark).toFixed(2)) : 0;
    const initGrossMarks = isComparative ? Number((initialAttempt.stats.right * correctMark).toFixed(2)) : 0;
    const initNegativePenalty = isComparative ? Number((initialAttempt.stats.wrong * negativeMark).toFixed(2)) : 0;
    const initTotalMarksObtained = isComparative
        ? Number((initGrossMarks - initNegativePenalty).toFixed(2))
        : 0;
    const initAccuracyPercentage =
        isComparative && initialAttempt.stats.attempted > 0
            ? Number(((initialAttempt.stats.right / initialAttempt.stats.attempted) * 100).toFixed(1))
            : 0;

    const accuracyDelta = isComparative ? Number((accuracyPercentage - initAccuracyPercentage).toFixed(1)) : 0;
    const marksDelta = isComparative ? Number((totalMarksObtained - initTotalMarksObtained).toFixed(2)) : 0;
    const recoveredCount = isComparative ? stats.right : 0;

    const generateMarkdownReport = (): string => {
        const dateStr = new Date().toLocaleString();
        let md = `# Quiz Results: ${quizTitle || "Untitled Quiz"}\n\n`;
        md += `**Date:** ${dateStr}  \n`;
        md += `**Marking Scheme:** +${correctMark} (Correct) / -${negativeMark} (Wrong)  \n\n`;

        if (isComparative && initialAttempt) {
            md += `## 🔄 Iterative Quiz Comparison (Initial vs. Recursive Retest)\n\n`;
            md += `| Metric | Initial Attempt | Recursive Retest | Delta |\n`;
            md += `| --- | --- | --- | --- |\n`;
            md += `| **Total Marks** | ${initTotalMarksObtained} / ${initMaxMarks} | ${totalMarksObtained} / ${maxPossibleMarks} | ${marksDelta >= 0 ? "+" : ""}${marksDelta} marks |\n`;
            md += `| **Accuracy** | ${initAccuracyPercentage}% | ${accuracyPercentage}% | ${accuracyDelta >= 0 ? "+" : ""}${accuracyDelta}% |\n`;
            md += `| **Attempted** | ${initialAttempt.stats.attempted} | ${stats.attempted} | - |\n`;
            md += `| **Right** | ${initialAttempt.stats.right} | ${stats.right} | +${recoveredCount} recovered |\n`;
            md += `| **Wrong** | ${initialAttempt.stats.wrong} | ${stats.wrong} | - |\n`;
            md += `| **Negative Penalty** | -${initNegativePenalty} | -${negativePenalty} | - |\n`;
            md += `| **Guessed Right** | ${initialAttempt.stats.guessedRight} | ${stats.guessedRight} | - |\n`;
            md += `| **Guessed Wrong** | ${initialAttempt.stats.guessedWrong} | ${stats.guessedWrong} | - |\n`;
            md += `| **Time Spent** | ${formatSeconds(initialAttempt.stats.timeSpentSeconds)} | ${formatSeconds(stats.timeSpentSeconds)} | - |\n\n`;
        } else {
            md += `**Total Marks Obtained:** ${totalMarksObtained} / ${maxPossibleMarks} (${marksPercentage}%)  \n`;
            md += `**Accuracy:** ${accuracyPercentage}%  \n`;
            md += `**Negative Marks Incurred:** -${negativePenalty}  \n`;
            md += `**Time Spent:** ${formatSeconds(stats.timeSpentSeconds)}\n\n`;
            md += `## Performance Summary\n\n`;
            md += `| Metric | Count | Marks Impact |\n`;
            md += `| --- | --- | --- |\n`;
            md += `| **Attempted** | ${stats.attempted} / ${stats.total} | - |\n`;
            md += `| **Right** | ${stats.right} | +${grossMarks} marks |\n`;
            md += `| **Wrong** | ${stats.wrong} | -${negativePenalty} marks |\n`;
            md += `| **Guessed Right** | ${stats.guessedRight} | Lucky Guesses |\n`;
            md += `| **Guessed Wrong** | ${stats.guessedWrong} | Unlucky Guesses |\n`;
            md += `| **Unattempted** | ${stats.unattempted} | 0 marks |\n\n`;
        }

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

            if (isComparative && initialAttempt) {
                const initResp = initialAttempt.userResponses[q.id];
                const initCorrect = checkIsCorrect(q, initResp);
                md += `> **Attempt 1:** ${initCorrect ? `+${correctMark} ✅ Correct` : `-${negativeMark} ❌ Incorrect`} (${initResp?.selectedKeys?.join(", ") || initResp?.textAnswer || "None"})\n`;
                md += `> **Retest Attempt:** ${isCorrect ? `+${correctMark} ✅ Correct` : `-${negativeMark} ❌ Incorrect`} (${resp?.selectedKeys?.join(", ") || resp?.textAnswer || "None"})\n\n`;
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
                md += `- **Your Answer:** ${resp?.textAnswer || "*(None)*"}${isGuessed ? " 💡 *(Guessed)*" : ""
                    }\n`;
                md += `- **Correct Answer:** ${Array.isArray(q.answer) ? q.answer.join(", ") : q.answer}\n`;
            }

            md += `\n**Status:** ${!isAns
                    ? "⚪ Unattempted (0 pts)"
                    : isCorrect
                        ? `✅ Correct (+${correctMark} pts)`
                        : `❌ Incorrect (-${negativeMark} pts)`
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
            {/* Top Score Banner & Dynamic Marking Scheme Selector */}
            <div className="qc-result-hero">
                <div className="qc-hero-left">
                    <div className="qc-trophy-circle">
                        {isComparative ? (
                            <TrendingUp size={36} className="qc-trophy-icon" />
                        ) : (
                            <Trophy size={36} className="qc-trophy-icon" />
                        )}
                    </div>
                    <div className="qc-hero-meta">
                        <h2 className="qc-result-title">
                            {isComparative ? "Recursive Retest Completed!" : "Quiz Completed!"}
                        </h2>
                        <p className="qc-result-subtitle">{quizTitle || "Knowledge Check"}</p>

                        {/* Marking Scheme Selector Control */}
                        <div className="qc-marking-scheme-picker">
                            <div className="qc-scheme-label">
                                <Calculator size={13} />
                                <span>Marking Scheme:</span>
                            </div>
                            <select
                                className="qc-scheme-select"
                                value={activeSchemeId}
                                onChange={(e) => handleSchemeChange(e.target.value)}
                            >
                                {MARKING_SCHEMES.map((scheme) => (
                                    <option key={scheme.id} value={scheme.id}>
                                        {scheme.label}
                                    </option>
                                ))}
                            </select>

                            {isCustomScheme && (
                                <div className="qc-custom-marking-inputs">
                                    <div className="qc-cinput-group">
                                        <span>+</span>
                                        <input
                                            type="number"
                                            step="0.25"
                                            min="0"
                                            value={correctMark}
                                            onChange={(e) => setCorrectMark(Math.max(0, parseFloat(e.target.value) || 0))}
                                            title="Marks for correct answer"
                                            className="qc-cinput"
                                        />
                                    </div>
                                    <div className="qc-cinput-group">
                                        <span>-</span>
                                        <input
                                            type="number"
                                            step="0.05"
                                            min="0"
                                            value={negativeMark}
                                            onChange={(e) => setNegativeMark(Math.max(0, parseFloat(e.target.value) || 0))}
                                            title="Negative marks deduction for wrong answer"
                                            className="qc-cinput"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Recalculated Score & Accuracy Badges */}
                <div className="qc-hero-score-badge">
                    <div className="qc-score-big">
                        <span className="qc-score-num">{totalMarksObtained}</span>
                        <span className="qc-score-denom">/{maxPossibleMarks}</span>
                    </div>
                </div>

                <div className="qc-hero-time">
                    <Clock size={16} />
                    <span>Time Spent: {formatSeconds(stats.timeSpentSeconds)}</span>
                </div>
            </div>

            {/* Recursive Retest Recommendation Banner (< 50% or setting threshold) */}
            {canDoRecursiveRetest && (
                <div className={`qc-retest-banner ${!isRevealed ? "qc-retest-banner-locked" : ""}`}>
                    <div className="qc-retest-banner-content">
                        <div className="qc-retest-badge">
                            <AlertTriangle size={13} />
                            <span>
                                Accuracy Below {thresholdPercentage}% Threshold ({accuracyPercentage}%)
                            </span>
                        </div>
                        <h3 className="qc-retest-heading">
                            {!isRevealed
                                ? "Answers are Hidden for Immediate Retest"
                                : "Boost Your Mastery with Recursive Retest"}
                        </h3>
                        <p className="qc-retest-desc">
                            You missed <strong>{stats.wrong + stats.unattempted}</strong> question(s). Retake only the
                            questions you got wrong without spoilers to solidify your understanding.
                        </p>

                        {!isRevealed && (
                            <div className="qc-countdown-wrapper">
                                <div className="qc-countdown-chip">
                                    <Clock size={13} />
                                    <span>
                                        Auto-revealing solutions in <strong>{countdown}s</strong>
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    className="qc-countdown-toggle-btn"
                                    onClick={() => setIsCountdownPaused((prev) => !prev)}
                                    title={isCountdownPaused ? "Resume auto-reveal" : "Pause auto-reveal"}
                                >
                                    {isCountdownPaused ? (
                                        <>
                                            <Play size={12} /> Resume Timer
                                        </>
                                    ) : (
                                        <>
                                            <Pause size={12} /> Pause Timer
                                        </>
                                    )}
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="qc-retest-actions-col">
                        <button
                            type="button"
                            className="qc-btn qc-btn-primary qc-retest-action-btn"
                            onClick={onStartRecursiveRetest}
                        >
                            <RotateCcw size={16} />
                            <span>Retake Wrong Questions ({stats.wrong + stats.unattempted})</span>
                        </button>
                        {!isRevealed && (
                            <button
                                type="button"
                                className="qc-btn qc-btn-secondary qc-reveal-now-btn"
                                onClick={() => setIsRevealed(true)}
                            >
                                <Eye size={15} />
                                <span>Reveal Answers Now</span>
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Side-by-Side Comparison Grid when Recursive Retest is finished */}
            {isComparative && initialAttempt && (
                <div className="qc-side-by-side-section">
                    <div className="qc-comparison-header">
                        <div className="qc-comp-title">
                            <Layers size={18} className="qc-comp-icon" />
                            <span>Iterative Test Comparison</span>
                        </div>
                        <div
                            className={`qc-delta-pill ${marksDelta >= 0 ? "qc-delta-positive" : "qc-delta-negative"
                                }`}
                        >
                            <Sparkles size={14} />
                            <span>
                                {marksDelta >= 0 ? `+${marksDelta}` : `${marksDelta}`} Marks Gain ({accuracyDelta >= 0 ? `+${accuracyDelta}%` : `${accuracyDelta}%`} Accuracy)
                            </span>
                        </div>
                    </div>

                    <div className="qc-comparison-grid">
                        {/* Initial Attempt Card */}
                        <div className="qc-attempt-card qc-attempt-card-initial">
                            <div className="qc-acard-header">
                                <span className="qc-acard-tag">Attempt 1 (Full Quiz)</span>
                                <span className="qc-acard-score">
                                    {initTotalMarksObtained}/{initMaxMarks} ({initAccuracyPercentage}% Acc)
                                </span>
                            </div>
                            <div className="qc-acard-body">
                                <div className="qc-acard-row">
                                    <span>Attempted:</span>
                                    <strong>{initialAttempt.stats.attempted}</strong>
                                </div>
                                <div className="qc-acard-row qc-row-green">
                                    <span>Right (+{correctMark}):</span>
                                    <strong>{initialAttempt.stats.right} (+{initGrossMarks} pts)</strong>
                                </div>
                                <div className="qc-acard-row qc-row-red">
                                    <span>Wrong (-{negativeMark}):</span>
                                    <strong>{initialAttempt.stats.wrong} (-{initNegativePenalty} pts)</strong>
                                </div>
                                <div className="qc-acard-row qc-row-amber">
                                    <span>Guessed:</span>
                                    <strong>
                                        {initialAttempt.stats.guessedRight + initialAttempt.stats.guessedWrong}
                                    </strong>
                                </div>
                                <div className="qc-acard-row">
                                    <span>Time:</span>
                                    <strong>{formatSeconds(initialAttempt.stats.timeSpentSeconds)}</strong>
                                </div>
                            </div>
                        </div>

                        {/* Recursive Retest Card */}
                        <div className="qc-attempt-card qc-attempt-card-recursive">
                            <div className="qc-acard-header">
                                <span className="qc-acard-tag">Attempt 2 (Recursive Retest)</span>
                                <span className="qc-acard-score">
                                    {totalMarksObtained}/{maxPossibleMarks} ({accuracyPercentage}% Acc)
                                </span>
                            </div>
                            <div className="qc-acard-body">
                                <div className="qc-acard-row">
                                    <span>Attempted:</span>
                                    <strong>{stats.attempted}</strong>
                                </div>
                                <div className="qc-acard-row qc-row-green">
                                    <span>Right (Recovered):</span>
                                    <strong>{stats.right} (+{grossMarks} pts)</strong>
                                </div>
                                <div className="qc-acard-row qc-row-red">
                                    <span>Still Wrong (-{negativeMark}):</span>
                                    <strong>{stats.wrong} (-{negativePenalty} pts)</strong>
                                </div>
                                <div className="qc-acard-row qc-row-amber">
                                    <span>Guessed:</span>
                                    <strong>{stats.guessedRight + stats.guessedWrong}</strong>
                                </div>
                                <div className="qc-acard-row">
                                    <span>Time:</span>
                                    <strong>{formatSeconds(stats.timeSpentSeconds)}</strong>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Standard Metrics Grid with Recalculated Marks */}
            <div className="qc-metrics-grid">
                {/* 1. Total Marks */}
                <div className="qc-metric-card qc-metric-attempted">
                    <div className="qc-metric-header">
                        <span className="qc-metric-title">Total Marks</span>
                        <Calculator size={16} className="qc-metric-icon" />
                    </div>
                    <div className="qc-metric-val">{totalMarksObtained} <span className="qc-metric-val-denom">/{maxPossibleMarks}</span></div>
                    <div className="qc-metric-sub">{marksPercentage}% of Max Marks</div>
                </div>

                {/* 2. Right / Earned */}
                <div className="qc-metric-card qc-metric-right">
                    <div className="qc-metric-header">
                        <span className="qc-metric-title">{isComparative ? "Recovered Right" : "Right"} (+{correctMark})</span>
                        <CheckCircle2 size={16} className="qc-metric-icon qc-icon-green" />
                    </div>
                    <div className="qc-metric-val qc-val-green">+{grossMarks}</div>
                    <div className="qc-metric-sub">{stats.right} correct answers</div>
                </div>

                {/* 3. Negative Marks */}
                <div className="qc-metric-card qc-metric-wrong">
                    <div className="qc-metric-header">
                        <span className="qc-metric-title">Negative Marks (-{negativeMark})</span>
                        <XCircle size={16} className="qc-metric-icon qc-icon-red" />
                    </div>
                    <div className="qc-metric-val qc-val-red">-{negativePenalty}</div>
                    <div className="qc-metric-sub">{stats.wrong} incorrect answers</div>
                </div>

                {/* 4. Accuracy */}
                <div className="qc-metric-card qc-metric-guessed-right">
                    <div className="qc-metric-header">
                        <span className="qc-metric-title">Accuracy Rate</span>
                        <Percent size={16} className="qc-metric-icon qc-icon-amber" />
                    </div>
                    <div className="qc-metric-val qc-val-amber">{accuracyPercentage}%</div>
                    <div className="qc-metric-sub">{stats.right} / {stats.attempted} attempted</div>
                </div>

                {/* 5. Guessed Stats */}
                <div className="qc-metric-card qc-metric-guessed-wrong">
                    <div className="qc-metric-header">
                        <span className="qc-metric-title">Guessed Outcome</span>
                        <Lightbulb size={16} className="qc-metric-icon qc-icon-orange" />
                    </div>
                    <div className="qc-metric-val qc-val-orange">{stats.guessedRight + stats.guessedWrong}</div>
                    <div className="qc-metric-sub">{stats.guessedRight} right / {stats.guessedWrong} wrong</div>
                </div>
            </div>

            {/* Action Bar */}
            <div className="qc-result-actions-bar">
                <div className="qc-result-tabs">
                    {isRevealed ? (
                        <>
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
                        </>
                    ) : (
                        <div className="qc-locked-status-chip">
                            <Lock size={13} />
                            <span>Question Solutions Hidden</span>
                        </div>
                    )}
                </div>

                <div className="qc-result-btn-group">
                    {canDoRecursiveRetest && !isRevealed && (
                        <button
                            type="button"
                            className="qc-btn qc-btn-accent"
                            onClick={() => setIsRevealed(true)}
                            title="Reveal correct answers and detailed explanations"
                        >
                            <Eye size={15} />
                            <span>Reveal Answers</span>
                        </button>
                    )}
                    {canDoRecursiveRetest && isRevealed && (
                        <button
                            type="button"
                            className="qc-btn qc-btn-accent"
                            onClick={onStartRecursiveRetest}
                            title="Retake only the questions answered incorrectly"
                        >
                            <RotateCcw size={15} />
                            <span>Recursive Retest</span>
                        </button>
                    )}
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
                        title="Retake the full quiz"
                    >
                        <RotateCcw size={15} />
                        <span>Full Retake</span>
                    </button>
                    <button
                        type="button"
                        className="qc-btn qc-btn-primary"
                        onClick={onClose}
                        title="Close Quiz Modal"
                    >
                        <X size={15} />
                        <span>Close</span>
                    </button>
                </div>
            </div>

            {/* Detailed Question Review List OR Locked Solutions State */}
            {!isRevealed ? (
                <div className="qc-locked-solutions-panel">
                    <div className="qc-locked-icon-wrap">
                        <Lock size={36} className="qc-locked-icon" />
                    </div>
                    <h3 className="qc-locked-title">Detailed Solutions & Answers are Protected</h3>
                    <p className="qc-locked-hint">
                        To test your knowledge and maximize recall, questions and correct answers are hidden.
                        Choose to start a <strong>Recursive Retest</strong> on your {stats.wrong + stats.unattempted}{" "}
                        missed questions, or reveal the solutions now.
                    </p>
                    <div className="qc-locked-buttons">
                        <button
                            type="button"
                            className="qc-btn qc-btn-primary qc-retest-action-btn"
                            onClick={onStartRecursiveRetest}
                        >
                            <RotateCcw size={16} />
                            <span>Start Recursive Retest</span>
                        </button>
                        <button
                            type="button"
                            className="qc-btn qc-btn-secondary qc-reveal-now-btn"
                            onClick={() => setIsRevealed(true)}
                        >
                            <Eye size={15} />
                            <span>Reveal Solutions Now</span>
                        </button>
                    </div>
                </div>
            ) : (
                <div className="qc-review-list">
                    {filteredQuestions.map((q) => {
                        const isMSQ = q.type === "MSQ";
                        const resp = userResponses[q.id];
                        const isAns = resp?.isAnswered;
                        const isCorrect = checkIsCorrect(q, resp);
                        const isGuessed = !isMSQ && resp?.isGuessed;
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

                        // For comparative mode, see what the initial response was
                        const initResp = isComparative && initialAttempt ? initialAttempt.userResponses[q.id] : undefined;
                        const initCorrect = initResp ? checkIsCorrect(q, initResp) : undefined;

                        return (
                            <div key={q.id} className={`qc-review-card ${cardStatusClass}`}>
                                <div
                                    className="qc-review-card-header"
                                    onClick={() => toggleExpand(q.id)}
                                >
                                    <div className="qc-review-header-left">
                                        <span className="qc-q-index-pill">Q{q.index + 1}</span>

                                        {/* Question Type Pill */}
                                        {isMSQ && (
                                            <span className="qc-type-pill qc-type-msq">☑️ MSQ</span>
                                        )}

                                        {/* Outcome Badge with Points Impact */}
                                        {!isAns ? (
                                            <span className="qc-outcome-pill qc-outcome-unattempted">
                                                Unattempted (0 pts)
                                            </span>
                                        ) : isCorrect ? (
                                            <span className="qc-outcome-pill qc-outcome-correct">
                                                <CheckCircle2 size={13} />
                                                {isGuessed ? "Guessed Right" : "Correct"} (+{correctMark} pts)
                                            </span>
                                        ) : (
                                            <span className="qc-outcome-pill qc-outcome-incorrect">
                                                <XCircle size={13} />
                                                {isGuessed ? "Guessed Wrong" : "Incorrect"}{" "}
                                                {negativeMark > 0 ? `(-${negativeMark} pts)` : "(0 pts)"}
                                            </span>
                                        )}

                                        {isGuessed && (
                                            <span className="qc-status-pill qc-pill-guessed">
                                                <Lightbulb size={11} /> Guessed
                                            </span>
                                        )}

                                        {/* Comparative Tag */}
                                        {isComparative && initResp && (
                                            <span
                                                className={`qc-attempt-diff-pill ${!initCorrect && isCorrect
                                                        ? "qc-diff-improved"
                                                        : initCorrect && isCorrect
                                                            ? "qc-diff-maintained"
                                                            : "qc-diff-missed"
                                                    }`}
                                            >
                                                {!initCorrect && isCorrect
                                                    ? "✨ Recovered in Retest"
                                                    : initCorrect && isCorrect
                                                        ? "✅ Maintained"
                                                        : "❌ Still Incorrect"}
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
                                                    const isUserChoice = resp?.selectedKeys?.includes(opt.key);
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
                                                            {/* Checkbox for MSQ */}
                                                            {isMSQ && (
                                                                <div
                                                                    className={`qc-ropt-checkbox ${
                                                                        isUserChoice ? "qc-ropt-cb-checked" : ""
                                                                    } ${isCorrectOption ? "qc-ropt-cb-correct" : ""}`}
                                                                >
                                                                    {(isUserChoice || isCorrectOption) && <Check size={12} />}
                                                                </div>
                                                            )}

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
                                                                        className={`qc-ropt-badge ${isCorrectOption
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

                                        {/* Expandable Explanation Component */}
                                        {q.explanation && (
                                            <ExpandableExplanation text={q.explanation} app={app} />
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
