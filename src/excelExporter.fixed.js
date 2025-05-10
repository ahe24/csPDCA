// Excel exporter module
const ExcelJS = require('exceljs');
const path = require('path');
const { dialog } = require('electron');
const Database = require('./database');
const { getWeekRange } = require('./renderer/utils/dateUtils');

class ExcelExporter {
  constructor() {
    this.db = new Database();
  }
  
  // Export weekly report to Excel
  async exportToExcel(userId, yearWeek) {
    try {
      // Generate report data
      const reportData = await this.generateWeeklyReport(userId, yearWeek);
      
      // Show save dialog
      const result = await dialog.showSaveDialog({
        title: 'Save Excel Report',
        defaultPath: path.join(process.cwd(), `PDCA_Report_${yearWeek}.xlsx`),
        filters: [{ name: 'Excel Files', extensions: ['xlsx'] }]
      });
      
      if (result.canceled) {
        return { success: false, canceled: true };
      }
      
      // Create workbook
      const workbook = new ExcelJS.Workbook();
      
      // Add worksheet
      const worksheet = workbook.addWorksheet('PDCA Report');
      
      // Add report content to worksheet
      this.addReportToWorksheet(worksheet, reportData);
      
      // Save workbook
      await workbook.xlsx.writeFile(result.filePath);
      
      return { success: true, filePath: result.filePath };
    } catch (error) {
      console.error('Export to Excel error:', error);
      return { success: false, error: error.message };
    }
  }
  
  // Generate weekly report data
  async generateWeeklyReport(userId, yearWeek) {
    try {
      // Get weekly plan
      const weeklyPlan = await this.db.getWeeklyPlan(userId, yearWeek);
      
      // Get task statistics for the week
      const { stats, tasks } = await this.db.getTaskStatsByWeek(userId, yearWeek);
      
      // Debug: Log all tasks to check dates
      console.log('All tasks from database:');
      tasks.forEach(task => {
        console.log(`Task: ${task.title}, Start Date: ${task.start_datetime}, End Date: ${task.end_datetime}, Is All Day: ${task.is_all_day}`);
      });
      
      // Process tasks to fix date display for all-day events
      const processedTasks = tasks.map(task => {
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
      });
      
      // Get user information
      const user = await this.db.getUserById(userId);
      
      // Get monthly plan and statistics
      const yearMonth = yearWeek.split('-')[0] + '-' + this.getMonthFromWeek(yearWeek);
      const monthlyPlan = await this.db.getMonthlyPlan(userId, yearMonth);
      const monthlyStats = await this.db.getTaskStatsByMonth(userId, yearMonth);
      
      // Get next week's tasks
      const nextWeekTasks = await this.getNextWeekTasks(userId, yearWeek);
      
      return {
        user,
        yearWeek,
        weekRange: getWeekRange(yearWeek),
        weeklyPlan: weeklyPlan ? weeklyPlan.plan_content : '',
        stats,
        tasks: processedTasks, // Use the processed tasks with fixed dates
        monthlyPlan: monthlyPlan ? monthlyPlan.plan_content : '',
        monthlyStats,
        nextWeekTasks
      };
    } catch (error) {
      console.error('Generate weekly report error:', error);
      throw error;
    }
  }
  
  // Get next week's tasks
  async getNextWeekTasks(userId, yearWeek) {
    try {
      // Parse year and week from yearWeek (format: YYYY-WW)
      const [year, week] = yearWeek.split('-');
      
      // Calculate next week
      const nextWeek = parseInt(week) + 1;
      const nextYear = parseInt(year);
      
      // Handle week 53 (wrap to next year)
      const nextYearWeek = nextWeek > 52 ? `${nextYear + 1}-01` : `${nextYear}-${nextWeek.toString().padStart(2, '0')}`;
      
      // Get tasks for next week
      const { tasks } = await this.db.getTaskStatsByWeek(userId, nextYearWeek);
      
      return tasks;
    } catch (error) {
      console.error('Get next week tasks error:', error);
      return [];
    }
  }
  
  // Get month from week number
  getMonthFromWeek(yearWeek) {
    const [year, week] = yearWeek.split('-');
    
    // Calculate the date of the week
    const weekDate = new Date(parseInt(year), 0, 1 + (parseInt(week) - 1) * 7);
    
    // Get month (add 1 because getMonth() returns 0-11)
    const month = (weekDate.getMonth() + 1).toString().padStart(2, '0');
    
    return month;
  }
  
  // Add report content to worksheet
  addReportToWorksheet(worksheet, reportData) {
    // Set column widths
    worksheet.columns = [
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Title', key: 'title', width: 30 },
      { header: 'Start Time', key: 'startTime', width: 15 },
      { header: 'Duration', key: 'duration', width: 15 },
      { header: 'Location', key: 'location', width: 15 },
      { header: 'Do', key: 'do', width: 30 },
      { header: 'Check', key: 'check', width: 30 },
      { header: 'Act', key: 'act', width: 30 }
    ];
    
    // Add header
    worksheet.addRow({
      date: `PDCA Report: ${reportData.yearWeek}`,
      title: `${reportData.weekRange.start.toLocaleDateString()} - ${reportData.weekRange.end.toLocaleDateString()}`
    });
    
    // Add empty row
    worksheet.addRow({});
    
    // Add weekly plan
    worksheet.addRow({ date: 'Weekly Plan' });
    worksheet.addRow({ date: reportData.weeklyPlan });
    
    // Add empty row
    worksheet.addRow({});
    
    // Add tasks header
    worksheet.addRow({
      date: 'Date',
      title: 'Title',
      startTime: 'Start Time',
      duration: 'Duration',
      location: 'Location',
      do: 'Do',
      check: 'Check',
      act: 'Act'
    });
    
    // Add tasks
    reportData.tasks.forEach(task => {
      let dateDisplay;
      
      // For all-day tasks, use the display_date property
      if (task.is_all_day === 1 && task.display_date) {
        dateDisplay = task.display_date;
      } else if (task.is_all_day === 1) {
        // Fallback to direct string parsing
        const dateStr = task.start_datetime.split('T')[0];
        const dateParts = dateStr.split('-');
        dateDisplay = `${parseInt(dateParts[1])}.${parseInt(dateParts[2])}.`;
      } else {
        const date = new Date(task.start_datetime);
        dateDisplay = date.toLocaleDateString();
      }
      
      const startDate = new Date(task.start_datetime);
      const endDate = new Date(task.end_datetime);
      
      worksheet.addRow({
        date: dateDisplay,
        title: task.title,
        startTime: task.is_all_day === 1 ? '종일' : startDate.toLocaleTimeString(),
        duration: task.is_all_day === 1 ? '종일' : ((endDate - startDate) / (1000 * 60 * 60)).toFixed(1) + '시간',
        location: task.is_internal_work === 1 ? '내부' : task.external_location || '외부',
        do: task.do_text || '',
        check: task.check_text || '',
        act: task.act_text || ''
      });
    });
  }
}

module.exports = ExcelExporter;
