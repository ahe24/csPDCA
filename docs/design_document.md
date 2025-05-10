# csPDCA Application Design Document

## 1. Introduction

### 1.1 Purpose
This document provides a comprehensive design specification for the csPDCA application, a Windows PC program for daily task management based on the PDCA (Plan-Do-Check-Act) cycle. It serves as a blueprint for implementation, detailing the architecture, database schema, UI components, and functionality.

### 1.2 Scope
The csPDCA application allows users to register tasks (Plan) and manage their execution (Do), review (Check), and improvement (Act) processes. Data is stored in a local SQLite database, and weekly task status can be exported to Excel for reporting. The program prioritizes offline usability, and all features are implemented using freely available solutions.

### 1.3 Technology Stack
- **Framework**: Electron
- **UI Library**: React (for renderer process UI)
- **Calendar**: FullCalendar
- **Database**: SQLite (local file DB)
- **Language**: JavaScript (ES6+), HTML, CSS
- **Styling**: Custom CSS styles defined directly in HTML files
- **Font**: Google Fonts for Noto Sans KR (loaded from CDN via HTML `<link>` tag)
- **State Management**: React Context API
- **Excel Export Library**: ExcelJS
- **Packaging**: electron-builder

## 2. Architecture

### 2.1 Overview
The application follows an Electron architecture with two main processes:

1. **Main Process** (Electron Main Process - `main.js`):
   - Application lifecycle management
   - Window creation and management
   - Inter-Process Communication (IPC) with the renderer process
   - File system access (DB file, Excel file read/write)
   - Native OS feature access (e.g., dialog module)
   - Background tasks (DB query execution, Excel file generation logic)
   - User session management

2. **Renderer Process** (Electron Renderer Process - HTML/CSS/JS, React App):
   - UI rendering and user interaction handling
   - Application logic execution
   - Requests features from the main process via IPC

### 2.2 Project Structure
```
src/
├── main.js (Electron Main Process entry point)
├── preload.js (Bridge script for renderer process)
├── database.js (SQLite DB setup and query helper functions)
├── excelExporter.js (Excel generation logic module)
├── auth.js (User authentication, registration, session management)
├── html/
│   ├── index.html (HTML for main application rendering)
│   ├── login.html (Standalone HTML for login/registration)
│   └── styles.css (Custom CSS file containing global and component styles)
├── renderer/
│   ├── App.js (Application root component, routing setup)
│   ├── index.js (Renderer process React app entry point)
│   ├── components/
│   │   ├── Button.js
│   │   ├── Modal.js
│   │   ├── Input.js
│   │   ├── DatePicker.js
│   │   ├── CalendarView.js (FullCalendar wrapper)
│   │   ├── MonthlyPlanCard.js (Compact monthly plan card)
│   │   ├── WeeklyPlanCard.js (Compact weekly plan card)
│   │   ├── TaskEditModalContent.js (Internal UI for task edit modal)
│   │   └── ... (Other common components)
│   ├── pages/
│   │   ├── CalendarPage.js (Page containing the calendar view)
│   │   └── ReportPage.js (Page containing the report view)
│   ├── contexts/
│   │   ├── AuthContext.js (Renderer-side login state)
│   │   └── TaskContext.js (Task data, calendar event sharing)
│   ├── hooks/
│   │   ├── useAuth.js
│   │   └── useTasks.js
│   ├── services/
│   │   ├── authService.js (IPC communication wrappers)
│   │   ├── taskService.js (IPC communication wrappers)
│   │   └── reportService.js (IPC communication wrappers)
│   └── utils/
│       ├── dateUtils.js
│       ├── constants.js
│       ├── logger.js
│       └── idGenerator.js (UUID generation)
└── package.json (Electron direct execution script setup)
```

## 3. Database Design

### 3.1 SQLite Database Schema

#### 3.1.1 Users Table
```sql
CREATE TABLE IF NOT EXISTS Users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    security_question TEXT NOT NULL,
    security_answer_hash TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

#### 3.1.2 Tasks Table (Represents the 'Plan')
```sql
CREATE TABLE IF NOT EXISTS Tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid TEXT UNIQUE NOT NULL,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    do_text TEXT,
    check_text TEXT,
    act_text TEXT,
    status TEXT NOT NULL CHECK(status IN ('PLAN', 'DELAYED', 'CANCELED', 'COMPLETED')),
    start_datetime TEXT NOT NULL,
    end_datetime TEXT NOT NULL,
    is_all_day INTEGER NOT NULL DEFAULT 0,
    is_internal_work INTEGER NOT NULL DEFAULT 1,
    external_location TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(id)
);
```

#### 3.1.3 MonthlyPlans Table
```sql
CREATE TABLE IF NOT EXISTS MonthlyPlans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    year_month TEXT NOT NULL,
    plan_content TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, year_month),
    FOREIGN KEY (user_id) REFERENCES Users(id)
);
```

#### 3.1.4 WeeklyPlans Table
```sql
CREATE TABLE IF NOT EXISTS WeeklyPlans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    year_week TEXT NOT NULL,
    plan_content TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, year_week),
    FOREIGN KEY (user_id) REFERENCES Users(id)
);
```

### 3.2 Database Access Layer
The application will use a dedicated `database.js` module to handle all database operations. This module will provide functions for:

- Database initialization and connection
- CRUD operations for all tables
- Specialized queries for reporting and statistics
- Transaction support for multi-step operations

## 4. User Interface Design

### 4.1 Login/Registration Screen
- Simple form with username and password fields
- Registration form with fields for all required user information
- Password recovery option using security question
- Error handling and validation

### 4.2 Main Application Interface

#### 4.2.1 Calendar View (Main Interface)
- FullCalendar integration with month, week, and day views
- Task creation, editing, moving, and copying via drag-and-drop
- Task status visualization using color coding:
  - PLAN: Light blue
  - COMPLETED: Light green
  - DELAYED: Light amber
  - CANCELED: Light red
- Double-click to create new tasks
- Task details popup on click

#### 4.2.2 Monthly Planning Card
- Compact card display showing monthly plan
- Text area for plan content
- Automatic calculation of task completion rates
- Display of current month's statistics

#### 4.2.3 Weekly Planning Card
- Compact card display showing weekly plan
- Text area for plan content
- Automatic calculation of task completion rates
- Display of current week's statistics

#### 4.2.4 Task Edit Modal
- Form for editing task details
- Fields for title, start/end dates, all-day option
- PDCA fields: Do, Check, Act text areas
- Status selection dropdown
- Location type (internal/external) with external location field
- Save, delete, and cancel buttons

#### 4.2.5 Report Page
- Weekly PDCA report generation
- Excel export functionality
- Task status visualization and statistics
- Date range selection for report generation

### 4.3 UI Components
- Custom Button component with various styles
- Modal component for dialogs and forms
- Input component with validation
- DatePicker component for date selection
- Select component for dropdowns
- Card component for compact displays
- Alert component for notifications

### 4.4 Styling
- Material Design-inspired custom styling
- Korean language UI with English code comments
- Responsive layout with intuitive controls
- Noto Sans KR font for optimal Korean text display

## 5. Feature Specifications

### 5.1 User Authentication
- Secure login with password hashing
- User registration with validation
- Password recovery via security question
- Session persistence using secure storage
- Automatic login on application restart

### 5.2 Calendar Management
- FullCalendar integration with all standard calendar features
- Support for month, week, and day views
- Event creation, editing, moving, and copying
- Drag-and-drop functionality
- Double-click to create new tasks
- Task status visualization

### 5.3 Task Management
- PDCA cycle implementation (Plan-Do-Check-Act)
- Task status tracking and updates
- All-day event support
- Internal vs. external work differentiation
- Location tracking for external work
- Task filtering and search

### 5.4 Planning Features
- Monthly planning with text content
- Weekly planning with text content
- Automatic calculation of task completion rates
- Plan vs. actual comparison

### 5.5 Reporting
- Weekly PDCA report generation
- Excel export with multiple sheets:
  - Sheet 1: Monthly Plan and Statistics
  - Sheet 2: Weekly Plan and Statistics
  - Sheet 3: This Week's Tasks
  - Sheet 4: Next Week's Tasks (if available)
- Task status visualization and statistics
- Customizable date range for reports

## 6. Excel Export Specification

### 6.1 Excel Report Structure
The Excel report will be divided into multiple sheets:

#### 6.1.1 Sheet 1: Monthly and Weekly Plans/Stats
- Monthly plan content
- Monthly statistics (completion rate, task counts)
- Weekly plan content
- Weekly statistics (completion rate, task counts)

#### 6.1.2 Sheet 2: This Week's Tasks
- Detailed list of all tasks for the current week
- Columns:
  - Date
  - Task Title
  - Start Time
  - Duration
  - Location
  - Status
  - Do (실행)
  - Check (점검)
  - Act (개선)
- Color-coding based on task status
- Statistics section showing task counts and completion rates
- Visual representation of task statistics

#### 6.1.3 Sheet 3: Next Week's Tasks
- List of planned tasks for the next week
- Columns:
  - Date
  - Task Title
  - Start Time
  - Duration
  - Location
  - Status
- Color-coding based on task status
- Statistics section showing planned task counts

### 6.2 Excel Styling
- Consistent styling across all sheets
- Title and header formatting
- Cell borders and alignment
- Color-coding for task status:
  - COMPLETED: Light green
  - DELAYED: Light amber
  - CANCELED: Light red
  - PLAN: Light blue
- Auto-filtering capability for data analysis
- Proper row heights for all content
- Status legend for color reference

## 7. Implementation Guidelines

### 7.1 Main Process Implementation
- Use `electron` module for application lifecycle and window management
- Implement database operations in `database.js`
- Create Excel export functionality in `excelExporter.js`
- Handle authentication in `auth.js`
- Set up IPC handlers for renderer process communication

### 7.2 Renderer Process Implementation
- Use React for UI components
- Implement Context API for state management
- Create service modules for IPC communication
- Use FullCalendar for calendar view
- Implement form validation for user inputs
- Create utility functions for common operations

### 7.3 Data Flow
1. User interacts with UI in renderer process
2. Renderer process sends request to main process via IPC
3. Main process performs database operations or other tasks
4. Main process sends response back to renderer process
5. Renderer process updates UI based on response

### 7.4 Error Handling
- Implement try-catch blocks for all database operations
- Provide user-friendly error messages
- Log errors for debugging
- Handle network and file system errors gracefully

## 8. Testing Strategy

### 8.1 Unit Testing
- Test database operations
- Test utility functions
- Test Excel export functionality

### 8.2 Integration Testing
- Test IPC communication
- Test data flow between processes

### 8.3 UI Testing
- Test form validation
- Test calendar interactions
- Test modal dialogs

### 8.4 End-to-End Testing
- Test complete user workflows
- Test application startup and shutdown
- Test data persistence

## 9. Deployment

### 9.1 Packaging
- Use electron-builder for packaging
- Create installers for Windows
- Include all necessary dependencies

### 9.2 Updates
- Implement auto-update functionality if needed
- Provide update notification to users

## 10. Future Enhancements

### 10.1 Potential Features
- Data backup and restore
- Cloud synchronization
- Mobile companion app
- Advanced reporting and analytics
- Team collaboration features

### 10.2 Performance Improvements
- Database optimization
- UI rendering optimization
- Memory usage optimization

## 11. Conclusion
This design document provides a comprehensive blueprint for implementing the csPDCA application. By following these specifications, developers can create a robust, user-friendly application that meets all the requirements while minimizing iterations and rework.
