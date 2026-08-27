import { QuizQuestion, OptionItem } from "../types";
import { getCorrectAnswerKeys } from "./scorer";

/**
 * Pure Fisher-Yates shuffle returning a new array.
 */
export function shuffleArray<T>(array: readonly T[]): T[] {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = arr[i];
        arr[i] = arr[j];
        arr[j] = temp;
    }
    return arr;
}

/**
 * Shuffles the options of a single question (A, B, C, D...) and recalculates
 * the correct answer key(s) so that the answer pointer matches the new option positions.
 */
export function randomizeQuestionOptions(q: QuizQuestion): QuizQuestion {
    if (!q.options || q.options.length <= 1) {
        return { ...q };
    }

    const correctKeys = getCorrectAnswerKeys(q.answer);
    // Find the text values of the correct options
    const correctOptionValues = new Set<string>();
    for (const opt of q.options) {
        if (correctKeys.includes(opt.key.toUpperCase())) {
            correctOptionValues.add(opt.value.trim());
        }
    }

    // Shuffle the options array
    const shuffledRawOptions = shuffleArray(q.options);

    // Re-assign standard keys (A, B, C, D...)
    const newOptions: OptionItem[] = shuffledRawOptions.map((opt, idx) => ({
        key: String.fromCharCode(65 + idx), // 'A', 'B', 'C'...
        value: opt.value,
    }));

    // Find the new keys that correspond to the correct option values
    const newCorrectKeys: string[] = [];
    for (const opt of newOptions) {
        if (correctOptionValues.has(opt.value.trim())) {
            newCorrectKeys.push(opt.key);
        }
    }

    // Reconstruct the answer field in the same shape (string or array)
    let newAnswer: string | string[] | undefined = q.answer;
    if (Array.isArray(q.answer)) {
        newAnswer = newCorrectKeys;
    } else if (typeof q.answer === "string") {
        newAnswer = newCorrectKeys.join(",");
    }

    return {
        ...q,
        options: newOptions,
        answer: newAnswer,
    };
}

/**
 * Randomizes both questions and options according to the user's settings.
 * Keeps reading comprehension passage blocks intact when question order is randomized.
 */
export function randomizeQuiz(
    questions: readonly QuizQuestion[],
    randomizeQuestions: boolean,
    randomizeOptions: boolean
): QuizQuestion[] {
    if (!questions || questions.length === 0) {
        return [];
    }

    // Step 1: Optionally randomize options inside each question
    let processedQuestions: QuizQuestion[] = questions.map((q) => {
        if (randomizeOptions && (q.type === "MCQ" || q.type === "MSQ" || (q.options && q.options.length > 0))) {
            return randomizeQuestionOptions(q);
        }
        return { ...q, options: q.options ? [...q.options] : [] };
    });

    // Step 2: Optionally randomize question order
    if (randomizeQuestions && processedQuestions.length > 1) {
        // Group consecutive questions with identical passages into blocks to preserve passage context
        const blocks: QuizQuestion[][] = [];
        let currentBlock: QuizQuestion[] = [];

        for (let i = 0; i < processedQuestions.length; i++) {
            const currentQ = processedQuestions[i];
            if (currentBlock.length === 0) {
                currentBlock.push(currentQ);
            } else {
                const prevQ = currentBlock[currentBlock.length - 1];
                if (currentQ.passage && prevQ.passage && currentQ.passage === prevQ.passage) {
                    currentBlock.push(currentQ);
                } else {
                    blocks.push(currentBlock);
                    currentBlock = [currentQ];
                }
            }
        }
        if (currentBlock.length > 0) {
            blocks.push(currentBlock);
        }

        // Shuffle the blocks
        const shuffledBlocks = shuffleArray(blocks);
        processedQuestions = shuffledBlocks.flat();
    }

    // Step 3: Re-index questions consecutively
    return processedQuestions.map((q, idx) => ({
        ...q,
        index: idx,
    }));
}
