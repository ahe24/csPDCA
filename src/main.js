// Main process entry point for csPDCA application
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const Database = require('./database');
const Auth = require('./auth');
const ExcelExporter = require('./excelExporter');

// Initialize database
const db = new Database();

// Initialize authentication
const auth = new Auth(db);

// Initialize Excel exporter
const excelExporter = new ExcelExporter(db);

// Keep a global reference of the window object to prevent garbage collection
let mainWindow;

// Create the main application window
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // Check if user is already logged in
  const loggedInUser = auth.getLoggedInUser();
  
  if (loggedInUser) {
    // User is logged in, load main application
    mainWindow.loadFile(path.join(__dirname, 'html', 'index.html'));
  } else {
    // User is not logged in, load login page
    mainWindow.loadFile(path.join(__dirname, 'html', 'login.html'));
  }

  // Open DevTools in development mode
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  // Handle window close
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Create window when Electron has finished initialization
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    // On macOS, recreate window when dock icon is clicked and no windows are open
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Authentication IPC handlers
ipcMain.handle('login', async (event, { username, password }) => {
  try {
    const user = await auth.login(username, password);
    if (user) {
      // Load main application after successful login
      mainWindow.loadFile(path.join(__dirname, 'html', 'index.html'));
    }
    return user;
  } catch (error) {
    console.error('Login error:', error);
    return { error: error.message };
  }
});

ipcMain.handle('register', async (event, userData) => {
  try {
    const result = await auth.register(userData);
    return result;
  } catch (error) {
    console.error('Registration error:', error);
    return { error: error.message };
  }
});

ipcMain.handle('logout', async (event) => {
  try {
    await auth.logout();
    // Load login page after logout
    mainWindow.loadFile(path.join(__dirname, 'html', 'login.html'));
    return { success: true };
  } catch (error) {
    console.error('Logout error:', error);
    return { error: error.message };
  }
});

ipcMain.handle('recover-password', async (event, { username, securityQuestion, securityAnswer, newPassword }) => {
  try {
    const result = await auth.recoverPassword(username, securityQuestion, securityAnswer, newPassword);
    return result;
  } catch (error) {
    console.error('Password recovery error:', error);
    return { error: error.message };
  }
});

ipcMain.handle('get-current-user', async (event) => {
  try {
    const user = auth.getLoggedInUser();
    return user || null;
  } catch (error) {
    console.error('Get current user error:', error);
    return null;
  }
});

// Task management IPC handlers
ipcMain.handle('get-tasks', async (event, { userId, startDate, endDate }) => {
  try {
    const tasks = await db.getTasks(userId, startDate, endDate);
    return tasks;
  } catch (error) {
    console.error('Get tasks error:', error);
    return { error: error.message };
  }
});

ipcMain.handle('create-task', async (event, taskData) => {
  try {
    const task = await db.createTask(taskData);
    return task;
  } catch (error) {
    console.error('Create task error:', error);
    return { error: error.message };
  }
});

ipcMain.handle('update-task', async (event, { taskId, taskData }) => {
  try {
    const task = await db.updateTask(taskId, taskData);
    return task;
  } catch (error) {
    console.error('Update task error:', error);
    return { error: error.message };
  }
});

ipcMain.handle('delete-task', async (event, { taskId }) => {
  try {
    const result = await db.deleteTask(taskId);
    return result;
  } catch (error) {
    console.error('Delete task error:', error);
    return { error: error.message };
  }
});

// Monthly and Weekly plans IPC handlers
ipcMain.handle('get-monthly-plan', async (event, { userId, yearMonth }) => {
  try {
    const plan = await db.getMonthlyPlan(userId, yearMonth);
    return plan;
  } catch (error) {
    console.error('Get monthly plan error:', error);
    return { error: error.message };
  }
});

ipcMain.handle('save-monthly-plan', async (event, { userId, yearMonth, planContent }) => {
  try {
    const plan = await db.saveMonthlyPlan(userId, yearMonth, planContent);
    return plan;
  } catch (error) {
    console.error('Save monthly plan error:', error);
    return { error: error.message };
  }
});

ipcMain.handle('get-weekly-plan', async (event, { userId, yearWeek }) => {
  try {
    const plan = await db.getWeeklyPlan(userId, yearWeek);
    return plan;
  } catch (error) {
    console.error('Get weekly plan error:', error);
    return { error: error.message };
  }
});

ipcMain.handle('save-weekly-plan', async (event, { userId, yearWeek, planContent }) => {
  try {
    const plan = await db.saveWeeklyPlan(userId, yearWeek, planContent);
    return plan;
  } catch (error) {
    console.error('Save weekly plan error:', error);
    return { error: error.message };
  }
});

// Report generation and Excel export IPC handlers
ipcMain.handle('generate-weekly-report', async (event, { userId, yearWeek }) => {
  try {
    const report = await excelExporter.generateWeeklyReport(userId, yearWeek);
    return report;
  } catch (error) {
    console.error('Generate weekly report error:', error);
    return { error: error.message };
  }
});

ipcMain.handle('get-monthly-stats', async (event, { userId, yearMonth }) => {
  try {
    const stats = await db.getTaskStatsByMonth(userId, yearMonth);
    return stats;
  } catch (error) {
    console.error('Get monthly statistics error:', error);
    return { error: error.message };
  }
});

ipcMain.handle('export-to-excel', async (event, { userId, yearWeek }) => {
  try {
    // Show save dialog to get file path
    const { canceled, filePath } = await dialog.showSaveDialog({
      title: 'Export to Excel',
      defaultPath: `PDCA_Weekly_Report_${yearWeek}.xlsx`,
      filters: [
        { name: 'Excel Files', extensions: ['xlsx'] }
      ]
    });

    if (canceled || !filePath) {
      return { canceled: true };
    }

    const result = await excelExporter.exportToExcel(userId, yearWeek, filePath);
    return result;
  } catch (error) {
    console.error('Export to Excel error:', error);
    return { error: error.message };
  }
});
