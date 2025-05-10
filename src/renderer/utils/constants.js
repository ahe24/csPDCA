// Application constants

// Task status options
export const TASK_STATUS = {
  PLAN: 'PLAN',
  CANCELED: 'CANCELED',
  COMPLETED: 'COMPLETED'
};

// Task status labels in Korean with emoji icons
export const TASK_STATUS_LABELS = {
  [TASK_STATUS.PLAN]: '📝 계획',
  [TASK_STATUS.CANCELED]: '❌ 취소',
  [TASK_STATUS.COMPLETED]: '✅ 완료'
};

// Task status emoji icons for calendar display
export const TASK_STATUS_ICONS = {
  [TASK_STATUS.PLAN]: '📝',
  [TASK_STATUS.CANCELED]: '❌',
  [TASK_STATUS.COMPLETED]: '✅'
};

// Security questions
export const SECURITY_QUESTIONS = [
  { value: 'birthplace', label: '태어난 곳은 어디인가요?' },
  { value: 'firstpet', label: '첫 번째 애완동물의 이름은 무엇인가요?' },
  { value: 'mothername', label: '어머니의 성함은 무엇인가요?' },
  { value: 'school', label: '초등학교 이름은 무엇인가요?' },
  { value: 'favoritecolor', label: '가장 좋아하는 색상은 무엇인가요?' }
];

// FullCalendar configuration
export const CALENDAR_CONFIG = {
  headerToolbar: {
    left: 'prev,next today',
    center: 'title',
    right: 'dayGridMonth,timeGridWeek'
  },
  initialView: 'dayGridMonth',
  editable: true,
  selectable: true,
  selectMirror: true,
  dayMaxEvents: true,
  weekends: true,
  locale: 'ko',
  buttonText: {
    today: '오늘',
    month: '월',
    week: '주'
  },
  // Set working hours view (9 AM to 6 PM) with visible range from 5 AM to midnight
  slotMinTime: '05:00:00',
  slotMaxTime: '24:00:00',
  scrollTime: '09:00:00',
  // Highlight business/working hours
  businessHours: {
    daysOfWeek: [1, 2, 3, 4, 5], // Monday - Friday
    startTime: '09:00',
    endTime: '18:00'
  },
  allDayText: '종일',
  moreLinkText: '더보기',
  noEventsText: '일정이 없습니다',
  // Fix the copyright bar position
  height: 'auto',
  // Update the weekly plan based on the selected date
  navLinks: true
};
