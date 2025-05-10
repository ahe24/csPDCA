// Task management context provider
import React, { createContext, useState, useEffect, useContext } from 'react';
import { AuthContext } from './AuthContext';
import { getWeekRange, getYearWeek } from '../utils/dateUtils';

// Create context
export const TaskContext = createContext();

export const TaskProvider = ({ children }) => {
  const { user } = useContext(AuthContext);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [monthlyPlan, setMonthlyPlan] = useState(null);
  const [weeklyPlan, setWeeklyPlan] = useState(null);
  
  // Store the current date range for reloading tasks
  const [currentDateRange, setCurrentDateRange] = useState({ start: null, end: null });
  
  // Helper function to format dates for API calls (YYYY-MM-DD format)
  const formatDateForAPI = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  // Load tasks for the current view
  const loadTasks = async (startDate, endDate) => {
    if (!user) return;
    
    console.log('TaskContext loadTasks called with:', startDate, endDate);
    
    // Store the current date range for future reloads
    if (startDate && endDate) {
      setCurrentDateRange({ start: startDate, end: endDate });
    } else if (currentDateRange.start && currentDateRange.end) {
      // Use stored date range if not provided
      startDate = currentDateRange.start;
      endDate = currentDateRange.end;
    }
    
    // Ensure we have valid date objects
    if (typeof startDate === 'string') startDate = new Date(startDate);
    if (typeof endDate === 'string') endDate = new Date(endDate);
    
    setLoading(true);
    setError(null);
    
    try {
      const formattedStartDate = formatDateForAPI(startDate);
      const formattedEndDate = formatDateForAPI(endDate);
      
      console.log(`Fetching tasks from ${formattedStartDate} to ${formattedEndDate}`);
      
      const result = await window.api.getTasks({
        userId: user.id,
        startDate: formattedStartDate,
        endDate: formattedEndDate
      });
      
      if (result && !result.error) {
        // Transform tasks for FullCalendar
        const transformedTasks = result.map(task => ({
          id: task.uuid,
          title: task.title,
          start: task.start_datetime,
          end: task.end_datetime,
          allDay: task.is_all_day === 1,
          classNames: [`task-${task.status.toLowerCase()}`],
          extendedProps: {
            id: task.id,
            uuid: task.uuid,
            status: task.status,
            doText: task.do_text,
            checkText: task.check_text,
            actText: task.act_text,
            isInternalWork: task.is_internal_work === 1,
            externalLocation: task.external_location
          }
        }));
        
        setTasks(transformedTasks);
      } else {
        setError(result.error || '업무 로드 중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('Load tasks error:', error);
      setError('업무 로드 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };
  
  // Create a new task
  const createTask = async (taskData) => {
    if (!user) return { success: false, error: '로그인이 필요합니다.' };
    
    try {
      const result = await window.api.createTask({
        ...taskData,
        user_id: user.id
      });
      
      if (result && !result.error) {
        // Reload tasks to update the list
        await loadTasks(); // Use the stored date range
        return { success: true, task: result };
      } else {
        return { success: false, error: result.error || '업무 생성 중 오류가 발생했습니다.' };
      }
    } catch (error) {
      console.error('Create task error:', error);
      return { success: false, error: '업무 생성 중 오류가 발생했습니다.' };
    }
  };
  
  // Update an existing task
  const updateTask = async (taskId, taskData) => {
    if (!user) return { success: false, error: '로그인이 필요합니다.' };
    
    try {
      const result = await window.api.updateTask(taskId, taskData);
      
      if (result && !result.error) {
        // Reload tasks to update the list
        await loadTasks(); // Use the stored date range
        return { success: true, task: result };
      } else {
        return { success: false, error: result.error || '업무 업데이트 중 오류가 발생했습니다.' };
      }
    } catch (error) {
      console.error('Update task error:', error);
      return { success: false, error: '업무 업데이트 중 오류가 발생했습니다.' };
    }
  };
  
  // Delete a task
  const deleteTask = async (taskId) => {
    if (!user) return { success: false, error: '로그인이 필요합니다.' };
    
    try {
      const result = await window.api.deleteTask(taskId);
      
      if (result && !result.error) {
        // Update local tasks state
        setTasks(tasks.filter(task => task.extendedProps.id !== taskId));
        return { success: true };
      } else {
        return { success: false, error: result.error || '업무 삭제 중 오류가 발생했습니다.' };
      }
    } catch (error) {
      console.error('Delete task error:', error);
      return { success: false, error: '업무 삭제 중 오류가 발생했습니다.' };
    }
  };
  
  // Load monthly plan
  const loadMonthlyPlan = async (yearMonth) => {
    if (!user) return;
    
    try {
      const result = await window.api.getMonthlyPlan({
        userId: user.id,
        yearMonth
      });
      
      if (result && !result.error) {
        setMonthlyPlan(result);
      } else {
        setMonthlyPlan(null);
      }
    } catch (error) {
      console.error('Load monthly plan error:', error);
      setMonthlyPlan(null);
    }
  };
  
  // Save monthly plan
  const saveMonthlyPlan = async (yearMonth, planContent) => {
    if (!user) return { success: false, error: '로그인이 필요합니다.' };
    
    try {
      const result = await window.api.saveMonthlyPlan({
        userId: user.id,
        yearMonth,
        planContent
      });
      
      if (result && !result.error) {
        setMonthlyPlan(result);
        return { success: true, plan: result };
      } else {
        return { success: false, error: result.error || '월간 계획 저장 중 오류가 발생했습니다.' };
      }
    } catch (error) {
      console.error('Save monthly plan error:', error);
      return { success: false, error: '월간 계획 저장 중 오류가 발생했습니다.' };
    }
  };
  
  // Load weekly plan
  const loadWeeklyPlan = async (yearWeek) => {
    if (!user) return;
    
    try {
      const result = await window.api.getWeeklyPlan({
        userId: user.id,
        yearWeek
      });
      
      if (result && !result.error) {
        setWeeklyPlan(result);
      } else {
        setWeeklyPlan(null);
      }
    } catch (error) {
      console.error('Load weekly plan error:', error);
      setWeeklyPlan(null);
    }
  };
  
  // Save weekly plan
  const saveWeeklyPlan = async (yearWeek, planContent) => {
    if (!user) return { success: false, error: '로그인이 필요합니다.' };
    
    try {
      const result = await window.api.saveWeeklyPlan({
        userId: user.id,
        yearWeek,
        planContent
      });
      
      if (result && !result.error) {
        setWeeklyPlan(result);
        return { success: true, plan: result };
      } else {
        return { success: false, error: result.error || '주간 계획 저장 중 오류가 발생했습니다.' };
      }
    } catch (error) {
      console.error('Save weekly plan error:', error);
      return { success: false, error: '주간 계획 저장 중 오류가 발생했습니다.' };
    }
  };
  
  // Generate weekly report
  const generateWeeklyReport = async (yearWeek) => {
    if (!user) return { success: false, error: '로그인이 필요합니다.' };
    
    try {
      // Get the weekly report data
      const result = await window.api.generateWeeklyReport({
        userId: user.id,
        yearWeek
      });
      
      // Debug: Log all tasks to check dates
      if (result && result.tasks) {
        console.log('All tasks in report:');
        result.tasks.forEach(task => {
          console.log(`Task: ${task.title}, Start Date: ${task.start_datetime}, Is All Day: ${task.is_all_day}`);
        });
      }
      
      if (result && !result.error) {
        // Get the year and month from the yearWeek
        const [year, week] = yearWeek.split('-');
        const weekRange = getWeekRange(yearWeek);
        const currentMonth = weekRange.start.getMonth() + 1;
        const yearMonth = `${year}-${String(currentMonth).padStart(2, '0')}`;
        
        // Get the monthly plan
        const monthlyPlanResult = await window.api.getMonthlyPlan({
          userId: user.id,
          yearMonth
        });
        
        // Get monthly statistics
        const monthlyStatsResult = await window.api.getMonthlyStats({
          userId: user.id,
          yearMonth
        });
        
        console.log('Monthly stats result:', monthlyStatsResult);
        
        // Calculate next week
        const nextWeekDate = new Date(weekRange.end);
        nextWeekDate.setDate(nextWeekDate.getDate() + 1); // Start from the day after current week ends
        const nextYearWeek = getYearWeek(nextWeekDate);
        
        // Get next week's tasks
        const nextWeekRange = getWeekRange(nextYearWeek);
        const nextWeekStartDate = formatDateForAPI(nextWeekRange.start);
        const nextWeekEndDate = formatDateForAPI(nextWeekRange.end);
        
        console.log('Fetching next week tasks from', nextWeekStartDate, 'to', nextWeekEndDate);
        
        const nextWeekTasksResult = await window.api.getTasks({
          userId: user.id,
          startDate: nextWeekStartDate,
          endDate: nextWeekEndDate
        });
        
        console.log('Next week tasks result:', nextWeekTasksResult);
        
        // Combine all data
        const reportData = {
          ...result,
          monthlyPlan: monthlyPlanResult ? monthlyPlanResult.plan_content : null,
          monthlyStats: monthlyStatsResult ? monthlyStatsResult.stats : null,
          nextWeekTasks: nextWeekTasksResult || []
        };
        
        console.log('Final report data:', reportData);
        
        return { success: true, report: reportData };
      } else {
        return { success: false, error: result.error || '주간 보고서 생성 중 오류가 발생했습니다.' };
      }
    } catch (error) {
      console.error('Generate weekly report error:', error);
      return { success: false, error: '주간 보고서 생성 중 오류가 발생했습니다.' };
    }
  };
  
  // Export to Excel
  const exportToExcel = async (yearWeek) => {
    if (!user) return { success: false, error: '로그인이 필요합니다.' };
    
    try {
      const result = await window.api.exportToExcel({
        userId: user.id,
        yearWeek
      });
      
      if (result && !result.error && !result.canceled) {
        return { success: true, filePath: result.filePath };
      } else if (result.canceled) {
        return { success: false, canceled: true };
      } else {
        return { success: false, error: result.error || 'Excel 내보내기 중 오류가 발생했습니다.' };
      }
    } catch (error) {
      console.error('Export to Excel error:', error);
      return { success: false, error: 'Excel 내보내기 중 오류가 발생했습니다.' };
    }
  };
  
  return (
    <TaskContext.Provider
      value={{
        tasks,
        loading,
        error,
        monthlyPlan,
        weeklyPlan,
        loadTasks,
        createTask,
        updateTask,
        deleteTask,
        loadMonthlyPlan,
        saveMonthlyPlan,
        loadWeeklyPlan,
        saveWeeklyPlan,
        generateWeeklyReport,
        exportToExcel
      }}
    >
      {children}
    </TaskContext.Provider>
  );
};
