# csPDCA Program Detailed Design Document (Final Version v1.5 - English)

## 0. Development Environment Prerequisites (For SQLite Usage)

This program uses SQLite as its local database, and installing the `sqlite3` npm package requires a native module build process. To ensure a smooth development environment setup, please verify and prepare the following:

1.  **Node.js LTS Version Installation and PATH Verification:**
    *   Download and install the latest LTS (Long Term Support) version of Node.js from the [official website](https://nodejs.org/).
    *   After installation, run `node -v` and `npm -v` commands in the Command Prompt (CMD) or PowerShell to confirm that the installation and PATH environment variable registration are successful.
2.  **Visual Studio Build Tools Installation Check (Workload: "Desktop development with C++"):**
    *   These are tools for compiling C++ code on Windows.
    *   Download the "Build Tools for Visual Studio" installer from the [Visual Studio downloads page](https://visualstudio.microsoft.com/downloads/).
    *   In the installer's "Workloads" tab, select and install the **"Desktop development with C++"** workload.
    *   Ensure that necessary individual components (latest MSVC build tools, Windows SDK) are included.
    *   If Visual Studio (Community, Professional, Enterprise) is already installed and includes this workload, a separate installation may not be necessary.
3.  **Python 3.x Installation and PATH Verification:**
    *   `node-gyp`, the Node.js native module build system, uses Python.
    *   Download the latest Python 3.x version from the [Python official website](https://www.python.org/downloads/windows/).
    *   During installation, be sure to check the **"Add Python to PATH"** (or similar) option.
    *   After installation, run `python --version` (or `python -V`) in CMD or PowerShell to confirm installation and PATH registration.

Preparing these items will minimize build-related issues when running `npm install sqlite3`. If problems persist, consider using `npm config set msvs_version [version]` (e.g., `npm config set msvs_version 2019`) or the `windows-build-tools` package.

## 1. Overview

This document details the design of **'csPDCA'**, a Windows PC program for daily task management based on the PDCA (Plan-Do-Check-Act) cycle. Users can register their tasks (Plan) and effectively manage their execution (Do), review (Check), and improvement (Act) processes. Data is stored in a local DB file, and weekly task status can be exported to an Excel file for reporting. This program prioritizes offline usability, and all features are implemented using freely available solutions.

## 2. Objectives

*   Support easy PDCA task management through a user-friendly interface.
*   Provide intuitive task scheduling 확인 and management via a calendar view (including detailed interactions, move, and copy features).
*   Offer monthly/weekly planning and tracking features (displayed in a compact card format).
*   Visualize task statuses (Plan, Delayed, Canceled, Completed).
*   Enable automatic generation of weekly PDCA reports and Excel export functionality.
*   Ensure data privacy and offline usability through local data storage.
*   Provide a simplified technology stack and build/execution environment.

## 3. Technology Stack

*   **Framework:** Electron
*   **UI Library:** React (for renderer process UI)
*   **Calendar:** FullCalendar
*   **Database:** SQLite (local file DB)
*   **Language:** JavaScript (ES6+), HTML, CSS
*   **Styling:** **Custom CSS styles defined directly in HTML files** (minimizing or avoiding separate CSS-in-JS libraries or CSS Modules). Custom styling 참고ing Material Design principles.
*   **Font:** **Google Fonts for Noto Sans KR** (loaded from CDN via HTML `<link>` tag).
*   **State Management:** React Context API or Zustand/Redux (chosen based on application complexity).
*   **Excel Export Library:** `xlsx` or `exceljs`
*   **Packaging:** electron-builder

## 4. System Architecture

### 4.1. Process Structure

*   **Main Process (Electron Main Process - `main.js` or `index.js`):**
    *   Application lifecycle management (`app` module).
    *   Window creation and management (`BrowserWindow` module). **Loads HTML files directly** (`win.loadFile('index.html')`).
    *   Inter-Process Communication (IPC) with the renderer process (`ipcMain` module).
    *   File system access (DB file, Excel file read/write - `fs` module).
    *   Native OS feature access (e.g., `dialog` module).
    *   Background tasks (DB query execution, Excel file generation logic).
    *   **User session management (login state persistence logic).**
*   **Renderer Process (Electron Renderer Process - HTML/CSS/JS, React App):**
    *   UI rendering and user interaction handling.
    *   Application logic execution.
    *   Requests features from the main process via IPC (`ipcRenderer` module).
    *   **The login/registration screen can be a standalone HTML file (`login.html`), switching to the main application screen (`index.html`) upon success.**

### 4.2. Major Module Composition (Component Breakdown)

**`src/`** (or project root)
├── **`main.js`** (or `index.js` - Electron Main Process entry point)
├── **`preload.js`** (Bridge script for renderer process to use Node.js APIs)
├── **`database.js`** (SQLite DB setup and query helper functions module, used by main process)
├── **`excelExporter.js`** (Excel generation logic module, used by main process)
├── **`auth.js`** (User authentication, registration, session management logic module, used by main process)
├── **`html/`** (or `public/` or root)
│   ├── `index.html` (HTML for main application rendering, React app mount point)
│   ├── `login.html` (**Standalone HTML for login/registration**)
│   └── `styles.css` (**Custom CSS file containing global and component styles for the application**)
├── **`renderer/`** (React App related source)
│   ├── `App.js` (Application root component, routing setup - Calendar View/Report View switching)
│   ├── `index.js` (Renderer process React app entry point, loaded by `html/index.html`)
│   ├── **`components/`** (Reusable React UI components)
│   │   ├── `Button.js`
│   │   ├── `Modal.js`
│   │   ├── `Input.js`
│   │   ├── `DatePicker.js` (External library or custom implementation)
│   │   ├── `CalendarView.js` (FullCalendar wrapper, includes detailed interaction logic)
│   │   ├── `MonthlyPlanCard.js` (Compact monthly plan card)
│   │   ├── `WeeklyPlanCard.js` (Compact weekly plan card)
│   │   ├── `TaskEditModalContent.js` (**Internal UI for task edit modal, applying compact layout**)
│   │   └── ... (Other common components)
│   ├── **`pages/`** (Major screen-level components)
│   │   ├── `CalendarPage.js` (Page containing the calendar view and related UI)
│   │   └── `ReportPage.js` (Page containing the report view and related UI)
│   ├── **`contexts/`**
│   │   ├── `AuthContext.js` (Renderer-side login state, user information sharing)
│   │   └── `TaskContext.js` (Task data, calendar event sharing and management)
│   ├── **`hooks/`**
│   │   ├── `useAuth.js`
│   │   └── `useTasks.js`
│   ├── **`services/`** (IPC communication wrappers - using `ipcRenderer.invoke` or `ipcRenderer.send/on`)
│   │   ├── `authService.js` (Renderer calls `auth.js` functions in main process)
│   │   ├── `taskService.js` (Renderer calls DB CRUD functions in main process)
│   │   └── `reportService.js`
│   └── **`utils/`**
│       ├── `dateUtils.js`
│       ├── `constants.js`
│       ├── `logger.js`
│       └── `idGenerator.js` (UUID generation)
└── `package.json` (**Electron direct execution script setup**)

## 5. Data Model (SQLite)

1.  **Users**
    *   `id` (INTEGER, PRIMARY KEY, AUTOINCREMENT)
    *   `username` (TEXT, UNIQUE, NOT NULL)
    *   `password_hash` (TEXT, NOT NULL)
    *   `name` (TEXT, NOT NULL)
    *   `email` (TEXT, UNIQUE, NOT NULL)
    *   `security_question` (TEXT, NOT NULL)
    *   `security_answer_hash` (TEXT, NOT NULL)
    *   `created_at` (TEXT, DEFAULT CURRENT_TIMESTAMP)
2.  **Tasks (Represents the 'Plan')**
    *   `id` (INTEGER, PRIMARY KEY, AUTOINCREMENT)
    *   `uuid` (TEXT, UNIQUE, NOT NULL) - Client-side unique ID, FullCalendar event ID
    *   `user_id` (INTEGER, NOT NULL, FOREIGN KEY `Users(id)`)
    *   `title` (TEXT, NOT NULL) - Task name (Plan content)
    *   `do_text` (TEXT) - Do (D) content
    *   `check_text` (TEXT) - Check (C) content
    *   `act_text` (TEXT) - Act (A) content
    *   `status` (TEXT, NOT NULL, CHECK(`status` IN ('PLAN', 'DELAYED', 'CANCELED', 'COMPLETED')))
    *   `start_datetime` (TEXT, NOT NULL)
    *   `end_datetime` (TEXT, NOT NULL)
    *   `is_all_day` (INTEGER, NOT NULL, DEFAULT 0)
    *   `is_internal_work` (INTEGER, NOT NULL, DEFAULT 1)
    *   `external_location` (TEXT)
    *   `created_at` (TEXT, DEFAULT CURRENT_TIMESTAMP)
    *   `updated_at` (TEXT, DEFAULT CURRENT_TIMESTAMP)
3.  **MonthlyPlans**
    *   `id` (INTEGER, PRIMARY KEY, AUTOINCREMENT)
    *   `user_id` (INTEGER, NOT NULL, FOREIGN KEY `Users(id)`)
    *   `year_month` (TEXT, NOT NULL) - e.g., 'YYYY-MM'
    *   `plan_content` (TEXT)
    *   `created_at` (TEXT, DEFAULT CURRENT_TIMESTAMP)
    *   `updated_at` (TEXT, DEFAULT CURRENT_TIMESTAMP)
    *   UNIQUE (`user_id`, `year_month`)
4.  **WeeklyPlans**
    *   `id` (INTEGER, PRIMARY KEY, AUTOINCREMENT)
    *   `user_id` (INTEGER, NOT NULL, FOREIGN KEY `Users(id)`)
    *   `year_week` (TEXT, NOT NULL) - e.g., 'YYYY-WW' (ISO week)
    *   `plan_content` (TEXT)
    *   `created_at` (TEXT, DEFAULT CURRENT_TIMESTAMP)
    *   `updated_at` (TEXT, DEFAULT CURRENT_TIMESTAMP)
    *   UNIQUE (`user_id`, `year_week`)

## 6. Functional Design

### 6.1. Common
*   **Program Name:** **csPDCA**
*   **Log Output:** Console logs during development will be in English.
*   **Comments and UI Language:** Code comments will be in English; program UI will be in Korean.
*   **UI Design Theme:** Custom CSS styling, referencing Material Design principles.
*   **Global UI Font:** Noto Sans KR (loaded via Google Fonts CDN).
*   **Page View Structure:** **The Calendar Page and Report Page are independent page views.** Tabs or buttons at the top of the application will allow switching between these pages (using React Router or simple state management).

### 6.2. Account Management (`login.html` and Main Process `auth.js`)

1.  **Login/Registration Screen (`login.html`):**
    *   **Created as a standalone HTML file with embedded CSS and JavaScript.** The Electron `BrowserWindow` loads this file directly.
    *   UI: Program name (**csPDCA**), ID input field, PW input field, Login button, "Create Account" link, "Forgot Password?" link. Registration and password recovery forms can be toggled within the same page or displayed in separate sections.
    *   **Login:**
        *   Attempt login on Login button click or **Enter key press** after entering ID and PW.
        *   Request authentication from the main process via `ipcRenderer.invoke('login', { username, password })`.
        *   Main process `auth.js` handles DB lookup and authentication.
        *   On success, the main process returns a success response with user information and **starts a user session (e.g., stores user ID in a main process variable, or generates a simple token stored in local storage - security considerations apply).** Then, the window content changes to the main application screen (`index.html`) via `win.loadFile('index.html')`.
        *   On failure, display an error message on `login.html`.
    *   **Account Registration:**
        *   Input fields: ID, PW, PW Confirmation, Name, Email, Security Question selection, Security Question Answer.
        *   Request registration from the main process via `ipcRenderer.invoke('register', userData)`.
        *   On success, display "Registration Complete" message and switch to the login form.
    *   **Password Recovery:** (Maintain existing security question/answer method)
        *   Communicate with the main process stepwise via `ipcRenderer.invoke`.
    *   **Session Management (Login State Persistence):**
        *   **Users remain logged in even after closing and reopening the application.**
            *   On main process startup, check for saved session information (e.g., an encrypted user identifier stored locally using a library like `electron-store`).
            *   If valid session information exists, skip `login.html`, load `index.html` directly, and initialize the application with the user's information.
        *   **The session persists until the user explicitly clicks the Logout button.**
            *   On logout, the main process deletes session information and changes window content to `login.html`.
        *   **The application maintains a secure authentication state.** (Actual authentication and session handling occur only in the main process; the renderer receives only results via IPC).

### 6.3. Main Page (Calendar Page - `CalendarPage.js`, `index.html`)

1.  **Calendar View (`CalendarView.js`)**
    *   Uses FullCalendar library (configuration similar to previous design).
    *   **Detailed Task Interactions:**
        *   **Single-click on a task (event) (`eventClick`):**
            *   The clicked task (event) is visually selected (e.g., border highlight).
            *   **Does not open the edit modal.** Instead, displays basic task information (name, time, status) in a separate info panel near the calendar or as a tooltip (utilizing `extendedProps` of the event object).
            *   **Clicking on an empty space (`dateClick` or FullCalendar's background click event):**
                *   Acquires the clicked date or time information (preparatory step for new task creation).
                *   If a task is selected, deselect it.
        *   **Double-click on a task (event) (`eventDblClick`):**
            *   **Opens the edit modal (`TaskEditModal.js`)** for modifying the task.
            *   Loads detailed information of the existing task.
        *   **Double-click on an empty date/day (`dateDblClick` - may require custom logic to detect double-click on `dateClick` or a separate event listener):**
            *   **Opens the new task creation modal (`NewTaskModal.js`)** for that time/date.
            *   Sets the double-clicked date/time as the default start time for the new task.
        *   **Mouse selection and drag on an empty calendar area in Week/Day view (`select` callback):**
            *   **Opens the new task creation modal (`NewTaskModal.js`)** for the selected time range.
            *   Sets the selected start and end times as default for the new task.
        *   **Drag an existing task while holding the Ctrl key (`eventDragStart`, `eventDrop`):**
            *   Duplicates the task at the drop location. (Maintain existing logic: check `jsEvent.ctrlKey` or `jsEvent.metaKey`, generate new UUID, set status to 'PLAN', initialize DCA, etc.).
    *   Month Calendar View: Displays "+N more" if tasks per day exceed 4.
    *   Color-coding and emoji indicators by task status.

2.  **Monthly/Weekly Plan Display (`MonthlyPlanCard.js`, `WeeklyPlanCard.js`)**
    *   Displayed in a **compact card format** at the top of the calendar view or in a sidebar.
    *   **Clearly indicates the month/week of the plan, e.g., "October 2023 Monthly Plan," "2023 Week 42 Weekly Plan."**
    *   **Displays the content if a plan exists for the month/week currently shown in the calendar view.**
    *   **If no plan exists, displays an input form (text area and save button) directly within the card.** Upon saving, the card switches to display mode.
    *   Content can be edited by clicking the card or an edit icon.

### 6.4. New Task Registration (`NewTaskModal.js` within `NewTaskForm.js`)
    (Maintain existing design: task name, date/time, all-day, internal/external work, external destination, etc.)

### 6.5. Task Edit Modal (`TaskEditModal.js` within `TaskEditModalContent.js`)
    *   (Maintain existing design: DCA, status, date/time, internal/external work info, etc.)
    *   **UI Layout:** **All items are arranged compactly.**
        *   Example: "Task Name" and "Status" on one line, "Start Datetime" and "End Datetime" on another.
        *   Align labels and input fields horizontally to maximize space utilization.
        *   Prevent the modal from becoming excessively tall, ensuring bottom buttons (Save/Delete/Cancel) are visible without scrolling past the monitor screen. Apply internal modal scroll if necessary.
        *   Utilize Material Design input field styles, card components, etc., for a visually organized feel.

### 6.6. Report Page (`ReportPage.js`)
    (Maintain existing design: display monthly/weekly plans, current week PDCA table, next week Plan table, Excel export, visualization view)
    *   A "View Calendar" button at the top of the page allows navigation to the Calendar Page.
    *   Table labels and Excel export format follow previous definitions.

## 7. UI/UX Considerations
    (Maintain existing design: Reference Material Design, Noto Sans KR, move/copy feedback, consistency, intuitiveness, responsiveness, accessibility, error handling)
    *   **Click/Double-Click Differentiation:** Visual feedback and response time are crucial for users to clearly distinguish between single and double clicks and ensure intended actions.

## 8. Non-Functional Requirements
    (Maintain existing design: performance, security, stability, maintainability, scalability)

## 9. Additional Enhancements and Considerations (Suggestions)
    (Maintain existing design: data backup/recovery, recurring tasks, theme support, shortcuts, settings page, handling lost security questions)

## 10. Deployment and Build

*   Use `electron-builder` to generate Windows installation files (`.exe`) or portable versions.
*   **`package.json` Script Setup:**
    *   **Configure to run Electron directly without a separate React development server.**
    *   Development: `electron .` (or `electron main.js`) script to run the Electron app directly. Consider manual restart or tools like `electron-reload` for React code changes.
    *   Build script: Use `electron-builder` command.
    ```json
    "scripts": {
      "start": "electron .",
      "pack": "electron-builder --dir",
      "dist": "electron-builder"
    }
    ```
*   Configure the main process to load HTML files directly, e.g., `win.loadFile(path.join(__dirname, 'html/index.html'))`.

