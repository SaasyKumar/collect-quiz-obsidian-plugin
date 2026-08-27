import { skewerToJSON } from "skewer-format";
import { QuizQuestion, QuestionType } from "../types";

/**
 * Normalizes questions parsed from skewer-format into a flat array of QuizQuestion items.
 * Handles single questions, question sets with passages (Reading Comprehension), MSQ, MCQ, and TITA.
 */
export function parseQuizContent(rawContent: string): QuizQuestion[] {
    if (!rawContent || !rawContent.trim()) {
        return [];
    }

    try {
        // Pre-process: inject --- separators between adjacent TYPE: blocks that lack them.
        // This ensures that even if the user forgets separators, each question is parsed independently.
        const preprocessed = injectMissingSeparators(rawContent.trim());

        // Ensure input has a sentinel delimiter at the end so skewer-format flushes the last question
        const sanitizedInput = preprocessed.trim().endsWith("---")
            ? preprocessed
            : `${preprocessed}\n\n---`;

        const rawResults = skewerToJSON(sanitizedInput);
        const questions: QuizQuestion[] = [];

        if (!Array.isArray(rawResults)) {
            return [];
        }

        let questionIndex = 0;

        for (const item of rawResults) {
            if (!item) continue;

            // Check if it's a QuestionSet (contains passage / questions array)
            if ("questions" in item && Array.isArray((item as any).questions)) {
                const qSet = item as any;
                const passage = qSet.para || "";

                for (const subQ of qSet.questions) {
                    if (!subQ || !subQ.question) continue;
                    const parsedType = inferQuestionType(subQ.type, subQ.options, subQ.answer);
                    questions.push({
                        id: subQ.id || `q_${questionIndex + 1}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                        type: parsedType,
                        question: subQ.question || "",
                        options: normalizeOptions(subQ.options),
                        answer: subQ.answer,
                        explanation: subQ.explanation || "",
                        passage: passage,
                        index: questionIndex++,
                    });
                }
            } else if ("question" in item && (item as any).question) {
                const q = item as any;
                const parsedType = inferQuestionType(q.type, q.options, q.answer);
                questions.push({
                    id: q.id || `q_${questionIndex + 1}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                    type: parsedType,
                    question: q.question || "",
                    options: normalizeOptions(q.options),
                    answer: q.answer,
                    explanation: q.explanation || "",
                    passage: (q as any).para || undefined,
                    index: questionIndex++,
                });
            }
        }

        return questions;
    } catch (err) {
        console.error("[QuizCollector] Error parsing skewer content:", err);
        return [];
    }
}

/**
 * Injects `---` separators between consecutive question/questionset blocks
 * when a new TYPE: line appears without a preceding separator.
 *
 * This is a resilience layer for hand-written quiz content that doesn't
 * include `---` between questions.
 */
function injectMissingSeparators(content: string): string {
    // Match lines that start a new block: TYPE:, or QUESTION: at top level (not inside a QUESTIONSET sub-block).
    // Strategy: split into lines, detect when a new TYPE: appears without a --- before it.
    const lines = content.split("\n");
    const result: string[] = [];

    // Track whether we've seen any content since the last separator
    let blockStarted = false;
    const sepRegex = /^\s*---\s*$/;
    // A "top-level TYPE" line: begins a brand new question block
    const typeLineRegex = /^\s*TYPE\s*:\s*\S+/i;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        if (sepRegex.test(line)) {
            // Explicit separator — reset block state
            result.push(line);
            blockStarted = false;
            continue;
        }

        if (typeLineRegex.test(line)) {
            // Starting a new type block. If we already have a block started, inject separator
            if (blockStarted) {
                result.push("---");
            }
            blockStarted = true;
        }

        result.push(line);
    }

    return result.join("\n");
}

function inferQuestionType(
    explicitType: string | undefined,
    options: any[] | undefined,
    answer: string | string[] | undefined
): QuestionType {
    // Always respect an explicit TYPE declaration first
    if (explicitType) {
        const upper = explicitType.trim().toUpperCase();
        if (upper === "MSQ") return "MSQ";
        if (upper === "TITA") return "TITA";
        if (upper === "MCQ") return "MCQ";
        if (upper === "QUESTIONSET") return "MCQ"; // sub-questions handled separately
    }

    // Infer from answer structure
    if (Array.isArray(answer) && answer.length > 1) {
        return "MSQ";
    }

    if (typeof answer === "string" && answer.includes(",")) {
        return "MSQ";
    }

    if (!options || options.length === 0) {
        return "TITA";
    }

    return "MCQ";
}

function normalizeOptions(options: any): { key: string; value: string }[] {
    if (!Array.isArray(options)) return [];
    return options
        .filter((opt) => opt && (opt.key || opt.value))
        .map((opt) => ({
            key: (opt.key || "").trim().toUpperCase(),
            value: (opt.value || "").trim(),
        }));
}
