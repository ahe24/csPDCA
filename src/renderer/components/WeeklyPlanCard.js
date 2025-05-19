// Weekly plan card component
import React, { useState, useEffect } from 'react';
import { useTasks } from '../hooks/useTasks';
import Textarea from './Textarea';
import { getYearWeek, getWeekRange } from '../utils/dateUtils';

const WeeklyPlanCard = ({ date }) => {
  const { weeklyPlan, loadWeeklyPlan, saveWeeklyPlan } = useTasks();
  const [planContent, setPlanContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [yearWeek, setYearWeek] = useState('');
  const [weekRange, setWeekRange] = useState({ start: null, end: null });
  
  // Load weekly plan when date changes
  useEffect(() => {
    if (!date) return;
    
    // Create a new date object to avoid reference issues
    const currentDate = new Date(date);
    
    // Get the current day of the week (0 = Sunday, 1 = Monday, etc.)
    const dayOfWeek = currentDate.getDay();
    
    // Calculate the start of the week (Monday)
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    startOfWeek.setHours(0, 0, 0, 0);
    
    // Calculate the end of the week (Sunday)
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);
    
    // Get the year and week number for the target date
    const targetYearWeek = getYearWeek(date);
    
    console.log('WeeklyPlanCard - Received date:', currentDate);
    console.log('WeeklyPlanCard - Start of week:', startOfWeek);
    console.log('WeeklyPlanCard - End of week:', endOfWeek);
    
    // Update the state with the target week
    setYearWeek(targetYearWeek);
    setWeekRange({ start: startOfWeek, end: endOfWeek });
    loadWeeklyPlan(targetYearWeek);
    
    // Cleanup function
    return () => {
      console.log('WeeklyPlanCard - Cleaning up for date:', date);
    };
  }, [date, date?.getTime()]); // Add date.getTime() to dependency array to detect date object changes
  
  // Update plan content when weekly plan changes
  useEffect(() => {
    if (weeklyPlan) {
      setPlanContent(weeklyPlan.plan_content || '');
    } else {
      setPlanContent('');
    }
  }, [weeklyPlan]);
  
  // Handle plan content change
  const handleContentChange = (e) => {
    setPlanContent(e.target.value);
  };
  
  // Handle save
  const handleSave = async () => {
    try {
      await saveWeeklyPlan(yearWeek, planContent);
      setIsEditing(false);
    } catch (error) {
      console.error('Save weekly plan error:', error);
      alert('주간 계획 저장 중 오류가 발생했습니다.');
    }
  };
  
  // Format week for display
  const formatWeek = (yearWeek) => {
    if (!yearWeek) return '';
    
    const [year, week] = yearWeek.split('-');
    
    // Get week date range
    const weekRange = getWeekRange(yearWeek);
    const startDate = weekRange.start.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });
    const endDate = weekRange.end.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });
    
    return `${year}년 ${week}주차 (${startDate} ~ ${endDate})`;
  };
  
  return (
    <div className="card plan-card">
      <div className="plan-card-header">
        <h3 className="plan-card-title">{formatWeek(yearWeek)} 주간 계획</h3>
        
        {isEditing ? (
          <div>
            <button className="btn btn-secondary" onClick={() => setIsEditing(false)} style={{ marginRight: '8px' }}>
              취소
            </button>
            <button className="btn" onClick={handleSave}>
              저장
            </button>
          </div>
        ) : (
          <button className="btn" onClick={() => setIsEditing(true)}>
            편집
          </button>
        )}
      </div>
      
      <div className="plan-card-content">
        {isEditing ? (
          <Textarea
            id="weekly-plan"
            name="weekly-plan"
            value={planContent}
            onChange={handleContentChange}
            placeholder="주간 계획을 입력하세요"
          />
        ) : (
          <div style={{ whiteSpace: 'pre-wrap' }}>
            {planContent || '등록된 주간 계획이 없습니다.'}
          </div>
        )}
      </div>
    </div>
  );
};

export default WeeklyPlanCard;
