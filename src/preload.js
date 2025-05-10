// Preload script for exposing Electron APIs to the renderer process
const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
  'api', {
    // Authentication
    login: (credentials) => ipcRenderer.invoke('login', credentials),
    register: (userData) => ipcRenderer.invoke('register', userData),
    logout: () => ipcRenderer.invoke('logout'),
    recoverPassword: (data) => ipcRenderer.invoke('recover-password', data),
    getCurrentUser: () => ipcRenderer.invoke('get-current-user'),
    
    // Task management
    getTasks: (params) => ipcRenderer.invoke('get-tasks', params),
    createTask: (taskData) => ipcRenderer.invoke('create-task', taskData),
    updateTask: (taskId, taskData) => ipcRenderer.invoke('update-task', { taskId, taskData }),
    deleteTask: (taskId) => ipcRenderer.invoke('delete-task', { taskId }),
    
    // Monthly and Weekly plans
    getMonthlyPlan: (params) => ipcRenderer.invoke('get-monthly-plan', params),
    saveMonthlyPlan: (params) => ipcRenderer.invoke('save-monthly-plan', params),
    getWeeklyPlan: (params) => ipcRenderer.invoke('get-weekly-plan', params),
    saveWeeklyPlan: (params) => ipcRenderer.invoke('save-weekly-plan', params),
    
    // Report generation and Excel export
    generateWeeklyReport: (params) => ipcRenderer.invoke('generate-weekly-report', params),
    getMonthlyStats: (params) => ipcRenderer.invoke('get-monthly-stats', params),
    exportToExcel: (params) => ipcRenderer.invoke('export-to-excel', params)
  }
);
