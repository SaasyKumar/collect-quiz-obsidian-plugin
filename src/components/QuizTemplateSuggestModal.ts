import { App, FuzzySuggestModal, FuzzyMatch, Editor } from "obsidian";

export interface QuizTemplateItem {
    id: string;
    type: "MCQ" | "MSQ" | "RC" | "TITA";
    label: string;
    description: string;
    badge: string;
    template: string;
}

export const QUIZ_TEMPLATES: QuizTemplateItem[] = [
    {
        id: "mcq",
        type: "MCQ",
        label: "MCQ - Multiple Choice Question",
        description: "Standard single correct option question",
        badge: "MCQ",
        template: `TYPE: MCQ
QUESTION: Enter question here
A. Option A
B. Option B
C. Option C
D. Option D
ANSWER: A
EXPLANATION: Explanation for the correct answer.
`,
    },
    {
        id: "msq",
        type: "MSQ",
        label: "MSQ - Multiple Select Question",
        description: "Multiple correct options (comma-separated)",
        badge: "MSQ",
        template: `TYPE: MSQ
QUESTION: Enter question here
A. Option A
B. Option B
C. Option C
D. Option D
ANSWER: A,C
EXPLANATION: Explanation for the correct answers.
`,
    },
    {
        id: "rc",
        type: "RC",
        label: "RC - Reading Comprehension / Question Set",
        description: "Passage context with multiple associated questions",
        badge: "RC",
        template: `TYPE: QUESTIONSET
PARA: Insert reading passage or context here.

QUESTION: First question based on the passage?
A. Option A
B. Option B
C. Option C
D. Option D
ANSWER: A
EXPLANATION: Explanation for question 1.

QUESTION: Second question based on the passage?
A. Option A
B. Option B
C. Option C
D. Option D
ANSWER: B
EXPLANATION: Explanation for question 2.
`,
    },
    {
        id: "tita",
        type: "TITA",
        label: "TITA - Type In The Answer",
        description: "Direct numerical or text input without options",
        badge: "TITA",
        template: `TYPE: TITA
QUESTION: Enter numerical or direct answer question here
ANSWER: 42
EXPLANATION: Explanation and solution steps.
`,
    },
];

export function insertQuizTemplate(editor: Editor, template: string) {
    const cursor = editor.getCursor();
    const currentLine = editor.getLine(cursor.line);

    // If line has existing content before cursor, ensure newline separation
    let textToInsert = template;
    if (currentLine.trim().length > 0 && cursor.ch > 0) {
        textToInsert = "\n" + template;
    }

    editor.replaceSelection(textToInsert);
}

export class QuizTemplateSuggestModal extends FuzzySuggestModal<QuizTemplateItem> {
    private editor: Editor;

    constructor(app: App, editor: Editor) {
        super(app);
        this.editor = editor;
        this.setPlaceholder("Choose a quiz template (MCQ, MSQ, RC, TITA)...");
    }

    getItems(): QuizTemplateItem[] {
        return QUIZ_TEMPLATES;
    }

    getItemText(item: QuizTemplateItem): string {
        return `${item.label} ${item.type} ${item.description}`;
    }

    renderSuggestion(item: FuzzyMatch<QuizTemplateItem>, el: HTMLElement): void {
        el.addClass("qc-template-suggest-item");

        const headerEl = el.createDiv({ cls: "qc-template-suggest-header" });
        const badgeEl = headerEl.createSpan({
            cls: `qc-template-badge qc-template-badge-${item.item.type.toLowerCase()}`,
        });
        badgeEl.setText(item.item.badge);

        const titleEl = headerEl.createSpan({ cls: "qc-template-title" });
        titleEl.setText(item.item.label);

        const descEl = el.createDiv({ cls: "qc-template-desc" });
        descEl.setText(item.item.description);
    }

    onChooseItem(item: QuizTemplateItem, _evt: MouseEvent | KeyboardEvent): void {
        insertQuizTemplate(this.editor, item.template);
    }
}
