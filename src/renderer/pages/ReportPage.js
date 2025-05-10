// Report page component
import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useTasks } from '../hooks/useTasks';
import { getYearWeek, getWeekRange, getYearMonth, translateStatus } from '../utils/dateUtils';

const ReportPage = () => {
  const { user } = useAuth();
  const { generateWeeklyReport, exportToExcel } = useTasks();
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [yearWeek, setYearWeek] = useState(getYearWeek(new Date()));
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Load report when year-week changes
  useEffect(() => {
    loadReport();
  }, [yearWeek]);
  
  // Load report data
  const loadReport = async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await generateWeeklyReport(yearWeek);
      
      if (result.success) {
        // Process the report data to fix all-day task dates
        const processedReport = {
          ...result.report,
          tasks: result.report.tasks.map(task => {
            // Create a copy of the task to avoid modifying the original
            const processedTask = {...task};
            
            // For all-day tasks, add a custom property for date display
            if (processedTask.is_all_day === 1) {
              // Extract the date parts directly from the string
              const dateParts = processedTask.start_datetime.split('T')[0].split('-');
              processedTask.display_date = `${parseInt(dateParts[1])}.${parseInt(dateParts[2])}.`;
              console.log(`Fixed all-day task date: ${processedTask.title}, Display date: ${processedTask.display_date}`);
            }
            
            return processedTask;
          }),
          nextWeekTasks: result.report.nextWeekTasks ? result.report.nextWeekTasks.map(task => {
            // Create a copy of the task to avoid modifying the original
            const processedTask = {...task};
            
            // For all-day tasks, add a custom property for date display
            if (processedTask.is_all_day === 1) {
              // Extract the date parts directly from the string
              const dateParts = processedTask.start_datetime.split('T')[0].split('-');
              processedTask.display_date = `${parseInt(dateParts[1])}.${parseInt(dateParts[2])}.`;
              console.log(`Fixed all-day task date: ${processedTask.title}, Display date: ${processedTask.display_date}`);
            }
            
            return processedTask;
          }) : []
        };
        
        setReport(processedReport);
      } else {
        setError(result.error || '보고서 생성 중 오류가 발생했습니다.');
        setReport(null);
      }
    } catch (error) {
      console.error('Generate report error:', error);
      setError('보고서 생성 중 오류가 발생했습니다.');
      setReport(null);
    } finally {
      setLoading(false);
    }
  };
  
  // Handle export to Excel
  const handleExport = async () => {
    if (!user) return;
    
    try {
      const result = await exportToExcel(yearWeek);
      
      if (result.success) {
        alert(`Excel 파일이 성공적으로 저장되었습니다: ${result.filePath}`);
      } else if (!result.canceled) {
        alert(result.error || 'Excel 내보내기 중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('Export to Excel error:', error);
      alert('Excel 내보내기 중 오류가 발생했습니다.');
    }
  };
  
  // Handle previous week
  const handlePrevWeek = () => {
    const date = new Date(currentDate);
    date.setDate(date.getDate() - 7);
    setCurrentDate(date);
    setYearWeek(getYearWeek(date));
  };
  
  // Handle next week
  const handleNextWeek = () => {
    const date = new Date(currentDate);
    date.setDate(date.getDate() + 7);
    setCurrentDate(date);
    setYearWeek(getYearWeek(date));
  };
  
  // Handle current week
  const handleCurrentWeek = () => {
    const date = new Date();
    setCurrentDate(date);
    setYearWeek(getYearWeek(date));
  };
  
  // Format week for display
  const formatWeek = (yearWeek) => {
    if (!yearWeek) return '';
    
    const [year, week] = yearWeek.split('-');
    
    // Get week date range
    const weekRange = getWeekRange(yearWeek);
    const startDate = weekRange.start.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });
    const endDate = weekRange.end.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });
    
    // Get month name for the week
    const monthName = weekRange.start.toLocaleDateString('ko-KR', { month: 'long' });
    
    return `${year}년 ${week}주차 (${startDate} ~ ${endDate})`;
  };
  
  return (
    <div>
      <div className="calendar-header">
        <h1 className="calendar-title">PDCA 주간 보고서</h1>
        
        <div className="calendar-actions">
          <button className="btn btn-secondary" onClick={handlePrevWeek}>이전 주</button>
          <button className="btn btn-secondary" onClick={handleCurrentWeek}>이번 주</button>
          <button className="btn btn-secondary" onClick={handleNextWeek}>다음 주</button>
          <button className="btn" onClick={handleExport}>Excel 내보내기</button>
        </div>
      </div>
      
      <div className="card report-card">
        <h2>{formatWeek(yearWeek)}</h2>
        
        {loading && <p>보고서를 불러오는 중...</p>}
        
        {error && <p className="error-message">{error}</p>}
        
        {report && (
          <div className="report-content">
            {/* Monthly Section */}
            <div className="report-section">
              <h3 className="section-title">월간 계획 및 통계</h3>
              <div className="report-grid">
                {/* Monthly Plan Card */}
                <div className="card compact-card">
                  <h4>월간 계획</h4>
                  <div style={{ whiteSpace: 'pre-wrap', marginTop: '5px', maxHeight: '120px', overflowY: 'auto' }}>
                    {report.monthlyPlan || '등록된 월간 계획이 없습니다.'}
                  </div>
                </div>
                
                {/* Monthly Stats Card */}
                <div className="card compact-card">
                  <h4>월간 업무 통계</h4>
                  <div className="stats-container">
                    <div className="stat-item">
                      <div className="stat-value">{report.monthlyStats ? report.monthlyStats.total : 0}</div>
                      <div className="stat-label">전체 업무</div>
                    </div>
                    
                    <div className="stat-item">
                      <div className="stat-value">{report.monthlyStats ? report.monthlyStats.completed : 0}</div>
                      <div className="stat-label">완료</div>
                    </div>
                    
                    <div className="stat-item">
                      <div className="stat-value">{report.monthlyStats ? report.monthlyStats.canceled : 0}</div>
                      <div className="stat-label">취소</div>
                    </div>
                    
                    <div className="stat-item">
                      <div className="stat-value">{report.monthlyStats ? report.monthlyStats.planned : 0}</div>
                      <div className="stat-label">계획 중</div>
                    </div>
                    
                    <div className="stat-item">
                      <div className="stat-value">{report.monthlyStats ? report.monthlyStats.completionRate.toFixed(2) : '0.00'}%</div>
                      <div className="stat-label">완료율</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Weekly Section */}
            <div className="report-section">
              <h3 className="section-title">주간 계획 및 통계</h3>
              <div className="report-grid">
                {/* Weekly Plan Card */}
                <div className="card compact-card">
                  <h4>주간 계획</h4>
                  <div style={{ whiteSpace: 'pre-wrap', marginTop: '5px', maxHeight: '120px', overflowY: 'auto' }}>
                    {report.weeklyPlan || '등록된 주간 계획이 없습니다.'}
                  </div>
                </div>
                
                {/* Weekly Stats Card */}
                <div className="card compact-card">
                  <h4>주간 업무 통계</h4>
                  <div className="stats-container">
                    <div className="stat-item">
                      <div className="stat-value">{report.stats.total}</div>
                      <div className="stat-label">전체 업무</div>
                    </div>
                    
                    <div className="stat-item">
                      <div className="stat-value">{report.stats.completed}</div>
                      <div className="stat-label">완료</div>
                    </div>
                    
                    <div className="stat-item">
                      <div className="stat-value">{report.stats.canceled || 0}</div>
                      <div className="stat-label">취소</div>
                    </div>
                    
                    <div className="stat-item">
                      <div className="stat-value">{report.stats.planned || 0}</div>
                      <div className="stat-label">계획 중</div>
                    </div>
                    
                    <div className="stat-item">
                      <div className="stat-value">{report.stats.completionRate.toFixed(2)}%</div>
                      <div className="stat-label">완료율</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* This Week's Tasks */}
            <div className="report-section">
              <h3 className="section-title">금주 업무 현황</h3>
              {report.tasks.length > 0 ? (
                <div style={{ overflowX: 'auto' }}>
                  <table className="tasks-table">
                    <thead>
                      <tr>
                        <th>날짜</th>
                        <th>업무명</th>
                        <th>시작 시간</th>
                        <th>작업 시간</th>
                        <th>작업 위치</th>
                        <th>Do (실행)</th>
                        <th>Check (점검)</th>
                        <th>Act (개선)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...report.tasks]
                        // Sort tasks by start date
                        .sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime))
                        .map((task) => {
                          // Use the display_date property for all-day tasks
                          let dateDisplay;
                          if (task.is_all_day === 1 && task.display_date) {
                            dateDisplay = task.display_date;
                          } else {
                            const date = new Date(task.start_datetime);
                            dateDisplay = date.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' });
                          }
                          
                          const startDate = new Date(task.start_datetime);
                          const endDate = new Date(task.end_datetime);
                          
                          return (
                            <tr key={task.uuid}>
                              <td>{dateDisplay}</td>
                              <td>{task.title}</td>
                              <td>{task.is_all_day === 1 ? '종일' : startDate.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</td>
                              <td>{task.is_all_day === 1 ? '종일' : ((endDate - startDate) / (1000 * 60 * 60)).toFixed(1) + '시간'}</td>
                              <td>{task.is_internal_work === 1 ? '내근' : task.external_location}</td>
                              <td>{task.do_text || '-'}</td>
                              <td>{task.check_text || '-'}</td>
                              <td>{task.act_text || '-'}</td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p>등록된 업무가 없습니다.</p>
              )}
            </div>
            
            {/* Next Week's Plan */}
            <div className="report-section">
              <h3 className="section-title">차주 계획</h3>
              {report.nextWeekTasks && report.nextWeekTasks.length > 0 ? (
                <div style={{ overflowX: 'auto' }}>
                  <table className="tasks-table">
                    <thead>
                      <tr>
                        <th>날짜</th>
                        <th>업무명</th>
                        <th>시작 시간</th>
                        <th>작업 시간</th>
                        <th>작업 위치</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...report.nextWeekTasks]
                        // Sort tasks by start date
                        .sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime))
                        .map((task) => {
                          // Use the display_date property for all-day tasks
                          let dateDisplay;
                          if (task.is_all_day === 1 && task.display_date) {
                            dateDisplay = task.display_date;
                          } else {
                            const date = new Date(task.start_datetime);
                            dateDisplay = date.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' });
                          }
                          
                          const startDate = new Date(task.start_datetime);
                          const endDate = new Date(task.end_datetime);
                          
                          return (
                            <tr key={task.uuid}>
                              <td>{dateDisplay}</td>
                              <td>{task.title}</td>
                              <td>{task.is_all_day === 1 ? '종일' : startDate.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</td>
                              <td>{task.is_all_day === 1 ? '종일' : ((endDate - startDate) / (1000 * 60 * 60)).toFixed(1) + '시간'}</td>
                              <td>{task.is_internal_work === 1 ? '내근' : task.external_location}</td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p>등록된 차주 계획이 없습니다.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportPage;
