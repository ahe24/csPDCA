// Calendar view component using FullCalendar
import React, { useEffect, useState, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { CALENDAR_CONFIG, TASK_STATUS_ICONS } from '../utils/constants';
import { formatDate, formatDateTime } from '../utils/dateUtils';

const CalendarView = ({ 
  tasks, 
  onTaskClick, 
  onDateClick, 
  onEventDrop, 
  onEventResize,
  onViewChange
}) => {
  const calendarRef = useRef(null);
  const [currentView, setCurrentView] = useState('dayGridMonth');
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Initialize the current view type in the window object
  useEffect(() => {
    window.currentViewType = 'dayGridMonth';
  }, []);
  
  // Handle date double-click (for creating new tasks)
  const handleDateClick = (info) => {
    // Only respond to double-clicks
    if (!info.jsEvent.detail || info.jsEvent.detail < 2) {
      return; // Not a double-click, ignore
    }
    
    const { date, allDay, view } = info;
    
    // Store the current view type in the window object
    window.currentViewType = view.type;
    
    // Create end time (1 hour after start)
    const endTime = new Date(date);
    endTime.setHours(endTime.getHours() + 1);
    
    // Preserve the exact time from the click
    const exactDateTime = {
      start: date,
      end: endTime,
      allDay: allDay || view.type === 'dayGridMonth',
      view: view.type
    };
    
    onDateClick(exactDateTime);
  };
  
  // Handle event double-click (for editing tasks)
  const handleEventClick = (info) => {
    // Only respond to double-clicks
    if (!info.jsEvent.detail || info.jsEvent.detail < 2) {
      return; // Not a double-click, ignore
    }
    
    const { event, view } = info;
    
    // Store the current view type in the window object
    window.currentViewType = currentView;
    
    // Create a task object with all the necessary information
    const taskData = {
      id: event.id,
      extendedProps: {
        id: event.extendedProps.id,
        status: event.extendedProps.status,
        doText: event.extendedProps.doText,
        checkText: event.extendedProps.checkText,
        actText: event.extendedProps.actText,
        isInternalWork: event.extendedProps.isInternalWork,
        externalLocation: event.extendedProps.externalLocation
      },
      title: event.title,
      start: event.start,
      end: event.end || new Date(event.start.getTime() + 60 * 60 * 1000),
      allDay: event.allDay
    };
    
    console.log('Double-clicked existing task:', taskData);
    
    onTaskClick(taskData);
  };
  
  // Handle event drop
  const handleEventDrop = (info) => {
    const { event, oldEvent, jsEvent, view } = info;
    
    // Store the current view type in the window object
    window.currentViewType = currentView;
    
    console.log(`Event dropped in view: ${currentView}, event:`, event);
    
    // Calculate the duration of the original task
    const originalStart = oldEvent.start;
    const originalEnd = oldEvent.end;
    const duration = originalEnd ? (originalEnd.getTime() - originalStart.getTime()) : 60 * 60 * 1000; // Default to 1 hour
    
    // Ensure we have an end time (either from the event or calculated)
    const endTime = event.end || new Date(event.start.getTime() + duration);
    
    // Check if Ctrl key is pressed for duplication
    if (jsEvent.ctrlKey) {
      // This is a duplicate operation - create a new task with same properties but new dates
      onEventDrop({
        id: event.extendedProps.id,
        start: event.start,
        end: endTime,
        allDay: event.allDay,
        duplicate: true, // Signal that this is a duplicate operation
        view: currentView
      });
    } else {
      // Regular move operation
      onEventDrop({
        id: event.extendedProps.id,
        start: event.start,
        end: endTime,
        allDay: event.allDay,
        duplicate: false,
        view: currentView
      });
    }
  };
  
  // Handle event resize
  const handleEventResize = (info) => {
    const { event } = info;
    
    // Store the current view type in the window object
    window.currentViewType = currentView;
    
    onEventResize({
      id: event.extendedProps.id,
      start: event.start,
      end: event.end,
      allDay: event.allDay,
      view: currentView
    });
  };
  
  // Handle view change
  const handleViewChange = (info) => {
    const { view } = info;
    setCurrentView(view.type);
    setCurrentDate(view.currentStart);
    
    // Store the current view type in the window object
    window.currentViewType = view.type;
    
    console.log('View change:', view.type, view.currentStart, view.currentEnd);
    
    // Format dates for string representation if needed
    const formattedStart = formatDate(view.currentStart);
    const formattedEnd = formatDate(view.currentEnd);
    
    console.log(`Formatted dates: ${formattedStart} to ${formattedEnd}`);
    
    // Pass the view information to the parent component
    onViewChange({
      viewType: view.type,
      start: view.currentStart,
      end: view.currentEnd,
      currentDate: view.currentStart
    });
  };
  
  // Get current view API
  const getCalendarApi = () => {
    return calendarRef.current?.getApi();
  };
  
  // Navigate to today
  const goToToday = () => {
    const calendarApi = getCalendarApi();
    if (calendarApi) {
      calendarApi.today();
    }
  };
  
  // Navigate to previous period
  const goToPrev = () => {
    const calendarApi = getCalendarApi();
    if (calendarApi) {
      calendarApi.prev();
    }
  };
  
  // Navigate to next period
  const goToNext = () => {
    const calendarApi = getCalendarApi();
    if (calendarApi) {
      calendarApi.next();
    }
  };
  
  // Change view type
  const changeView = (viewType) => {
    const calendarApi = getCalendarApi();
    if (calendarApi) {
      calendarApi.changeView(viewType);
    }
  };
  
  // Format event content with status icons
  const eventContent = (eventInfo) => {
    const { event, view } = eventInfo;
    const status = event.extendedProps.status || 'PLAN';
    const icon = TASK_STATUS_ICONS[status];
    const isAllDay = event.allDay;
    
    // In monthly view, hide time and just show icon + title
    if (view.type === 'dayGridMonth') {
      return {
        html: `<div class="fc-event-main-frame">
                <div class="fc-event-title-container">
                  <div class="fc-event-title">${icon} ${event.title}</div>
                </div>
              </div>`
      };
    }
    
    // In other views, show time and title with icon
    return {
      html: `<div class="fc-event-main-frame">
              <div class="fc-event-time">${eventInfo.timeText}</div>
              <div class="fc-event-title-container">
                <div class="fc-event-title">${icon} ${event.title}</div>
              </div>
            </div>`
    };
  };
  
  // Add custom class to all-day events
  const eventClassNames = (eventInfo) => {
    const { event } = eventInfo;
    const classes = [];
    
    if (event.allDay) {
      classes.push('fc-event-allday');
    }
    
    return classes;
  };
  
  return (
    <div className="calendar-container">
      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        {...CALENDAR_CONFIG}
        events={tasks}
        dateClick={handleDateClick}
        eventClick={handleEventClick}
        eventDrop={handleEventDrop}
        eventResize={handleEventResize}
        datesSet={handleViewChange}
        eventContent={eventContent}
        eventClassNames={eventClassNames}
      />
    </div>
  );
};

export default CalendarView;
