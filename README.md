# Quiz Collector - Obsidian Plugin

**Quiz Collector** is a modern, interactive quiz and flashcard runner for Obsidian powered by **React** and the [`skewer-format`](https://www.npmjs.com/package/skewer-format) parser.

---

## ✨ Features

- 🎯 **Slash Command & Quick Actions**: Run `/create quiz` or open the Command Palette (`Quiz Collector: Create quiz`) on any markdown note to instantly launch a quiz.
- ⏱️ **Pausable Timer**: Configurable countdown timer per question (changeable in Settings) with low-time warning animations, and instant pause/resume (`Space` key or top timer button).
- 💡 **Hover Bulb Guess Mechanic**:
  - Hovering over any option button reveals a bulb (💡) icon on the left edge.
  - Clicking specifically on that bulb area selects the option and flags your answer as **Guessed**.
  - Clicking the option body selects the answer normally.
- 📊 **Question Status Palette (Right Sidebar)**:
  - Live color-coded status tracking:
    - 🟢 **Answered**
    - ⚪ **Not Answered**
    - 🟣 **Marked for Review**
    - 💡 **Guessed**
    - 🟡 **Marked for Review + Answered**
  - Instant jump navigation to any question.
  - Live category filter tabs (*All*, *Answered*, *Unanswered*, *Review*, *Guessed*).
- 📈 **Comprehensive Results Dashboard**:
  - **No. of Attempted**
  - **Right**
  - **Guessed Right** (lucky guesses)
  - **Wrong**
  - **Guessed Wrong** (unlucky guesses)
  - **Unattempted**
  - Overall Score & Accuracy %
  - Detailed Question-by-Question review with correct answers, explanations, and your choices.
  - Export result note directly into your Obsidian vault.
- ⌨️ **Keyboard Shortcuts**:
  - `ArrowLeft` / `ArrowRight` : Previous / Next Question
  - `1` / `2` / `3` / `4` or `A` / `B` / `C` / `D` : Choose Option
  - `M` : Toggle Mark for Review
  - `Space` : Pause / Resume Timer

---

## 📝 Supported Quiz Formats (Skewer)

Quiz Collector natively parses notes structured in the **Skewer** format:

### 1. Multiple Choice Questions (MCQ)
```markdown
TYPE: MCQ
QUESTION: In web design, what is the recommended approach for typography to ensure readability and clarity?
A. Using a variety of fonts to make the text stand out
B. Opting for serif fonts for their historical significance and readability
C. Choosing sans-serif fonts for modern aesthetics
D. Using the largest font size possible for all text
ANSWER: B
EXPLANATION: Serif fonts are often chosen for their historical significance and readability.
---
```

### 2. Multiple Select Questions (MSQ)
```markdown
TYPE: MSQ
QUESTION: Which of the following elements belong in a responsive web design system?
A. Fluid grid layouts
B. Fixed pixel tables
C. Flexible images and media
D. CSS media queries
ANSWER: A,C,D
EXPLANATION: Fluid grids, flexible media, and media queries form the core pillars of responsive web design.
---
```

### 3. Type-In-The-Answer (TITA)
```markdown
TYPE: TITA
QUESTION: What is the HTTP status code for 'Not Found'?
ANSWER: 404
EXPLANATION: 404 Not Found indicates that the origin server did not find a current representation for the target resource.
---
```

### 4. Reading Comprehension / Question Sets
```markdown
TYPE: QUESTIONSET
PARA: The human brain has approximately 86 billion neurons, each connected to thousands of other neurons via synapses.

QUESTION: What is the estimated number of neurons in the human brain?
A. 10 billion
B. 86 billion
C. 500 million
D. 1 trillion
ANSWER: B

QUESTION: What structures connect neurons to each other?
A. Dendrite bones
B. Synapses
C. Axon cables
D. Glial walls
ANSWER: B
---
```

---

## ⚙️ Plugin Settings

In Obsidian **Settings > Quiz Collector**:
- **Time per question (seconds)**: Configure time allocated per question.
- **Enable timer by default**: Toggle countdown timer on or off.
- **Low time warning (seconds)**: Set remaining threshold for warning pulse animation.
- **Auto-advance on selection**: Automatically move to the next question upon answering MCQ questions.
- **Confirmation before submit**: Toggle submit status dialog.

---

## 🛠️ Development & Building

```bash
cd collect-quiz-obsidian-plugin
npm install
npm run build
```

This compiles TypeScript and bundles React components with `esbuild` into `main.js` and `styles.css`.
