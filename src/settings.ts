import { App, PluginSettingTab, Setting } from "obsidian";
import QuizCollectorPlugin from "./main";
import { DEFAULT_SETTINGS } from "./types";

export class QuizCollectorSettingTab extends PluginSettingTab {
    plugin: QuizCollectorPlugin;

    constructor(app: App, plugin: QuizCollectorPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        containerEl.createEl("h2", { text: "Quiz Collector Settings" });

        new Setting(containerEl)
            .setName("Time per question (seconds)")
            .setDesc("Default time allocated per question in the quiz. Total timer = (questions count × time per question).")
            .addText((text) =>
                text
                    .setPlaceholder("60")
                    .setValue(String(this.plugin.settings.timePerQuestionSeconds))
                    .onChange(async (value) => {
                        const num = parseInt(value, 10);
                        if (!isNaN(num) && num > 0) {
                            this.plugin.settings.timePerQuestionSeconds = num;
                            await this.plugin.saveSettings();
                        }
                    })
            );

        new Setting(containerEl)
            .setName("Enable timer by default")
            .setDesc("If enabled, the quiz will start with an active countdown timer.")
            .addToggle((toggle) =>
                toggle
                    .setValue(this.plugin.settings.enableTimer)
                    .onChange(async (value) => {
                        this.plugin.settings.enableTimer = value;
                        await this.plugin.saveSettings();
                    })
            );

        new Setting(containerEl)
            .setName("Low time warning (seconds)")
            .setDesc("Trigger pulse animation and warning color when remaining time drops below this threshold.")
            .addText((text) =>
                text
                    .setPlaceholder("15")
                    .setValue(String(this.plugin.settings.warningTimeSeconds))
                    .onChange(async (value) => {
                        const num = parseInt(value, 10);
                        if (!isNaN(num) && num >= 0) {
                            this.plugin.settings.warningTimeSeconds = num;
                            await this.plugin.saveSettings();
                        }
                    })
            );

        new Setting(containerEl)
            .setName("Auto-advance on selection")
            .setDesc("Automatically move to the next question when choosing an option in single-choice (MCQ) mode.")
            .addToggle((toggle) =>
                toggle
                    .setValue(this.plugin.settings.autoAdvanceOnSelect)
                    .onChange(async (value) => {
                        this.plugin.settings.autoAdvanceOnSelect = value;
                        await this.plugin.saveSettings();
                    })
            );

        new Setting(containerEl)
            .setName("Confirmation before submit")
            .setDesc("Show a summary breakdown and confirmation modal when clicking Submit Quiz.")
            .addToggle((toggle) =>
                toggle
                    .setValue(this.plugin.settings.confirmBeforeSubmit)
                    .onChange(async (value) => {
                        this.plugin.settings.confirmBeforeSubmit = value;
                        await this.plugin.saveSettings();
                    })
            );
    }
}
