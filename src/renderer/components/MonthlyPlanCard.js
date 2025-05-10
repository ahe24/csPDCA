// Monthly plan card component
import React, { useState, useEffect } from 'react';
import { useTasks } from '../hooks/useTasks';
import Textarea from './Textarea';
import { getYearMonth } from '../utils/dateUtils';

const MonthlyPlanCard = ({ date }) => {
  const { monthlyPlan, loadMonthlyPlan, saveMonthlyPlan } = useTasks();
  const [planContent, setPlanContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [yearMonth, setYearMonth] = useState('');
  
  // Load monthly plan when date changes
  useEffect(() => {
    if (date) {
      const currentYearMonth = getYearMonth(date);
      setYearMonth(currentYearMonth);
      loadMonthlyPlan(currentYearMonth);
    }
  }, [date]); // Removed loadMonthlyPlan from dependencies to prevent infinite loop
  
  // Update plan content when monthly plan changes
  useEffect(() => {
    if (monthlyPlan) {
      setPlanContent(monthlyPlan.plan_content || '');
    } else {
      setPlanContent('');
    }
  }, [monthlyPlan]);
  
  // Handle plan content change
  const handleContentChange = (e) => {
    setPlanContent(e.target.value);
  };
  
  // Handle save
  const handleSave = async () => {
    try {
      await saveMonthlyPlan(yearMonth, planContent);
      setIsEditing(false);
    } catch (error) {
      console.error('Save monthly plan error:', error);
      alert('월간 계획 저장 중 오류가 발생했습니다.');
    }
  };
  
  // Format month for display
  const formatMonth = (yearMonth) => {
    if (!yearMonth) return '';
    
    const [year, month] = yearMonth.split('-');
    return `${year}년 ${month}월`;
  };
  
  return (
    <div className="card plan-card">
      <div className="plan-card-header">
        <h3 className="plan-card-title">{formatMonth(yearMonth)} 월간 계획</h3>
        
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
            id="monthly-plan"
            name="monthly-plan"
            value={planContent}
            onChange={handleContentChange}
            placeholder="월간 계획을 입력하세요"
          />
        ) : (
          <div style={{ whiteSpace: 'pre-wrap' }}>
            {planContent || '등록된 월간 계획이 없습니다.'}
          </div>
        )}
      </div>
    </div>
  );
};

export default MonthlyPlanCard;
