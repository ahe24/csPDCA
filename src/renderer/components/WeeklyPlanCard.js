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
  
  // Load weekly plan when date changes
  useEffect(() => {
    // Always use today's date to determine the current week
    // This ensures the weekly plan always shows the current week regardless of calendar view
    const today = new Date();
    const todayYearWeek = getYearWeek(today);
    console.log('WeeklyPlanCard - Today\'s date:', today, 'Week:', todayYearWeek);
    
    // Get the week range to verify the calculation
    const weekRange = getWeekRange(todayYearWeek);
    console.log('WeeklyPlanCard - Current week range:', weekRange.start, 'to', weekRange.end);
    
    // If we also have a calendar date, log it for debugging
    if (date) {
      console.log('WeeklyPlanCard - Calendar date:', date);
      const calendarYearWeek = getYearWeek(date);
      console.log('WeeklyPlanCard - Calendar year-week:', calendarYearWeek);
    }
    
    // Always use today's week for the weekly plan
    setYearWeek(todayYearWeek);
    loadWeeklyPlan(todayYearWeek);
  }, [date]); // Removed loadWeeklyPlan from dependencies to prevent infinite loop
  
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
