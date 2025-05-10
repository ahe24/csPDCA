// Calendar page component
import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useTasks } from '../hooks/useTasks';
import CalendarView from '../components/CalendarView';
import TaskEditModal from '../components/TaskEditModal';
import MonthlyPlanCard from '../components/MonthlyPlanCard';
import WeeklyPlanCard from '../components/WeeklyPlanCard';
import { formatDateTime } from '../utils/dateUtils';

const CalendarPage = () => {
  const { user } = useAuth();
  const { tasks, loadTasks, createTask, updateTask, deleteTask } = useTasks();
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentViewType, setCurrentViewType] = useState('dayGridMonth');
  const [dateRange, setDateRange] = useState({ start: null, end: null });
  const [selectedTask, setSelectedTask] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isNewTask, setIsNewTask] = useState(false);
  const [selectedDateInfo, setSelectedDateInfo] = useState(null);
  
  // Load initial tasks when component mounts
  useEffect(() => {
    if (user) {
      // Set initial date range for current month view
      const today = new Date();
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      
      console.log('Initial loading of tasks:', firstDay, lastDay);
      setDateRange({ start: firstDay, end: lastDay });
      loadTasks(firstDay, lastDay);
    }
  }, [user]); // Only run when user changes
  
  // Load tasks when date range changes
  useEffect(() => {
    if (user && dateRange.start && dateRange.end) {
      console.log('Loading tasks for date range:', dateRange.start, dateRange.end);
      loadTasks(dateRange.start, dateRange.end);
    }
  }, [user, dateRange]); // Removed loadTasks from dependencies to prevent infinite loop
  
  // Handle view change
  const handleViewChange = (info) => {
    // Update state with new view information
    setCurrentDate(info.currentDate);
    setCurrentViewType(info.viewType);
    setDateRange({ start: info.start, end: info.end });
    
    console.log(`View changed to ${info.viewType}, current date: ${info.currentDate}`);
    console.log(`Date range: ${info.start} to ${info.end}`);
    
    // We don't need to call loadTasks here as it will be triggered by the dateRange change
  };
  
  // Handle task click
  const handleTaskClick = (task) => {
    // Ensure we have proper date objects
    const startDate = typeof task.start === 'string' ? new Date(task.start) : task.start;
    const endDate = typeof task.end === 'string' ? new Date(task.end) : task.end;
    
    // Format the dates properly for the datetime-local input
    const formattedStart = formatDateTime(startDate);
    const formattedEnd = formatDateTime(endDate);
    
    console.log('Edit existing task - start:', formattedStart, 'end:', formattedEnd);
    
    // Create a new task object with the formatted dates
    const taskWithFormattedDates = {
      ...task,
      formattedStart,
      formattedEnd
    };
    
    // Store in window object for the modal to access
    window.selectedTask = taskWithFormattedDates;
    
    setSelectedTask(taskWithFormattedDates);
    setIsNewTask(false);
    setIsModalOpen(true);
  };
  
  // Handle date click
  const handleDateClick = (dateInfo) => {
    // Adjust start time for monthly view if needed
    let adjustedStart = dateInfo.start;
    let adjustedEnd = dateInfo.end;
    
    // If in month view, set start time to 9 AM and handle overlaps
    if (dateInfo.view === 'dayGridMonth') {
      adjustedStart = adjustTimeForMonthlyView(dateInfo.start, 'dayGridMonth');
      adjustedEnd = new Date(adjustedStart.getTime() + 60 * 60 * 1000); // 1 hour later
    }
    
    // Format the date and time for the modal
    const formattedStart = formatDateTime(adjustedStart);
    const formattedEnd = formatDateTime(adjustedEnd);
    
    console.log('New task from click - start:', formattedStart, 'end:', formattedEnd);
    
    const dateInfoWithFormat = {
      ...dateInfo,
      start: adjustedStart,
      end: adjustedEnd,
      formattedStart,
      formattedEnd
    };
    
    // Store in window object for the modal to access
    window.selectedDateInfo = dateInfoWithFormat;
    
    setSelectedTask(null);
    setSelectedDateInfo(dateInfoWithFormat);
    setIsNewTask(true);
    setIsModalOpen(true);
  };
  
  // Function to adjust time for monthly view and handle overlaps
  const adjustTimeForMonthlyView = (date, view, checkOverlap = true) => {
    // Create a new date object to avoid modifying the original
    const adjustedDate = new Date(date);
    
    console.log(`Adjusting time for view: ${view}, original date: ${adjustedDate.toISOString()}`);
    
    // Only adjust time for monthly view
    if (view === 'dayGridMonth') {
      adjustedDate.setHours(9, 0, 0, 0);
      console.log(`Set to 9 AM for monthly view: ${adjustedDate.toISOString()}`);
      
      // Check for overlapping tasks if requested
      if (checkOverlap) {
        // Get all tasks for this day
        const dayStart = new Date(adjustedDate);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(dayStart);
        dayEnd.setHours(23, 59, 59, 999);
        
        const tasksOnSameDay = tasks.filter(t => {
          const taskStart = new Date(t.start);
          return taskStart >= dayStart && taskStart <= dayEnd;
        });
        
        // Sort tasks by start time
        tasksOnSameDay.sort((a, b) => new Date(a.start) - new Date(b.start));
        
        // Find a suitable time slot
        for (const existingTask of tasksOnSameDay) {
          const existingStart = new Date(existingTask.start);
          const existingEnd = new Date(existingTask.end);
          
          // If our adjusted time is before the existing task starts, we're good
          if (adjustedDate < existingStart) {
            break;
          }
          
          // If our time overlaps with an existing task, move to after it
          if (adjustedDate < existingEnd) {
            adjustedDate.setTime(existingEnd.getTime());
            // Add a small buffer (5 minutes)
            adjustedDate.setMinutes(adjustedDate.getMinutes() + 5);
            console.log(`Adjusted for overlap: ${adjustedDate.toISOString()}`);
          }
        }
      }
    } else {
      // For weekly/daily views, preserve the exact time from the drag operation
      console.log(`Preserving exact time for ${view} view: ${adjustedDate.toISOString()}`);
    }
    
    return adjustedDate;
  };
  
  // Handle event drop
  const handleEventDrop = async ({ id, start, end, allDay, duplicate, view }) => {
    try {
      // Find the task
      const task = tasks.find(t => t.extendedProps.id === id);
      
      if (task) {
        // Get the current view type
        const currentViewType = view || window.currentViewType || 'dayGridMonth';
        console.log(`Event drop in view: ${currentViewType}`);
        
        // Calculate the duration of the original task
        const originalStart = typeof task.start === 'string' ? new Date(task.start) : task.start;
        const originalEnd = typeof task.end === 'string' ? new Date(task.end) : task.end;
        const duration = originalEnd ? (originalEnd.getTime() - originalStart.getTime()) : 60 * 60 * 1000; // Default to 1 hour
        
        // Adjust start time for monthly view and handle overlaps
        const adjustedStart = adjustTimeForMonthlyView(start, currentViewType);
        
        // Calculate end time (maintain original duration or use provided end)
        let adjustedEnd;
        if (end) {
          // If end is provided directly from the drag operation
          adjustedEnd = new Date(end);
        } else {
          // Otherwise maintain the original duration
          adjustedEnd = new Date(adjustedStart.getTime() + duration);
        }
        
        console.log(`Adjusted times - Start: ${adjustedStart.toISOString()}, End: ${adjustedEnd.toISOString()}`);

        
        if (duplicate) {
          // Create a duplicate task with new dates
          await createTask({
            title: task.title,
            do_text: task.extendedProps.doText,
            check_text: task.extendedProps.checkText,
            act_text: task.extendedProps.actText,
            status: task.extendedProps.status,
            start_datetime: formatDateTime(adjustedStart),
            end_datetime: formatDateTime(adjustedEnd),
            is_all_day: allDay ? 1 : 0,
            is_internal_work: task.extendedProps.isInternalWork ? 1 : 0,
            external_location: task.extendedProps.externalLocation
          });
        } else {
          // Update task with new dates
          await updateTask(id, {
            ...task.extendedProps,
            title: task.title,
            start_datetime: formatDateTime(adjustedStart),
            end_datetime: formatDateTime(adjustedEnd),
            is_all_day: allDay ? 1 : 0,
            is_internal_work: task.extendedProps.isInternalWork ? 1 : 0
          });
        }
      }
    } catch (error) {
      console.error('Event drop error:', error);
      alert('일정 이동 중 오류가 발생했습니다.');
    }
  };
  
  // Handle event resize
  const handleEventResize = async ({ id, start, end, allDay, view }) => {
    try {
      // Find the task
      const task = tasks.find(t => t.extendedProps.id === id);
      
      if (task) {
        // Get the current view type
        const currentViewType = view || window.currentViewType || 'dayGridMonth';
        
        // Adjust start time for monthly view and handle overlaps
        const adjustedStart = adjustTimeForMonthlyView(start, currentViewType, false);
        
        // End time should be at least adjusted start + 30 minutes
        const minEndTime = new Date(adjustedStart.getTime() + 30 * 60 * 1000);
        const adjustedEnd = end && end > minEndTime ? end : minEndTime;
        
        // Update task with new dates
        await updateTask(id, {
          ...task.extendedProps,
          title: task.title,
          start_datetime: formatDateTime(adjustedStart),
          end_datetime: formatDateTime(adjustedEnd),
          is_all_day: allDay ? 1 : 0,
          is_internal_work: task.extendedProps.isInternalWork ? 1 : 0
        });
      }
    } catch (error) {
      console.error('Event resize error:', error);
      alert('일정 크기 조정 중 오류가 발생했습니다.');
    }
  };
  
  // Handle save task
  const handleSaveTask = async (formData) => {
    try {
      if (isNewTask) {
        // Create new task
        const result = await createTask(formData);
        
        if (result.success) {
          setIsModalOpen(false);
        } else {
          alert(result.error || '업무 생성 중 오류가 발생했습니다.');
        }
      } else {
        // Update existing task
        const taskId = selectedTask.extendedProps.id;
        const result = await updateTask(taskId, formData);
        
        if (result.success) {
          setIsModalOpen(false);
        } else {
          alert(result.error || '업무 업데이트 중 오류가 발생했습니다.');
        }
      }
    } catch (error) {
      console.error('Save task error:', error);
      alert('업무 저장 중 오류가 발생했습니다.');
    }
  };
  
  // Handle delete task
  const handleDeleteTask = async () => {
    try {
      if (selectedTask) {
        const taskId = selectedTask.extendedProps.id;
        const result = await deleteTask(taskId);
        
        if (result.success) {
          setIsModalOpen(false);
        } else {
          alert(result.error || '업무 삭제 중 오류가 발생했습니다.');
        }
      }
    } catch (error) {
      console.error('Delete task error:', error);
      alert('업무 삭제 중 오류가 발생했습니다.');
    }
  };
  
  // Prepare task data for modal
  const getTaskForModal = () => {
    if (isNewTask && selectedDateInfo) {
      // Create a new task with selected date info
      const formattedStart = formatDateTime(selectedDateInfo.start);
      const formattedEnd = formatDateTime(selectedDateInfo.end);
      
      console.log('New task modal data:', {
        start: selectedDateInfo.start.toString(),
        formattedStart,
        end: selectedDateInfo.end.toString(),
        formattedEnd
      });
      
      return {
        title: '',
        start: selectedDateInfo.start,
        end: selectedDateInfo.end,
        formattedStart,
        formattedEnd,
        allDay: selectedDateInfo.allDay,
        extendedProps: {}
      };
    } else if (selectedTask) {
      // Format dates for existing task
      const startDate = typeof selectedTask.start === 'string' ? new Date(selectedTask.start) : selectedTask.start;
      const endDate = typeof selectedTask.end === 'string' ? new Date(selectedTask.end) : selectedTask.end;
      
      const formattedStart = formatDateTime(startDate);
      const formattedEnd = formatDateTime(endDate);
      
      console.log('Existing task modal data:', {
        start: startDate.toString(),
        formattedStart,
        end: endDate.toString(),
        formattedEnd
      });
      
      return {
        ...selectedTask,
        formattedStart,
        formattedEnd
      };
    }
    
    return null;
  };
  
  return (
    <div className="calendar-page-container">
      <div className="calendar-header">
        <h1 className="calendar-title">PDCA 캘린더</h1>
      </div>
      
      <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
        <div style={{ flex: '1' }}>
          <MonthlyPlanCard date={currentDate} />
        </div>
        <div style={{ flex: '1' }}>
          <WeeklyPlanCard date={currentDate} />
        </div>
      </div>
      
      <div className="calendar-main-container">
        <CalendarView
          tasks={tasks}
          onTaskClick={handleTaskClick}
          onDateClick={handleDateClick}
          onEventDrop={handleEventDrop}
          onEventResize={handleEventResize}
          onViewChange={handleViewChange}
        />
      </div>
      
      <div className="copyright-bar">
        <p>© 2025 csPDCA - PDCA 일정 관리 애플리케이션</p>
      </div>
      
      <TaskEditModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        task={getTaskForModal()}
        onSave={handleSaveTask}
        onDelete={handleDeleteTask}
      />
    </div>
  );
};

export default CalendarPage;
