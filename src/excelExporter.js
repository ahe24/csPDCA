// Excel exporter module
const ExcelJS = require('exceljs');
const path = require('path');
const { dialog } = require('electron');
const Database = require('./database');

// Import dateUtils functions
// Note: We can't directly require from renderer utils because they use ES module syntax
// We'll implement the getWeekRange function directly here to match the original implementation
function getWeekRange(year, week) {
  if (!year || !week) {
    const now = new Date();
    return { start: now, end: now };
  }
  
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
  
  console.log(`Week range for ${year}-${week}: ${weekStart.toDateString()} to ${weekEnd.toDateString()}`);
  
  return {
    start: weekStart,
    end: weekEnd
  };
}

class ExcelExporter {
  constructor() {
    this.db = new Database();
  }
  
  // Export weekly report to Excel
  async exportToExcel(userId, yearWeek) {
    try {
      // Generate report data
      const reportData = await this.generateWeeklyReport(userId, yearWeek);
      
      // Create default filename
      const defaultFilename = `PDCA_Report_${yearWeek}.xlsx`;
      
      // Show save dialog
      const result = await dialog.showSaveDialog({
        title: 'Save Excel Report',
        defaultPath: path.join(process.cwd(), defaultFilename),
        filters: [{ name: 'Excel Files', extensions: ['xlsx'] }],
        properties: ['createDirectory', 'showOverwriteConfirmation']
      });
      
      if (result.canceled) {
        return { success: false, canceled: true };
      }
      
      // Create workbook
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'csPDCA';
      workbook.lastModifiedBy = reportData.user ? reportData.user.name || reportData.user.username : 'User';
      workbook.created = new Date();
      workbook.modified = new Date();
      
      // Add report content to workbook with multiple sheets
      this.addReportToWorksheet(workbook, reportData);
      
      // Save workbook - will overwrite if file exists
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
      // Get week range
      const [year, week] = yearWeek.split('-').map(Number);
      const weekRange = getWeekRange(parseInt(year), parseInt(week));
      
      // Get user information
      const user = await this.db.getUserById(userId);
      
      // Get weekly plan
      const weeklyPlan = await this.db.getWeeklyPlan(userId, yearWeek);
      
      // Get monthly plan
      const yearMonth = `${year}-${this.getMonthFromWeek(yearWeek)}`;
      const monthlyPlan = await this.db.getMonthlyPlan(userId, yearMonth);
      
      // Get tasks for the week
      const { tasks, stats } = await this.db.getTaskStatsByWeek(userId, yearWeek);
      
      // Process tasks to fix all-day task dates
      const processedTasks = tasks.map(task => {
        const processedTask = { ...task };
        
        // For all-day tasks, create a display_date property
        if (processedTask.is_all_day === 1) {
          const dateParts = processedTask.start_datetime.split('T')[0].split('-');
          processedTask.display_date = `${parseInt(dateParts[1])}.${parseInt(dateParts[2])}.`;
          console.log(`Fixed all-day task date: ${processedTask.title}, Display date: ${processedTask.display_date}`);
        }
        
        return processedTask;
      });
      
      // Get monthly stats
      const { stats: monthlyStats } = await this.db.getTaskStatsByMonth(userId, yearMonth);
      
      // Get next week tasks
      const nextWeekTasks = await this.getNextWeekTasks(userId, yearWeek);
      
      return {
        user,
        yearWeek,
        yearMonth,
        weekRange,
        weeklyPlan: weeklyPlan ? weeklyPlan.plan_content : '',
        monthlyPlan: monthlyPlan ? monthlyPlan.plan_content : '',
        tasks: processedTasks,
        stats,
        monthlyStats,
        nextWeekTasks
      };
    } catch (error) {
      console.error('Generate weekly report error:', error);
      throw error;
    }
  }
  
  // Get tasks for next week
  async getNextWeekTasks(userId, yearWeek) {
    try {
      // Parse year and week
      const [year, week] = yearWeek.split('-').map(Number);
      
      // Calculate next week
      let nextWeek = week + 1;
      let nextYear = year;
      
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
  
  // Add report content to workbook with multiple sheets
  addReportToWorksheet(workbook, reportData) {
    // Create styles for use across all sheets
    const styles = this.createStyles();
    
    // Create Sheet 1: Plans and Statistics
    this.createPlansAndStatsSheet(workbook, reportData, styles);
    
    // Create Sheet 2: This Week Tasks
    this.createThisWeekTasksSheet(workbook, reportData, styles);
    
    // Create Sheet 3: Next Week Tasks (if available)
    if (reportData.nextWeekTasks && reportData.nextWeekTasks.length > 0) {
      this.createNextWeekTasksSheet(workbook, reportData, styles);
    }
  }
  
  // Create common styles for all sheets
  createStyles() {
    return {
      title: {
        font: { size: 16, bold: true, color: { argb: '303F9F' } },
        alignment: { horizontal: 'center', vertical: 'middle' },
        border: {
          bottom: { style: 'medium', color: { argb: '3F51B5' } }
        },
        fill: {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'E8EAF6' } // Light indigo
        }
      },
      sectionHeader: {
        font: { size: 14, bold: true, color: { argb: '303F9F' } },
        fill: {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'C5CAE9' } // Indigo 100
        },
        alignment: { horizontal: 'center', vertical: 'middle' },
        border: {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        }
      },
      subHeader: {
        font: { size: 12, bold: true, color: { argb: '3F51B5' } },
        alignment: { horizontal: 'center', vertical: 'middle' },
        border: {
          bottom: { style: 'thin', color: { argb: '7986CB' } }
        }
      },
      tableHeader: {
        font: { size: 12, bold: true, color: { argb: 'FFFFFF' } },
        fill: {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: '3F51B5' } // Indigo 500
        },
        alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
        border: {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        }
      },
      cell: {
        font: { size: 11 },
        alignment: { vertical: 'middle', horizontal: 'left' },
        border: {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        }
      },
      wrapText: {
        alignment: { wrapText: true, vertical: 'top' }
      },
      statsLabel: {
        font: { bold: true, size: 11 },
        alignment: { horizontal: 'right', vertical: 'middle' }
      },
      statsValue: {
        font: { size: 11 },
        alignment: { horizontal: 'left', vertical: 'middle' }
      },
      // Task status styles with color coding
      statusCompleted: {
        fill: {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'C8E6C9' } // Light green (Green 100)
        }
      },
      statusDelayed: {
        fill: {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFECB3' } // Light amber (Amber 100)
        }
      },
      statusCanceled: {
        fill: {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFCDD2' } // Light red (Red 100)
        }
      },
      statusPlan: {
        fill: {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'E3F2FD' } // Light blue (Blue 50)
        }
      },
      // Legend styles
      legend: {
        font: { size: 10, italic: true },
        alignment: { horizontal: 'left', vertical: 'middle' }
      },
      legendItem: {
        alignment: { horizontal: 'center', vertical: 'middle' },
        border: {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        }
      }
    };
  }
  
  // Create Sheet 1: Plans and Statistics
  createPlansAndStatsSheet(workbook, reportData, styles) {
    // Create the sheet
    const worksheet = workbook.addWorksheet('계획 및 통계');
    
    // Set column widths
    worksheet.columns = [
      { header: '', key: 'col1', width: 20 },
      { header: '', key: 'col2', width: 20 },
      { header: '', key: 'col3', width: 20 },
      { header: '', key: 'col4', width: 20 },
      { header: '', key: 'col5', width: 20 }
    ];
    
    // Add report title
    const titleRow = worksheet.addRow(['PDCA Report']);
    worksheet.mergeCells('A1:E1');
    titleRow.height = 30;
    const titleCell = worksheet.getCell('A1');
    titleCell.value = `PDCA Report: ${reportData.yearWeek} (${reportData.weekRange.start.toLocaleDateString('ko-KR')} - ${reportData.weekRange.end.toLocaleDateString('ko-KR')})`;
    titleCell.style = styles.title;
    
    // Add empty row
    worksheet.addRow([]);
    
    // Add monthly section
    const monthlySectionRow = worksheet.addRow(['월간 계획 및 통계']);
    worksheet.mergeCells('A3:E3');
    const monthlySectionCell = worksheet.getCell('A3');
    monthlySectionCell.style = styles.sectionHeader;
    
    // Add monthly plan
    const monthlyPlanHeaderRow = worksheet.addRow(['월간 계획']);
    worksheet.mergeCells('A4:E4');
    monthlyPlanHeaderRow.getCell(1).style = styles.subHeader;
    
    // Add monthly plan content
    const monthlyPlanRow = worksheet.addRow([reportData.monthlyPlan || '등록된 월간 계획이 없습니다.']);
    worksheet.mergeCells('A5:E5');
    monthlyPlanRow.height = 60;
    const monthlyPlanCell = worksheet.getCell('A5');
    monthlyPlanCell.style = { ...styles.cell, ...styles.wrapText };
    
    // Add empty row
    worksheet.addRow([]);
    
    // Add monthly stats header
    const monthlyStatsHeaderRow = worksheet.addRow(['월간 업무 통계']);
    worksheet.mergeCells('A7:E7');
    monthlyStatsHeaderRow.getCell(1).style = styles.subHeader;
    
    // Add monthly stats
    const monthlyStatsRow = worksheet.addRow([
      `전체 업무: ${reportData.monthlyStats ? reportData.monthlyStats.total : 0}`,
      `완료: ${reportData.monthlyStats ? reportData.monthlyStats.completed : 0}`,
      `취소: ${reportData.monthlyStats ? reportData.monthlyStats.canceled : 0}`,
      `계획 중: ${reportData.monthlyStats ? reportData.monthlyStats.planned : 0}`,
      `완료율: ${reportData.monthlyStats ? reportData.monthlyStats.completionRate.toFixed(2) : '0.00'}%`
    ]);
    for (let i = 1; i <= 5; i++) {
      monthlyStatsRow.getCell(i).style = styles.cell;
    }
    
    // Add empty row
    worksheet.addRow([]);
    
    // Add weekly section
    const weeklySectionRow = worksheet.addRow(['주간 계획 및 통계']);
    worksheet.mergeCells('A10:E10');
    const weeklySectionCell = worksheet.getCell('A10');
    weeklySectionCell.style = styles.sectionHeader;
    
    // Add weekly plan
    const weeklyPlanHeaderRow = worksheet.addRow(['주간 계획']);
    worksheet.mergeCells('A11:E11');
    weeklyPlanHeaderRow.getCell(1).style = styles.subHeader;
    
    // Add weekly plan content
    const weeklyPlanRow = worksheet.addRow([reportData.weeklyPlan || '등록된 주간 계획이 없습니다.']);
    worksheet.mergeCells('A12:E12');
    weeklyPlanRow.height = 60;
    const weeklyPlanCell = worksheet.getCell('A12');
    weeklyPlanCell.style = { ...styles.cell, ...styles.wrapText };
    
    // Add empty row
    worksheet.addRow([]);
    
    // Add weekly stats header
    const weeklyStatsHeaderRow = worksheet.addRow(['주간 업무 통계']);
    worksheet.mergeCells('A14:E14');
    weeklyStatsHeaderRow.getCell(1).style = styles.subHeader;
    
    // Add weekly stats
    const weeklyStatsRow = worksheet.addRow([
      `전체 업무: ${reportData.stats.total}`,
      `완료: ${reportData.stats.completed}`,
      `취소: ${reportData.stats.canceled || 0}`,
      `계획 중: ${reportData.stats.planned || 0}`,
      `완료율: ${reportData.stats.completionRate.toFixed(2)}%`
    ]);
    for (let i = 1; i <= 5; i++) {
      weeklyStatsRow.getCell(i).style = styles.cell;
    }
    
    // Apply borders to all cells
    this.applyBordersToAllCells(worksheet);
  }
  
  // Create Sheet 2: This Week Tasks
  createThisWeekTasksSheet(workbook, reportData, styles) {
    // Create the sheet
    const worksheet = workbook.addWorksheet('금주 업무 현황');
    
    // Set column widths
    worksheet.columns = [
      { header: '날짜', key: 'date', width: 15 },
      { header: '업무명', key: 'title', width: 30 },
      { header: '시작 시간', key: 'startTime', width: 15 },
      { header: '작업 시간', key: 'duration', width: 15 },
      { header: '작업 위치', key: 'location', width: 15 },
      { header: 'Do (실행)', key: 'do', width: 30 },
      { header: 'Check (점검)', key: 'check', width: 30 },
      { header: 'Act (개선)', key: 'act', width: 30 }
    ];
    
    // Add report title
    const titleRow = worksheet.addRow([`금주 업무 현황: ${reportData.yearWeek}`]);
    worksheet.mergeCells('A1:H1');
    titleRow.height = 30;
    const titleCell = worksheet.getCell('A1');
    titleCell.style = styles.title;
    
    // Add empty row
    worksheet.addRow([]);
    
    // Add tasks header
    const headers = [
      '날짜',
      '업무명',
      '시작 시간',
      '작업 시간',
      '작업 위치',
      '상태',
      'Do (실행)',
      'Check (점검)',
      'Act (개선)'
    ];
    const headerRow = worksheet.addRow(headers);
    for (let i = 1; i <= 9; i++) {
      headerRow.getCell(i).style = styles.tableHeader;
    }
    
    // Enable auto-filtering for the header row
    worksheet.autoFilter = {
      from: { row: headerRow.number, column: 1 },
      to: { row: headerRow.number, column: 9 }
    };
    
    // Calculate task statistics
    const taskStats = this.calculateTaskStats(reportData.tasks);
    
    // Add statistics section
    const statsRow = worksheet.addRow(['업무 통계']);
    worksheet.mergeCells(`A${statsRow.number}:H${statsRow.number}`);
    statsRow.getCell(1).style = styles.sectionHeader;
    
    // Add statistics details
    const statsDetailsRow = worksheet.addRow([
      '전체 업무', `${taskStats.total}개`,
      '완료', `${taskStats.completed}개 (${taskStats.completionRate}%)`,
      '지연', `${taskStats.delayed}개`,
      '취소', `${taskStats.canceled}개`
    ]);
    
    // Style the statistics row
    for (let i = 1; i <= 8; i += 2) {
      if (i <= 7) { // Only apply to cells that have content
        statsDetailsRow.getCell(i).style = styles.statsLabel;
        statsDetailsRow.getCell(i + 1).style = styles.statsValue;
      }
    }
    
    // Add a visual representation of task statistics using cells instead of charts
    worksheet.addRow([]); // Add empty row
    
    // Add a visual statistics header
    const visualStatsRow = worksheet.addRow(['상태별 통계 (시각화)']);
    worksheet.mergeCells(`A${visualStatsRow.number}:H${visualStatsRow.number}`);
    visualStatsRow.getCell(1).style = styles.subHeader;
    
    // Create a visual representation using colored cells
    if (taskStats.total > 0) {
      // Header row for the visual representation
      const visualHeaderRow = worksheet.addRow(['상태', '개수', '비율', '시각화']);
      for (let i = 1; i <= 4; i++) {
        visualHeaderRow.getCell(i).style = styles.tableHeader;
      }
      
      // Calculate percentages
      const completedPercent = taskStats.total > 0 ? Math.round((taskStats.completed / taskStats.total) * 100) : 0;
      const delayedPercent = taskStats.total > 0 ? Math.round((taskStats.delayed / taskStats.total) * 100) : 0;
      const canceledPercent = taskStats.total > 0 ? Math.round((taskStats.canceled / taskStats.total) * 100) : 0;
      const planPercent = taskStats.total > 0 ? Math.round((taskStats.plan / taskStats.total) * 100) : 0;
      
      // Add completed row
      const completedRow = worksheet.addRow(['완료', taskStats.completed, `${completedPercent}%`, '']);
      completedRow.getCell(1).style = { ...styles.cell, alignment: { horizontal: 'center' } };
      completedRow.getCell(2).style = { ...styles.cell, alignment: { horizontal: 'center' } };
      completedRow.getCell(3).style = { ...styles.cell, alignment: { horizontal: 'center' } };
      completedRow.getCell(4).style = { ...styles.cell, ...styles.statusCompleted };
      
      // Add delayed row
      const delayedRow = worksheet.addRow(['지연', taskStats.delayed, `${delayedPercent}%`, '']);
      delayedRow.getCell(1).style = { ...styles.cell, alignment: { horizontal: 'center' } };
      delayedRow.getCell(2).style = { ...styles.cell, alignment: { horizontal: 'center' } };
      delayedRow.getCell(3).style = { ...styles.cell, alignment: { horizontal: 'center' } };
      delayedRow.getCell(4).style = { ...styles.cell, ...styles.statusDelayed };
      
      // Add canceled row
      const canceledRow = worksheet.addRow(['취소', taskStats.canceled, `${canceledPercent}%`, '']);
      canceledRow.getCell(1).style = { ...styles.cell, alignment: { horizontal: 'center' } };
      canceledRow.getCell(2).style = { ...styles.cell, alignment: { horizontal: 'center' } };
      canceledRow.getCell(3).style = { ...styles.cell, alignment: { horizontal: 'center' } };
      canceledRow.getCell(4).style = { ...styles.cell, ...styles.statusCanceled };
      
      // Add plan row
      const planRow = worksheet.addRow(['계획', taskStats.plan, `${planPercent}%`, '']);
      planRow.getCell(1).style = { ...styles.cell, alignment: { horizontal: 'center' } };
      planRow.getCell(2).style = { ...styles.cell, alignment: { horizontal: 'center' } };
      planRow.getCell(3).style = { ...styles.cell, alignment: { horizontal: 'center' } };
      planRow.getCell(4).style = { ...styles.cell, ...styles.statusPlan };
    }
    
    // Add empty row
    worksheet.addRow([]);
    
    // Add status legend
    const legendRow = worksheet.addRow(['상태 구분:']);
    worksheet.mergeCells(`A${legendRow.number}:H${legendRow.number}`);
    legendRow.getCell(1).style = styles.legend;
    
    // Create legend items row
    const legendItemsRow = worksheet.addRow(['', '완료', '', '진행중', '', '지연', '', '취소']);
    
    // Apply color-coding to legend items
    legendItemsRow.getCell(2).style = { ...styles.legendItem, ...styles.statusCompleted };
    legendItemsRow.getCell(4).style = { ...styles.legendItem, ...styles.statusPlan };
    legendItemsRow.getCell(6).style = { ...styles.legendItem, ...styles.statusDelayed };
    legendItemsRow.getCell(8).style = { ...styles.legendItem, ...styles.statusCanceled };
    
    // Add empty row
    worksheet.addRow([]);
    
    // Add tasks list header
    const tasksListRow = worksheet.addRow(['업무 목록']);
    worksheet.mergeCells(`A${tasksListRow.number}:H${tasksListRow.number}`);
    tasksListRow.getCell(1).style = styles.sectionHeader;
    
    // Sort tasks by date
    const sortedTasks = [...reportData.tasks].sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime));
    
    // Add tasks
    sortedTasks.forEach(task => {
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
        dateDisplay = date.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' });
      }
      
      const startDate = new Date(task.start_datetime);
      const endDate = new Date(task.end_datetime);
      
      // Translate status to Korean
      let statusText = '계획'; // Default: 계획 (Plan)
      switch (task.status) {
        case 'COMPLETED':
          statusText = '완료'; // 완료 (Completed)
          break;
        case 'DELAYED':
          statusText = '지연'; // 지연 (Delayed)
          break;
        case 'CANCELED':
          statusText = '취소'; // 취소 (Canceled)
          break;
      }
      
      const taskRow = worksheet.addRow([
        dateDisplay,
        task.title,
        task.is_all_day === 1 ? '종일' : startDate.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
        task.is_all_day === 1 ? '종일' : ((endDate - startDate) / (1000 * 60 * 60)).toFixed(1) + '시간',
        task.is_internal_work === 1 ? '내근' : task.external_location || '외부',
        statusText,
        task.do_text || '-',
        task.check_text || '-',
        task.act_text || '-'
      ]);
      
      // Apply cell styles and color-coding based on task status
      const statusStyle = this.getStatusStyle(task.status, styles);
      
      for (let i = 1; i <= 9; i++) {
        const cell = taskRow.getCell(i);
        cell.style = { ...styles.cell, ...statusStyle };
        
        // Add word wrap for PDCA columns
        if (i >= 7) {
          cell.alignment = { ...cell.alignment, wrapText: true };
        }
        
        // Center-align status column
        if (i === 6) {
          cell.alignment = { ...cell.alignment, horizontal: 'center' };
        }
      }
    });
    
    // Apply borders to all cells
    this.applyBordersToAllCells(worksheet);
  }
  
  // Create Sheet 3: Next Week Tasks
  createNextWeekTasksSheet(workbook, reportData, styles) {
    // Create the sheet
    const worksheet = workbook.addWorksheet('차주 계획');
    
    // Set column widths
    worksheet.columns = [
      { header: '날짜', key: 'date', width: 15 },
      { header: '업무명', key: 'title', width: 30 },
      { header: '시작 시간', key: 'startTime', width: 15 },
      { header: '작업 시간', key: 'duration', width: 15 },
      { header: '작업 위치', key: 'location', width: 15 },
      { header: '상태', key: 'status', width: 15 }
    ];
    
    // Add report title
    const titleRow = worksheet.addRow([`차주 계획: ${reportData.yearWeek}`]);
    worksheet.mergeCells('A1:F1');
    titleRow.height = 30;
    const titleCell = worksheet.getCell('A1');
    titleCell.style = styles.title;
    
    // Add empty row
    worksheet.addRow([]);
    
    // Add tasks header
    const headers = [
      '날짜',
      '업무명',
      '시작 시간',
      '작업 시간',
      '작업 위치',
      '상태'
    ];
    const headerRow = worksheet.addRow(headers);
    for (let i = 1; i <= 6; i++) {
      headerRow.getCell(i).style = styles.tableHeader;
    }
    
    // Enable auto-filtering for the header row
    worksheet.autoFilter = {
      from: { row: headerRow.number, column: 1 },
      to: { row: headerRow.number, column: 6 }
    };
    
    // Calculate next week task statistics
    const nextWeekTaskStats = this.calculateTaskStats(reportData.nextWeekTasks);
    
    // Add statistics section
    const statsRow = worksheet.addRow(['업무 통계']);
    worksheet.mergeCells(`A${statsRow.number}:E${statsRow.number}`);
    statsRow.getCell(1).style = styles.sectionHeader;
    
    // Add statistics details
    worksheet.addRow([
      '전체 계획', `${nextWeekTaskStats.total}개`,
      '완료 예정', `${nextWeekTaskStats.plan}개`,
      '', ''
    ]);
    
    // Add empty row
    worksheet.addRow([]);
    
    // Add tasks list header
    const tasksListRow = worksheet.addRow(['업무 목록']);
    worksheet.mergeCells(`A${tasksListRow.number}:E${tasksListRow.number}`);
    tasksListRow.getCell(1).style = styles.sectionHeader;
    
    // Sort next week tasks by date
    const sortedNextWeekTasks = [...reportData.nextWeekTasks].sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime));
    
    // Add next week tasks
    sortedNextWeekTasks.forEach(task => {
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
        dateDisplay = date.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' });
      }
      
      const startDate = new Date(task.start_datetime);
      const endDate = new Date(task.end_datetime);
      
      // Translate status to Korean
      let statusText = '계획'; // Default: 계획 (Plan)
      switch (task.status) {
        case 'COMPLETED':
          statusText = '완료'; // 완료 (Completed)
          break;
        case 'DELAYED':
          statusText = '지연'; // 지연 (Delayed)
          break;
        case 'CANCELED':
          statusText = '취소'; // 취소 (Canceled)
          break;
      }
      
      const taskRow = worksheet.addRow([
        dateDisplay,
        task.title,
        task.is_all_day === 1 ? '종일' : startDate.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
        task.is_all_day === 1 ? '종일' : ((endDate - startDate) / (1000 * 60 * 60)).toFixed(1) + '시간',
        task.is_internal_work === 1 ? '내근' : task.external_location || '외부',
        statusText
      ]);
      
      // Apply cell styles and color-coding based on task status
      const statusStyle = this.getStatusStyle(task.status, styles);
      
      for (let i = 1; i <= 6; i++) {
        taskRow.getCell(i).style = { ...styles.cell, ...statusStyle };
        
        // Center-align status column
        if (i === 6) {
          taskRow.getCell(i).alignment = { ...taskRow.getCell(i).alignment, horizontal: 'center' };
        }
      }
    });
    
    // Apply borders to all cells
    this.applyBordersToAllCells(worksheet);
  }
  
  // Helper method to calculate task statistics
  calculateTaskStats(tasks) {
    const stats = {
      total: tasks.length,
      completed: 0,
      delayed: 0,
      canceled: 0,
      plan: 0,
      completionRate: 0
    };
    
    tasks.forEach(task => {
      switch (task.status) {
        case 'COMPLETED':
          stats.completed++;
          break;
        case 'DELAYED':
          stats.delayed++;
          break;
        case 'CANCELED':
          stats.canceled++;
          break;
        case 'PLAN':
        default:
          stats.plan++;
          break;
      }
    });
    
    // Calculate completion rate (completed tasks / total non-canceled tasks)
    const nonCanceledTasks = stats.total - stats.canceled;
    stats.completionRate = nonCanceledTasks > 0 ? (stats.completed / nonCanceledTasks * 100).toFixed(1) : 0;
    
    return stats;
  }
  
  // Helper method to get style based on task status
  getStatusStyle(status, styles) {
    switch (status) {
      case 'COMPLETED':
        return styles.statusCompleted;
      case 'DELAYED':
        return styles.statusDelayed;
      case 'CANCELED':
        return styles.statusCanceled;
      case 'PLAN':
      default:
        return styles.statusPlan;
    }
  }
  
  // Helper method to apply borders to all cells in a worksheet and set proper row heights
  applyBordersToAllCells(worksheet) {
    worksheet.eachRow((row, rowNumber) => {
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        if (!cell.style || !cell.style.border) {
          cell.style = cell.style || {};
          cell.style.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
        }
      });
      
      // Set explicit row heights instead of auto-fit
      // Title rows are taller
      if (row.getCell(1).style && row.getCell(1).style.font && row.getCell(1).style.font.bold) {
        if (row.getCell(1).style.font.size >= 16) {
          row.height = 30; // Title rows
        } else if (row.getCell(1).style.font.size >= 14) {
          row.height = 25; // Section header rows
        } else {
          row.height = 20; // Other header rows
        }
      } else {
        // Check if the row contains wrapped text
        let hasWrappedText = false;
        row.eachCell({ includeEmpty: false }, (cell) => {
          if (cell.style && cell.style.alignment && cell.style.alignment.wrapText) {
            hasWrappedText = true;
          }
        });
        
        // Set appropriate height based on content
        if (hasWrappedText) {
          // For PDCA columns with potentially long text
          const text = row.getCell(7) ? row.getCell(7).text || '' : '';
          const lineCount = text.split('\n').length;
          row.height = Math.max(20, Math.min(80, 20 + (lineCount * 15))); // Min 20, max 80
        } else {
          row.height = 20; // Standard data rows
        }
      }
    });
  }
}

module.exports = ExcelExporter;
