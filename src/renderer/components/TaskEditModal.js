// Task edit modal component
import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import Input from './Input';
import Textarea from './Textarea';
import { TASK_STATUS, TASK_STATUS_LABELS } from '../utils/constants';
import { formatDateTime } from '../utils/dateUtils';

const TaskEditModal = ({ isOpen, onClose, task, onSave, onDelete }) => {
  // Initialize form state
  const [formData, setFormData] = useState({
    title: '',
    status: TASK_STATUS.PLAN,
    start_datetime: '',
    end_datetime: '',
    is_all_day: false,
    is_internal_work: true,
    external_location: '',
    do_text: '',
    check_text: '',
    act_text: ''
  });
  
  const [error, setError] = useState('');
  
  // Update form data when task or selectedDateInfo changes
  useEffect(() => {
    if (task) {
      try {
        // Check if we have pre-formatted dates from the CalendarPage
        if (task.formattedStart && task.formattedEnd) {
          console.log('Using pre-formatted dates from task:', task.formattedStart, task.formattedEnd);
          
          setFormData({
            title: task.title || '',
            status: task.extendedProps?.status || TASK_STATUS.PLAN,
            start_datetime: task.formattedStart,
            end_datetime: task.formattedEnd,
            is_all_day: task.allDay || false,
            is_internal_work: task.extendedProps?.isInternalWork !== false,
            external_location: task.extendedProps?.externalLocation || '',
            do_text: task.extendedProps?.doText || '',
            check_text: task.extendedProps?.checkText || '',
            act_text: task.extendedProps?.actText || ''
          });
          return;
        }
        
        // Editing an existing task - ensure we get the exact date/time from the task object
        let startDate, endDate;
        
        // Safely parse start date
        if (task.start) {
          startDate = typeof task.start === 'string' ? new Date(task.start) : task.start;
        } else {
          // Default to current time if no start date
          startDate = new Date();
          console.warn('No start date provided for task, using current time');
        }
        
        // Safely parse end date
        if (task.end) {
          endDate = typeof task.end === 'string' ? new Date(task.end) : task.end;
        } else {
          // Default to start time + 1 hour if no end date
          endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
          console.warn('No end date provided for task, using start time + 1 hour');
        }
        
        // Format the dates properly for the datetime-local input
        const formattedStart = formatDateTime(startDate);
        const formattedEnd = formatDateTime(endDate);
        
        console.log('Task edit - calculated start:', formattedStart, 'end:', formattedEnd);
        
        setFormData({
          title: task.title || '',
          status: task.extendedProps?.status || TASK_STATUS.PLAN,
          start_datetime: formattedStart,
          end_datetime: formattedEnd,
          is_all_day: task.allDay || false,
          is_internal_work: task.extendedProps?.isInternalWork !== false,
          external_location: task.extendedProps?.externalLocation || '',
          do_text: task.extendedProps?.doText || '',
          check_text: task.extendedProps?.checkText || '',
          act_text: task.extendedProps?.actText || ''
        });
      } catch (error) {
        console.error('Error processing task dates:', error);
        // Set default dates if there's an error
        const now = new Date();
        const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
        
        setFormData({
          title: task.title || '',
          status: task.extendedProps?.status || TASK_STATUS.PLAN,
          start_datetime: formatDateTime(now),
          end_datetime: formatDateTime(oneHourLater),
          is_all_day: task.allDay || false,
          is_internal_work: task.extendedProps?.isInternalWork !== false,
          external_location: task.extendedProps?.externalLocation || '',
          do_text: task.extendedProps?.doText || '',
          check_text: task.extendedProps?.checkText || '',
          act_text: task.extendedProps?.actText || ''
        });
      }
    } else if (isOpen && !task && window.selectedDateInfo) {
      // Creating a new task from calendar click
      const dateInfo = window.selectedDateInfo;
      
      console.log('New task from selectedDateInfo:', dateInfo.formattedStart, dateInfo.formattedEnd);
      
      setFormData({
        title: '',
        status: TASK_STATUS.PLAN,
        start_datetime: dateInfo.formattedStart,
        end_datetime: dateInfo.formattedEnd,
        is_all_day: dateInfo.allDay || false,
        is_internal_work: true,
        external_location: '',
        do_text: '',
        check_text: '',
        act_text: ''
      });
    } else {
      // Default values for new task
      const now = new Date();
      const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
      
      setFormData({
        title: '',
        status: TASK_STATUS.PLAN,
        start_datetime: formatDateTime(now),
        end_datetime: formatDateTime(oneHourLater),
        is_all_day: false,
        is_internal_work: true,
        external_location: '',
        do_text: '',
        check_text: '',
        act_text: ''
      });
    }
    
    setError('');
  }, [task, isOpen]);
  
  // Handle input changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    console.log('TaskEditModal input changed:', name, type === 'checkbox' ? checked : value);
    
    // Use functional update to ensure we're working with the latest state
    setFormData(prevData => {
      const newData = {
        ...prevData,
        [name]: type === 'checkbox' ? checked : value
      };
      console.log('New form data:', JSON.stringify(newData, null, 2));
      return newData;
    });
  };
  
  // Handle direct input for select elements
  const handleSelectChange = (e) => {
    const { name, value } = e.target;
    console.log('Select changed:', name, value);
    
    setFormData(prevData => ({
      ...prevData,
      [name]: value
    }));
  };
  
  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate form
    if (!formData.title.trim()) {
      setError('업무명을 입력하세요.');
      return;
    }
    
    if (!formData.start_datetime || !formData.end_datetime) {
      setError('시작 및 종료 일시를 입력하세요.');
      return;
    }
    
    if (new Date(formData.start_datetime) > new Date(formData.end_datetime)) {
      setError('종료 일시는 시작 일시보다 나중이어야 합니다.');
      return;
    }
    
    // Clear error
    setError('');
    
    // Save task
    onSave(formData);
  };
  
  // Handle delete
  const handleDelete = () => {
    if (window.confirm('이 업무를 삭제하시겠습니까?')) {
      onDelete();
    }
  };
  
  // Modal footer buttons
  const renderFooter = () => (
    <>
      {task && (
        <button type="button" className="btn btn-danger" onClick={handleDelete}>
          삭제
        </button>
      )}
      <button type="button" className="btn btn-secondary" onClick={onClose}>
        취소
      </button>
      <button type="submit" className="btn" onClick={handleSubmit}>
        저장
      </button>
    </>
  );
  
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={task ? '업무 편집' : '새 업무 추가'}
      footer={renderFooter()}
    >
      <form className="task-form">
        {error && <div className="error-message full-width">{error}</div>}
        
        <div className="form-group full-width">
          <label htmlFor="title">업무명 (Plan)</label>
          <Input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            placeholder="업무명을 입력하세요"
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="status">상태</label>
          <select
            id="status"
            name="status"
            className="form-control"
            value={formData.status}
            onChange={handleSelectChange}
          >
            {Object.entries(TASK_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        
        <div className="form-group">
          <label htmlFor="is_all_day">종일 일정</label>
          <div>
            <input
              type="checkbox"
              id="is_all_day"
              name="is_all_day"
              checked={formData.is_all_day}
              onChange={handleChange}
            />
            <label htmlFor="is_all_day" style={{ display: 'inline', marginLeft: '5px' }}>
              종일
            </label>
          </div>
        </div>
        
        <div className="form-group">
          <label htmlFor="start_datetime">시작 일시</label>
          <Input
            type="datetime-local"
            id="start_datetime"
            name="start_datetime"
            value={formData.start_datetime}
            onChange={handleChange}
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="end_datetime">종료 일시</label>
          <Input
            type="datetime-local"
            id="end_datetime"
            name="end_datetime"
            value={formData.end_datetime}
            onChange={handleChange}
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="is_internal_work">업무 유형</label>
          <div>
            <input
              type="checkbox"
              id="is_internal_work"
              name="is_internal_work"
              checked={formData.is_internal_work}
              onChange={handleChange}
            />
            <label htmlFor="is_internal_work" style={{ display: 'inline', marginLeft: '5px' }}>
              내부 업무
            </label>
          </div>
        </div>
        
        <div className="form-group">
          <label htmlFor="external_location">외부 위치</label>
          <Input
            type="text"
            id="external_location"
            name="external_location"
            value={formData.external_location}
            onChange={handleChange}
            placeholder="외부 업무 위치"
            disabled={formData.is_internal_work}
          />
        </div>
        
        <div className="form-group full-width">
          <label htmlFor="do_text">Do (실행)</label>
          <Textarea
            id="do_text"
            name="do_text"
            value={formData.do_text}
            onChange={handleChange}
            placeholder="실행 내용을 입력하세요"
          />
        </div>
        
        <div className="form-group full-width">
          <label htmlFor="check_text">Check (점검)</label>
          <Textarea
            id="check_text"
            name="check_text"
            value={formData.check_text}
            onChange={handleChange}
            placeholder="점검 내용을 입력하세요"
          />
        </div>
        
        <div className="form-group full-width">
          <label htmlFor="act_text">Act (개선)</label>
          <Textarea
            id="act_text"
            name="act_text"
            value={formData.act_text}
            onChange={handleChange}
            placeholder="개선 내용을 입력하세요"
          />
        </div>
      </form>
    </Modal>
  );
};

export default TaskEditModal;
