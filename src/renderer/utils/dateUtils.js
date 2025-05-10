// Date utility functions
export const formatDate = (date) => {
  return date.toISOString().split('T')[0];
};

export const formatDateTime = (date) => {
  // Handle null or undefined dates
  if (!date) {
    console.warn('Null or undefined date provided to formatDateTime');
    return '';
  }
  
  try {
    // Format as YYYY-MM-DDTHH:MM in local timezone instead of UTC
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    console.log(`Formatting date: ${date.toString()} to ${year}-${month}-${day}T${hours}:${minutes}`);
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  } catch (error) {
    console.error('Error formatting date:', error, date);
    return '';
  }
};

export const formatDateTimeForDisplay = (dateTimeStr) => {
  const date = new Date(dateTimeStr);
  return `${date.toLocaleDateString('ko-KR')} ${date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}`;
};

export const getYearMonth = (date) => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

export const getYearWeek = (date) => {
  // Create a copy of the date to avoid modifying the original
  const d = new Date(date);
  
  // Get the first day of the year
  const yearStart = new Date(d.getFullYear(), 0, 1);
  
  // Get the first Monday of the year
  const firstMonday = new Date(yearStart);
  while (firstMonday.getDay() !== 1) {
    firstMonday.setDate(firstMonday.getDate() + 1);
  }
  
  // If the date is before the first Monday, it's week 1
  if (d < firstMonday) {
    return `${d.getFullYear()}-01`;
  }
  
  // Calculate the number of weeks
  const daysSinceFirstMonday = Math.floor((d - firstMonday) / (24 * 60 * 60 * 1000));
  const weekNo = Math.floor(daysSinceFirstMonday / 7) + 1;
  
  // Log for debugging
  console.log(`Date: ${d.toDateString()}, Week: ${weekNo}`);
  
  return `${d.getFullYear()}-${String(weekNo).padStart(2, '0')}`;
};

export const getWeekRange = (yearWeek) => {
  const [year, week] = yearWeek.split('-').map(Number);
  
  // Create a date for the first day of the year
  const date = new Date(year, 0, 1);
  
  // Get to the first Monday of the year
  while (date.getDay() !== 1) {
    date.setDate(date.getDate() + 1);
  }
  
  // Add the required number of weeks
  date.setDate(date.getDate() + (week - 1) * 7);
  
  // This is now the Monday of the requested week
  const weekStart = new Date(date);
  
  // Calculate the Sunday of the same week
  const weekEnd = new Date(date);
  weekEnd.setDate(date.getDate() + 6);
  
  console.log(`Week range for ${yearWeek}: ${weekStart.toDateString()} to ${weekEnd.toDateString()}`);
  
  return {
    start: weekStart,
    end: weekEnd
  };
};

export const getMonthRange = (yearMonth) => {
  const [year, month] = yearMonth.split('-').map(Number);
  
  // Create date for the first day of the month
  const startDate = new Date(year, month - 1, 1);
  
  // Create date for the last day of the month
  const endDate = new Date(year, month, 0);
  
  return {
    start: startDate,
    end: endDate
  };
};

export const translateStatus = (status) => {
  const statusMap = {
    'PLAN': '계획',
    'CANCELED': '취소',
    'COMPLETED': '완료'
  };
  
  return statusMap[status] || status;
};
