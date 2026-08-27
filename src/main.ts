import { Plugin, Notice, MarkdownView, Editor, TFile } from "obsidian";
import { QuizCollectorSettings, DEFAULT_SETTINGS } from "./types";
import { QuizCollectorSettingTab } from "./settings";
import { QuizModal } from "./components/QuizModal";
import { parseQuizContent } from "./utils/parser";

export default class QuizCollectorPlugin extends Plugin {
    settings: QuizCollectorSettings = DEFAULT_SETTINGS;

    async onload() {
        await this.loadSettings();

        // Register Settings Tab
        this.addSettingTab(new QuizCollectorSettingTab(this.app, this));

        // Register Command: "Create quiz"
        // This is accessible via Command Palette and Slash Commands ("/create quiz")
        this.addCommand({
            id: "create-quiz",
            name: "Create quiz",
            editorCallback: async (editor: Editor, view: MarkdownView) => {
                await this.startQuizFromCurrentView(view);
            },
        });

        // Register a global workspace command as well
        this.addCommand({
            id: "start-quiz-active-note",
            name: "Start quiz from active note",
            callback: async () => {
                const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
                if (activeView) {
                    await this.startQuizFromCurrentView(activeView);
                } else {
                    const activeFile = this.app.workspace.getActiveFile();
                    if (activeFile && activeFile.extension === "md") {
                        await this.startQuizFromFile(activeFile);
                    } else {
                        new Notice("Please open a markdown file containing quiz questions.");
                    }
                }
            },
        });

        console.log("[QuizCollector] Plugin loaded successfully.");
    }

    async startQuizFromCurrentView(view: MarkdownView) {
        const file = view.file;
        const noteContent = view.getViewData();
        const title = file ? file.basename : "Untitled Quiz";

        this.processAndLaunchQuiz(noteContent, title);
    }

    async startQuizFromFile(file: TFile) {
        try {
            const noteContent = await this.app.vault.read(file);
            this.processAndLaunchQuiz(noteContent, file.basename);
        } catch (err) {
            console.error("[QuizCollector] Error reading file:", err);
            new Notice("Failed to read the active note.");
        }
    }

    processAndLaunchQuiz(content: string, title: string) {
        if (!content || !content.trim()) {
            new Notice("The active note is empty. Please add questions in Skewer format.");
            return;
        }

        const questions = parseQuizContent(content);

        if (!questions || questions.length === 0) {
            new Notice(
                "No quiz questions detected! Ensure questions use the Skewer format (e.g. QUESTION: ... A. ... ANSWER: ...)"
            );
            return;
        }

        new Notice(`Starting Quiz: ${title} (${questions.length} questions)`);
        const modal = new QuizModal(this.app, questions, title, this.settings);
        modal.open();
    }

    onunload() {
        console.log("[QuizCollector] Plugin unloaded.");
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }
}
