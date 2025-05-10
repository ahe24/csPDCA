알겠습니다. 프로그램 이름을 'myPDCA'에서 'csPDCA'로 변경하여 전체 상세 설계 문서를 업데이트하겠습니다. 모든 부분에서 프로그램명이 일관되게 수정될 것입니다.

---

# csPDCA 프로그램 상세 설계 문서 (최종본 v1.5 - 프로그램명 변경)

## 0. 개발 환경 사전 준비 사항 (SQLite 사용을 위함)

본 프로그램은 로컬 데이터베이스로 SQLite를 사용하며, `sqlite3` npm 패키지 설치 시 네이티브 모듈 빌드 과정이 필요합니다. 원활한 개발 환경 구성을 위해 다음 사항을 미리 확인하고 준비해주십시오.

1.  **Node.js LTS 버전 설치 및 PATH 확인:**
    *   최신 LTS (Long Term Support) 버전의 Node.js를 [공식 웹사이트](https://nodejs.org/)에서 다운로드하여 설치합니다.
    *   설치 후 명령 프롬프트(CMD) 또는 PowerShell에서 `node -v` 및 `npm -v` 명령어를 실행하여 설치 및 PATH 환경 변수 등록이 정상적으로 되었는지 확인합니다.
2.  **Visual Studio Build Tools 설치 여부 확인 (워크로드: "C++를 사용한 데스크톱 개발"):**
    *   Windows에서 C++ 코드를 컴파일하기 위한 도구입니다.
    *   [Visual Studio 다운로드 페이지](https://visualstudio.microsoft.com/ko/downloads/)에서 "Build Tools for Visual Studio"를 다운로드하여 설치 관리자를 실행합니다.
    *   설치 관리자의 "워크로드" 탭에서 **"C++를 사용한 데스크톱 개발"** 워크로드를 선택하여 설치합니다.
    *   필요한 개별 구성 요소(최신 MSVC 빌드 도구, Windows SDK)가 포함되어 있는지 확인합니다.
    *   이미 Visual Studio (Community, Professional, Enterprise)가 설치되어 있고 해당 워크로드가 포함되어 있다면 별도 설치는 필요하지 않을 수 있습니다.
3.  **Python 3.x 설치 및 PATH 확인:**
    *   Node.js 네이티브 모듈 빌드 시스템인 `node-gyp`는 Python을 사용합니다.
    *   [Python 공식 웹사이트](https://www.python.org/downloads/windows/)에서 최신 Python 3.x 버전을 다운로드합니다.
    *   설치 시 **"Add Python to PATH"** (또는 유사한 옵션)를 반드시 체크합니다.
    *   설치 후 명령 프롬프트(CMD) 또는 PowerShell에서 `python --version` (또는 `python -V`) 명령어를 실행하여 설치 및 PATH 등록을 확인합니다.

위 사항들이 준비되면 `npm install sqlite3` 명령어 실행 시 발생할 수 있는 빌드 관련 문제를 최소화할 수 있습니다. 문제가 지속될 경우 `npm config set msvs_version [버전]` (예: `npm config set msvs_version 2019`) 또는 `windows-build-tools` 패키지 사용을 고려해볼 수 있습니다.

## 1. 개요

본 문서는 PDCA(Plan-Do-Check-Act) 사이클 기반의 일일 업무 관리 윈도우 PC 프로그램 **'csPDCA'** 의 상세 설계를 기술한다. 사용자는 개인의 업무(Plan)를 등록하고, 이에 대한 실행(Do), 점검(Check), 개선(Act) 과정을 효과적으로 관리할 수 있다. 데이터는 로컬 DB 파일에 저장되며, 주 단위 업무 현황을 Excel 파일로 내보내기 하여 보고할 수 있는 기능을 제공한다. 본 프로그램은 오프라인 환경에서의 사용을 우선하며, 모든 기능은 무료로 사용 가능한 솔루션을 기반으로 구현된다.

## 2. 목표

*   사용자 친화적인 인터페이스를 통한 손쉬운 PDCA 업무 관리 지원
*   캘린더 뷰를 통한 직관적인 업무 일정 확인 및 관리 (상세한 상호작용, 이동 및 복제 기능 포함)
*   월간/주간 계획 수립 및 추적 기능 제공 (컴팩트한 카드 형태 표시)
*   업무 상태(계획, 지연, 취소, 완료) 시각화
*   주간 PDCA 보고서 자동 생성 및 Excel 내보내기 기능 제공
*   로컬 데이터 저장을 통한 개인 정보 보호 및 오프라인 사용 지원
*   간소화된 기술 스택 및 빌드/실행 환경 제공

## 3. 기술 스택

*   **프레임워크:** Electron
*   **UI 라이브러리:** React (렌더러 프로세스 UI 구성)
*   **캘린더:** FullCalendar
*   **데이터베이스:** SQLite (로컬 파일 DB)
*   **언어:** JavaScript (ES6+), HTML, CSS
*   **스타일링:** **HTML 파일에 직접 정의된 자체 CSS 스타일** (별도 CSS-in-JS 라이브러리나 CSS Modules 최소화 또는 미사용). Material Design 원칙을 참고한 자체 스타일링.
*   **폰트:** **Google Fonts for Noto Sans KR** (HTML `<link>` 태그로 CDN에서 로드).
*   **상태 관리:** React Context API 또는 Zustand/Redux (선택, 애플리케이션 복잡도에 따라 결정).
*   **Excel 내보내기 라이브러리:** `xlsx` 또는 `exceljs`
*   **패키징:** electron-builder

## 4. 시스템 아키텍처

### 4.1. 프로세스 구조

*   **메인 프로세스 (Electron Main Process - `main.js` 또는 `index.js`):**
    *   애플리케이션 생명주기 관리 (`app` 모듈).
    *   윈도우 생성 및 관리 (`BrowserWindow` 모듈). **HTML 파일을 직접 로드** (`win.loadFile('index.html')`).
    *   IPC(Inter-Process Communication)를 통한 렌더러 프로세스와의 통신 (`ipcMain` 모듈).
    *   파일 시스템 접근 (DB 파일, Excel 파일 저장/읽기 - `fs` 모듈).
    *   네이티브 OS 기능 접근 (예: `dialog` 모듈).
    *   백그라운드 작업 (DB 쿼리 실행, Excel 파일 생성 로직).
    *   **사용자 세션 관리 (로그인 상태 유지 로직).**
*   **렌더러 프로세스 (Electron Renderer Process - HTML/CSS/JS, React App):**
    *   UI 렌더링 및 사용자 인터랙션 처리.
    *   애플리케이션 로직 수행.
    *   IPC를 통해 메인 프로세스에 기능 요청 (`ipcRenderer` 모듈).
    *   **로그인/등록 화면은 독립된 HTML 파일 (`login.html`)로 구성 가능하며, 성공 시 메인 애플리케이션 화면(`index.html`)으로 전환.**

### 4.2. 주요 모듈 구성 (컴포넌트 세분화)

**`src/`** (또는 프로젝트 루트)
├── **`main.js`** (또는 `index.js` - Electron Main Process 진입점)
├── **`preload.js`** (렌더러 프로세스에서 Node.js API 사용을 위한 브릿지 스크립트)
├── **`database.js`** (SQLite DB 설정 및 쿼리 헬퍼 함수 모듈, 메인 프로세스에서 사용)
├── **`excelExporter.js`** (Excel 생성 로직 모듈, 메인 프로세스에서 사용)
├── **`auth.js`** (사용자 인증, 등록, 세션 관리 로직 모듈, 메인 프로세스에서 사용)
├── **`html/`** (또는 `public/` 또는 루트)
│   ├── `index.html` (메인 애플리케이션 렌더링을 위한 HTML, React 앱 마운트 지점)
│   ├── `login.html` (**로그인/등록을 위한 독립형 HTML**)
│   └── `styles.css` (**애플리케이션 전역 및 컴포넌트 스타일 포함하는 자체 CSS 파일**)
├── **`renderer/`** (React App 관련 소스)
│   ├── `App.js` (애플리케이션 루트 컴포넌트, 라우팅 설정 - 캘린더 뷰/보고서 뷰 전환)
│   ├── `index.js` (렌더러 프로세스 React 앱 진입점, `html/index.html`에서 로드)
│   ├── **`components/`** (재사용 가능한 React UI 컴포넌트)
│   │   ├── `Button.js`
│   │   ├── `Modal.js`
│   │   ├── `Input.js`
│   │   ├── `DatePicker.js` (외부 라이브러리 또는 직접 구현)
│   │   ├── `CalendarView.js` (FullCalendar 래퍼, 상세 상호작용 로직 포함)
│   │   ├── `MonthlyPlanCard.js` (컴팩트한 월간 계획 카드)
│   │   ├── `WeeklyPlanCard.js` (컴팩트한 주간 계획 카드)
│   │   ├── `TaskEditModalContent.js` (**업무 편집 모달 내부 UI, 컴팩트한 레이아웃 적용**)
│   │   └── ... (기타 공통 컴포넌트)
│   ├── **`pages/`** (주요 화면 단위 컴포넌트)
│   │   ├── `CalendarPage.js` (캘린더 뷰 및 관련 UI 포함하는 페이지)
│   │   └── `ReportPage.js` (보고서 뷰 및 관련 UI 포함하는 페이지)
│   ├── **`contexts/`**
│   │   ├── `AuthContext.js` (렌더러 측 로그인 상태, 사용자 정보 공유)
│   │   └── `TaskContext.js` (업무 데이터, 캘린더 이벤트 공유 및 관리)
│   ├── **`hooks/`**
│   │   ├── `useAuth.js`
│   │   └── `useTasks.js`
│   ├── **`services/`** (IPC 통신 래퍼 - `ipcRenderer.invoke` 또는 `ipcRenderer.send/on` 사용)
│   │   ├── `authService.js` (렌더러에서 메인 프로세스의 `auth.js` 기능 호출)
│   │   ├── `taskService.js` (렌더러에서 메인 프로세스의 DB CRUD 기능 호출)
│   │   └── `reportService.js`
│   └── **`utils/`**
│       ├── `dateUtils.js`
│       ├── `constants.js`
│       ├── `logger.js`
│       └── `idGenerator.js` (UUID 생성)
└── `package.json` (**Electron 직접 실행 스크립트 설정**)

## 5. 데이터 모델 (SQLite)

1.  **Users (사용자 계정)**
    *   `id` (INTEGER, PRIMARY KEY, AUTOINCREMENT)
    *   `username` (TEXT, UNIQUE, NOT NULL)
    *   `password_hash` (TEXT, NOT NULL)
    *   `name` (TEXT, NOT NULL)
    *   `email` (TEXT, UNIQUE, NOT NULL)
    *   `security_question` (TEXT, NOT NULL)
    *   `security_answer_hash` (TEXT, NOT NULL)
    *   `created_at` (TEXT, DEFAULT CURRENT_TIMESTAMP)
2.  **Tasks (업무 - Plan에 해당)**
    *   `id` (INTEGER, PRIMARY KEY, AUTOINCREMENT)
    *   `uuid` (TEXT, UNIQUE, NOT NULL) - 클라이언트 측 고유 ID, FullCalendar 이벤트 ID
    *   `user_id` (INTEGER, NOT NULL, FOREIGN KEY `Users(id)`)
    *   `title` (TEXT, NOT NULL) - 업무명 (Plan 내용)
    *   `do_text` (TEXT) - 실행 (D) 내용
    *   `check_text` (TEXT) - 점검 (C) 내용
    *   `act_text` (TEXT) - 개선 (A) 내용
    *   `status` (TEXT, NOT NULL, CHECK(`status` IN ('PLAN', 'DELAYED', 'CANCELED', 'COMPLETED')))
    *   `start_datetime` (TEXT, NOT NULL)
    *   `end_datetime` (TEXT, NOT NULL)
    *   `is_all_day` (INTEGER, NOT NULL, DEFAULT 0)
    *   `is_internal_work` (INTEGER, NOT NULL, DEFAULT 1)
    *   `external_location` (TEXT)
    *   `created_at` (TEXT, DEFAULT CURRENT_TIMESTAMP)
    *   `updated_at` (TEXT, DEFAULT CURRENT_TIMESTAMP)
3.  **MonthlyPlans (월간 계획)**
    *   `id` (INTEGER, PRIMARY KEY, AUTOINCREMENT)
    *   `user_id` (INTEGER, NOT NULL, FOREIGN KEY `Users(id)`)
    *   `year_month` (TEXT, NOT NULL) - 예: 'YYYY-MM'
    *   `plan_content` (TEXT)
    *   `created_at` (TEXT, DEFAULT CURRENT_TIMESTAMP)
    *   `updated_at` (TEXT, DEFAULT CURRENT_TIMESTAMP)
    *   UNIQUE (`user_id`, `year_month`)
4.  **WeeklyPlans (주간 계획)**
    *   `id` (INTEGER, PRIMARY KEY, AUTOINCREMENT)
    *   `user_id` (INTEGER, NOT NULL, FOREIGN KEY `Users(id)`)
    *   `year_week` (TEXT, NOT NULL) - 예: 'YYYY-WW' (ISO 주차)
    *   `plan_content` (TEXT)
    *   `created_at` (TEXT, DEFAULT CURRENT_TIMESTAMP)
    *   `updated_at` (TEXT, DEFAULT CURRENT_TIMESTAMP)
    *   UNIQUE (`user_id`, `year_week`)

## 6. 기능 상세 설계

### 6.1. 공통
*   **프로그램명:** **csPDCA**
*   **로그 출력:** 개발 중 콘솔 로그는 영문으로 출력.
*   **주석 및 UI 언어:** 코드 주석은 영문, 프로그램 UI는 한글.
*   **UI 디자인 테마:** Material Design 원칙을 참고하여 자체 CSS로 스타일링.
*   **UI 전체 폰트:** Noto Sans KR (Google Fonts CDN 통해 로드).
*   **페이지 뷰 구성:** **캘린더 페이지와 보고서 페이지는 독립된 페이지 뷰 형태.** 애플리케이션 상단에 "캘린더 보기" / "보고서 보기" 탭 또는 버튼을 두어 페이지 간 전환 가능. (React Router 또는 간단한 상태 관리로 뷰 전환)

### 6.2. 계정 관리 (`login.html` 및 메인 프로세스 `auth.js`)

1.  **로그인/등록 화면 (`login.html`):**
    *   **CSS와 JavaScript가 내장된 독립형 HTML 파일로 생성.** Electron `BrowserWindow`가 직접 이 파일을 로드.
    *   UI: 프로그램명(**csPDCA**), ID 입력 필드, PW 입력 필드, 로그인 버튼, "계정 만들기" 링크, "비밀번호를 잊으셨나요?" 링크. 계정 등록 폼 및 비밀번호 찾기 폼은 동일 페이지 내에서 토글 또는 별도 영역으로 표시.
    *   **로그인:**
        *   ID, PW 입력 후 로그인 버튼 클릭 또는 **Enter 키 입력 시 로그인 시도.**
        *   `ipcRenderer.invoke('login', { username, password })` 형태로 메인 프로세스에 인증 요청.
        *   메인 프로세스 `auth.js`에서 DB 조회 및 인증 처리.
        *   성공 시 메인 프로세스는 로그인 성공 응답과 함께 사용자 정보를 반환하고, **사용자 세션 시작 (예: 메인 프로세스 변수에 사용자 ID 저장, 또는 간단한 토큰 생성 후 로컬 스토리지 저장 - 보안 고려 필요).** 이후 메인 애플리케이션 화면(`index.html`)으로 윈도우 내용 변경 (`win.loadFile('index.html')`).
        *   실패 시 `login.html`에 에러 메시지 표시.
    *   **계정 등록:**
        *   입력 필드: ID, PW, PW 확인, 이름, 이메일, 보안 질문 선택, 보안 질문 답변.
        *   `ipcRenderer.invoke('register', userData)` 형태로 메인 프로세스에 등록 요청.
        *   성공 시 "회원가입 완료" 메시지 후 로그인 폼으로 전환.
    *   **비밀번호 찾기:** (기존 보안 질문/답변 방식 유지)
        *   단계별로 `ipcRenderer.invoke`를 통해 메인 프로세스와 통신.
    *   **세션 관리 (로그인 상태 유지):**
        *   **사용자는 애플리케이션을 닫았다가 다시 열어도 로그인 상태를 유지.**
            *   메인 프로세스 시작 시, 저장된 세션 정보(예: `electron-store` 같은 라이브러리로 로컬에 암호화된 사용자 식별자 저장) 확인.
            *   유효한 세션 정보가 있으면 `login.html`을 건너뛰고 바로 `index.html` 로드 및 해당 사용자 정보로 애플리케이션 초기화.
        *   **사용자가 로그아웃 버튼을 명시적으로 클릭할 때까지 세션이 유지.**
            *   로그아웃 시 메인 프로세스에서 세션 정보 삭제 및 `login.html`로 윈도우 내용 변경.
        *   **애플리케이션은 안전한 인증 상태를 유지합니다.** (메인 프로세스에서만 실제 인증 및 세션 처리, 렌더러는 IPC 통신으로 결과만 받음)

### 6.3. 메인 페이지 (캘린더 페이지 - `CalendarPage.js`, `index.html`)

1.  **캘린더 뷰 (`CalendarView.js`)**
    *   FullCalendar 라이브러리 사용 (설정은 기존과 유사).
    *   **작업 상호작용 상세:**
        *   **작업(이벤트) 한 번 클릭 (`eventClick`):**
            *   클릭된 작업(이벤트)이 시각적으로 선택됨 (예: 테두리 강조).
            *   **편집 모달을 열지 않고,** 캘린더 근처의 별도 정보 패널이나 툴팁에 해당 작업의 기본 정보(업무명, 시간, 상태) 간략히 표시. (이벤트 객체의 `extendedProps` 활용).
            *   **빈 공간 클릭 (`dateClick` 또는 FullCalendar의 배경 클릭 이벤트):**
                *   클릭된 날짜 또는 시간 정보 획득. (새 작업 생성의 준비 단계).
                *   선택된 작업이 있다면 선택 해제.
        *   **작업(이벤트) 두 번 클릭 (`eventDblClick`):**
            *   해당 작업을 수정하기 위한 **편집 모달 (`TaskEditModal.js`)을 엽니다.**
            *   기존 업무의 상세 정보 로드.
        *   **빈 날짜/요일 두 번 클릭 (`dateDblClick` - FullCalendar의 `dateClick`에서 더블클릭 감지 로직 추가 필요 또는 별도 이벤트 리스너):**
            *   해당 시간/날짜에 **새 작업을 생성하는 모달 (`NewTaskModal.js`)을 엽니다.**
            *   더블클릭된 날짜/시간을 새 작업의 기본 시작 시간으로 설정.
        *   **주/일 뷰의 빈 달력에서 마우스 선택 및 드래그 (`select` 콜백):**
            *   선택된 시간 범위로 **새 작업을 생성하는 모달 (`NewTaskModal.js`)을 엽니다.**
            *   선택된 시작 및 종료 시간을 새 작업의 기본 시간으로 설정.
        *   **기존 작업 Ctrl 키를 누른 채 드래그 (`eventDragStart`, `eventDrop`):**
            *   드롭 위치에 작업을 복제. (기존 로직 유지: `jsEvent.ctrlKey` 또는 `jsEvent.metaKey` 확인, 새 UUID 생성, 상태 'PLAN'으로, DCA 초기화 등).
    *   월간 캘린더 뷰: 날짜별 업무가 4개 초과 시 "+N more" 표시.
    *   업무 상태별 색상 및 이모지 표시.

2.  **월간/주간 계획 표시 (`MonthlyPlanCard.js`, `WeeklyPlanCard.js`)**
    *   캘린더 뷰 상단 또는 사이드바에 **컴팩트한 카드 형태로 표시.**
    *   **"2023년 10월 월간 계획", "2023년 42주차 주간 계획" 과 같이 몇 월 / 몇째 주의 계획인지 명확히 표시.**
    *   **현재 캘린더 뷰가 보여주는 달/주에 해당하는 계획(Plan)이 존재할 경우 해당 내용 표시.**
    *   **계획이 없을 경우, 카드 내에 바로 입력할 수 있는 폼(텍스트 영역과 저장 버튼) 형태로 표시.** 입력 후 저장 시 카드는 내용 표시 모드로 전환.
    *   카드 클릭 시 또는 편집 아이콘 클릭 시 내용 수정 가능.

### 6.4. 새 업무 등록 (`NewTaskModal.js` 내 `NewTaskForm.js`)
    (기존 설계 내용 유지: 업무명, 날짜/시간, 종일, 내/외근, 외근 목적지 등)

### 6.5. 업무 편집 모달 (`TaskEditModal.js` 내 `TaskEditModalContent.js`)
    *   (기존 설계 내용 유지: DCA, 상태, 날짜/시간, 내/외근 정보 등)
    *   **UI 레이아웃:** **전체 항목이 compact 하게 적절히 배치.**
        *   예: "업무명"과 "상태"를 한 줄에 배치, "시작일시"와 "종료일시"를 한 줄에 배치.
        *   라벨과 입력 필드를 가로로 정렬하여 공간 활용도 높임.
        *   모달의 높이가 과도하게 길어져 모니터 화면을 초과하고 하단 버튼(저장/삭제/취소)이 보이지 않는 상황 방지. 필요시 모달 내 스크롤 적용.
        *   Material Design의 입력 필드 스타일, 카드 컴포넌트 등을 활용하여 시각적으로도 정리된 느낌 제공.

### 6.6. 보고서 페이지 (`ReportPage.js`)
    (기존 설계 내용 유지: 월/주간 계획 표시, 금주 PDCA 테이블, 차주 Plan 테이블, Excel 내보내기, 시각화 뷰)
    *   페이지 상단에 "캘린더 보기" 버튼 표시하여 캘린더 페이지로 이동 가능.
    *   테이블 라벨 및 Excel 내보내기 형식은 기존 정의 따름.

## 7. UI/UX 고려사항
    (기존 설계 내용 유지: Material Design 참고, Noto Sans KR, 이동/복제 피드백, 일관성, 직관성, 반응성, 접근성, 오류 처리)
    *   **클릭/더블클릭 구분:** 사용자가 단일 클릭과 더블 클릭의 차이를 명확히 인지하고 의도대로 동작하도록 시각적 피드백과 반응 시간 중요.

## 8. 비기능적 요구사항
    (기존 설계 내용 유지: 성능, 보안, 안정성, 유지보수성, 확장성)

## 9. 추가 개선 및 고려 사항 (제안)
    (기존 설계 내용 유지: 데이터 백업/복구, 반복 업무, 테마 지원, 단축키, 설정 페이지, 보안 질문 분실 대처)

## 10. 배포 및 빌드

*   `electron-builder`를 사용하여 Windows용 설치 파일(`.exe`) 또는 포터블 버전 생성.
*   **`package.json` 스크립트 설정:**
    *   **별도의 React 개발 서버 없이 Electron을 직접 실행하도록 설정.**
    *   개발 시: `electron .` (또는 `electron main.js`) 스크립트로 Electron 앱 바로 실행. React 코드 변경 시 수동 재시작 또는 `electron-reload` 같은 도구 사용 고려.
    *   빌드 스크립트: `electron-builder` 명령어 사용.
    ```json
    "scripts": {
      "start": "electron .",
      "pack": "electron-builder --dir",
      "dist": "electron-builder"
    }
    ```
*   메인 프로세스에서 `win.loadFile(path.join(__dirname, 'html/index.html'))` 와 같이 HTML 파일을 직접 로드하도록 설정.

