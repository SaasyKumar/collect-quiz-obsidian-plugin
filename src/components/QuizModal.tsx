import { App, Modal, Notice, TFile } from "obsidian";
import React from "react";
import { createRoot, Root } from "react-dom/client";
import { QuizApp } from "./QuizApp";
import { QuizQuestion, QuizCollectorSettings } from "../types";

export class QuizModal extends Modal {
    private root: Root | null = null;
    private questions: QuizQuestion[];
    private quizTitle: string;
    private settings: QuizCollectorSettings;

    constructor(
        app: App,
        questions: QuizQuestion[],
        quizTitle: string,
        settings: QuizCollectorSettings
    ) {
        super(app);
        this.questions = questions;
        this.quizTitle = quizTitle;
        this.settings = settings;
    }

    onOpen() {
        const { contentEl, modalEl } = this;
        contentEl.empty();

        // Style the modal container for large full-screen / immersive view
        modalEl.addClass("qc-modal-window");
        contentEl.addClass("qc-modal-content");

        const reactContainer = contentEl.createDiv({ cls: "qc-react-container" });
        this.root = createRoot(reactContainer);

        this.root.render(
            <React.StrictMode>
                <QuizApp
                    quizTitle={this.quizTitle}
                    questions={this.questions}
                    settings={this.settings}
                    onCloseModal={() => this.close()}
                    onExportAsNote={(markdownSummary: string) =>
                        this.handleExportNote(markdownSummary)
                    }
                />
            </React.StrictMode>
        );
    }

    async handleExportNote(markdownSummary: string) {
        try {
            const sanitizedTitle = (this.quizTitle || "Quiz Results").replace(/[\\/:"*?<>|]/g, "-");
            const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
            const fileName = `Quiz-Result-${sanitizedTitle}-${timestamp}.md`;

            // Check if active folder exists, otherwise create at vault root
            const activeFile = this.app.workspace.getActiveFile();
            const parentPath = activeFile && activeFile.parent ? activeFile.parent.path : "";
            const fullPath = parentPath ? `${parentPath}/${fileName}` : fileName;

            const newFile = await this.app.vault.create(fullPath, markdownSummary);
            new Notice(`Quiz result note saved: ${fileName}`);

            // Optionally open the newly created note in a new tab
            const leaf = this.app.workspace.getLeaf(true);
            if (leaf) {
                await leaf.openFile(newFile);
            }
        } catch (err) {
            console.error("[QuizCollector] Failed to export note:", err);
            new Notice("Failed to create quiz result note.");
        }
    }

    onClose() {
        if (this.root) {
            this.root.unmount();
            this.root = null;
        }
        const { contentEl } = this;
        contentEl.empty();
    }
}
