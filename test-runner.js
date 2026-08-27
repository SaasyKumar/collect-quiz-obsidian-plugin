import fs from "fs";
import path from "path";
import { parseQuizContent } from "./src/utils/parser.ts";
import { calculateQuizResults, checkIsCorrect } from "./src/utils/scorer.ts";

const skewerTestDir = path.resolve("../skewer/test");

console.log("=== Testing Quiz Collector Parser with skewer-format sample files ===\n");

const testFiles = ["mcq.txt", "msq.txt", "rc.txt", "tita.txt"];

for (const file of testFiles) {
    const filePath = path.join(skewerTestDir, file);
    if (!fs.existsSync(filePath)) {
        console.log(`Skipping ${file} (not found at ${filePath})`);
        continue;
    }

    const content = fs.readFileSync(filePath, "utf-8");
    const questions = parseQuizContent(content);
    console.log(`✅ [${file}]: Parsed ${questions.length} question(s).`);
    questions.forEach((q, idx) => {
        console.log(`   - Q${idx + 1} [${q.type}]: "${q.question.slice(0, 60)}..." Options: ${q.options?.length || 0}, Answer: ${JSON.stringify(q.answer)}`);
        if (q.passage) {
            console.log(`     Passage: "${q.passage.slice(0, 40)}..."`);
        }
    });
}

// Test Scorer with Guessed metrics
console.log("\n=== Testing Scorer & Guessed Metrics ===");
const sampleMCQ = `
TYPE: MCQ
QUESTION: In web design, what is the recommended approach for typography?
A. Using a variety of fonts
B. Opting for serif fonts for historical significance
C. Choosing sans-serif fonts
D. Using largest font
ANSWER: B
EXPLANATION: Serif fonts are chosen for clarity.
---
QUESTION: What does SVG stand for?
A. Standard Vector
B. Simple Vector
C. Scalable Vector Graphics
ANSWER: C
`;

const parsed = parseQuizContent(sampleMCQ);
console.log(`Parsed ${parsed.length} questions for scoring test.`);

// Simulate responses:
// Q1: User chooses 'B' (correct) and marks as GUESSED -> should be guessedRight: 1
// Q2: User chooses 'A' (incorrect) and marks as GUESSED -> should be guessedWrong: 1
const mockResponses = {
    [parsed[0].id]: {
        selectedKeys: ["B"],
        textAnswer: "",
        isGuessed: true,
        isMarkedForReview: false,
        isAnswered: true,
    },
    [parsed[1].id]: {
        selectedKeys: ["A"],
        textAnswer: "",
        isGuessed: true,
        isMarkedForReview: true,
        isAnswered: true,
    },
};

const stats = calculateQuizResults(parsed, mockResponses, 45, 120);
console.log("Scorer Results:", stats);

if (
    stats.attempted === 2 &&
    stats.right === 1 &&
    stats.guessedRight === 1 &&
    stats.wrong === 1 &&
    stats.guessedWrong === 1
) {
    console.log("\n🎉 ALL METRIC TESTS PASSED! Attempted, Right, Guessed Right, Wrong, Guessed Wrong are exact.");
} else {
    console.error("❌ Metric assertion failed!");
    process.exit(1);
}

// Test Quiz Templates
console.log("\n=== Testing Quiz Templates Parsing ===");
import { QUIZ_TEMPLATES } from "./src/components/QuizTemplateSuggestModal.ts";

for (const tmpl of QUIZ_TEMPLATES) {
    const qs = parseQuizContent(tmpl.template);
    if (qs.length === 0) {
        console.error(`❌ Failed to parse template: ${tmpl.label}`);
        process.exit(1);
    }
    console.log(`✅ Template [${tmpl.type}]: Parsed ${qs.length} question(s) successfully.`);
}

console.log("\n🎉 ALL TESTS (INCLUDING TEMPLATES) PASSED!");

