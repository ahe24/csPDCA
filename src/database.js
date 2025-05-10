// Database module for SQLite operations
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const { app } = require('electron');
const { v4: uuidv4 } = require('uuid');

class Database {
  constructor() {
    // Create data directory if it doesn't exist
    const userDataPath = app.getPath('userData');
    const dbPath = path.join(userDataPath, 'cspdca.db');
    
    // Log database path for debugging
    console.log('DATABASE PATH (check here for your data):', dbPath);
    // Show an alert dialog with the database path
    if (app.isPackaged) {
      const { dialog } = require('electron');
      dialog.showMessageBoxSync({
        type: 'info',
        title: 'Database Location',
        message: `Your database is stored at:\n${dbPath}\n\nThis is where all your application data is saved.`
      });
    }
    
    // Initialize database connection
    this.db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Database connection error:', err.message);
      } else {
        console.log('Connected to the SQLite database');
        this.initializeDatabase();
      }
    });
  }
  
  // Initialize database tables if they don't exist
  initializeDatabase() {
    const createUsersTable = `
      CREATE TABLE IF NOT EXISTS Users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        security_question TEXT NOT NULL,
        security_answer_hash TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    const createTasksTable = `
      CREATE TABLE IF NOT EXISTS Tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        uuid TEXT UNIQUE NOT NULL,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        do_text TEXT,
        check_text TEXT,
        act_text TEXT,
        status TEXT NOT NULL CHECK(status IN ('PLAN', 'CANCELED', 'COMPLETED')),
        start_datetime TEXT NOT NULL,
        end_datetime TEXT NOT NULL,
        is_all_day INTEGER NOT NULL DEFAULT 0,
        is_internal_work INTEGER NOT NULL DEFAULT 1,
        external_location TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES Users(id)
      )
    `;
    
    const createMonthlyPlansTable = `
      CREATE TABLE IF NOT EXISTS MonthlyPlans (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        year_month TEXT NOT NULL,
        plan_content TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (user_id, year_month),
        FOREIGN KEY (user_id) REFERENCES Users(id)
      )
    `;
    
    const createWeeklyPlansTable = `
      CREATE TABLE IF NOT EXISTS WeeklyPlans (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        year_week TEXT NOT NULL,
        plan_content TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (user_id, year_week),
        FOREIGN KEY (user_id) REFERENCES Users(id)
      )
    `;
    
    // Execute table creation queries
    this.db.serialize(() => {
      this.db.run(createUsersTable, (err) => {
        if (err) console.error('Error creating Users table:', err.message);
        else console.log('Users table initialized');
      });
      
      this.db.run(createTasksTable, (err) => {
        if (err) console.error('Error creating Tasks table:', err.message);
        else console.log('Tasks table initialized');
      });
      
      this.db.run(createMonthlyPlansTable, (err) => {
        if (err) console.error('Error creating MonthlyPlans table:', err.message);
        else console.log('MonthlyPlans table initialized');
      });
      
      this.db.run(createWeeklyPlansTable, (err) => {
        if (err) console.error('Error creating WeeklyPlans table:', err.message);
        else console.log('WeeklyPlans table initialized');
      });
    });
  }
  
  // Helper method to run a query with parameters
  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          console.error('Error running query:', err.message);
          reject(err);
        } else {
          resolve({ id: this.lastID, changes: this.changes });
        }
      });
    });
  }
  
  // Helper method to get a single row
  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          console.error('Error getting row:', err.message);
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }
  
  // Helper method to get multiple rows
  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          console.error('Error getting rows:', err.message);
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }
  
  // User methods
  async getUserByUsername(username) {
    return this.get('SELECT * FROM Users WHERE username = ?', [username]);
  }
  
  async getUserById(id) {
    return this.get('SELECT * FROM Users WHERE id = ?', [id]);
  }
  
  async createUser(userData) {
    const { username, password_hash, name, email, security_question, security_answer_hash } = userData;
    
    const sql = `
      INSERT INTO Users (username, password_hash, name, email, security_question, security_answer_hash)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    
    const result = await this.run(sql, [username, password_hash, name, email, security_question, security_answer_hash]);
    return this.getUserById(result.id);
  }
  
  async updateUser(id, userData) {
    const { name, email } = userData;
    
    const sql = `
      UPDATE Users
      SET name = ?, email = ?
      WHERE id = ?
    `;
    
    await this.run(sql, [name, email, id]);
    return this.getUserById(id);
  }
  
  async updateUserPassword(id, password_hash) {
    const sql = `
      UPDATE Users
      SET password_hash = ?
      WHERE id = ?
    `;
    
    await this.run(sql, [password_hash, id]);
    return this.getUserById(id);
  }
  
  // Task methods
  async getTasks(userId, startDate, endDate) {
    let sql = `
      SELECT * FROM Tasks
      WHERE user_id = ?
    `;
    
    const params = [userId];
    
    if (startDate && endDate) {
      sql += ` AND (
        (start_datetime >= ? AND start_datetime <= ?) OR
        (end_datetime >= ? AND end_datetime <= ?) OR
        (start_datetime <= ? AND end_datetime >= ?)
      )`;
      params.push(startDate, endDate, startDate, endDate, startDate, endDate);
    }
    
    return this.all(sql, params);
  }
  
  async getTaskById(taskId) {
    return this.get('SELECT * FROM Tasks WHERE id = ?', [taskId]);
  }
  
  async getTaskByUuid(uuid) {
    return this.get('SELECT * FROM Tasks WHERE uuid = ?', [uuid]);
  }
  
  async createTask(taskData) {
    const {
      user_id,
      title,
      do_text,
      check_text,
      act_text,
      status,
      start_datetime,
      end_datetime,
      is_all_day,
      is_internal_work,
      external_location
    } = taskData;
    
    // Generate UUID for the task
    const uuid = uuidv4();
    
    const sql = `
      INSERT INTO Tasks (
        uuid, user_id, title, do_text, check_text, act_text, status,
        start_datetime, end_datetime, is_all_day, is_internal_work, external_location
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const params = [
      uuid, user_id, title, do_text, check_text, act_text, status,
      start_datetime, end_datetime, is_all_day, is_internal_work, external_location
    ];
    
    const result = await this.run(sql, params);
    return this.getTaskById(result.id);
  }
  
  async updateTask(taskId, taskData) {
    const {
      title,
      do_text,
      check_text,
      act_text,
      status,
      start_datetime,
      end_datetime,
      is_all_day,
      is_internal_work,
      external_location
    } = taskData;
    
    const sql = `
      UPDATE Tasks
      SET title = ?, do_text = ?, check_text = ?, act_text = ?, status = ?,
          start_datetime = ?, end_datetime = ?, is_all_day = ?, is_internal_work = ?,
          external_location = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    
    const params = [
      title, do_text, check_text, act_text, status,
      start_datetime, end_datetime, is_all_day, is_internal_work,
      external_location, taskId
    ];
    
    await this.run(sql, params);
    return this.getTaskById(taskId);
  }
  
  async deleteTask(taskId) {
    const sql = 'DELETE FROM Tasks WHERE id = ?';
    return this.run(sql, [taskId]);
  }
  
  // Monthly plan methods
  async getMonthlyPlan(userId, yearMonth) {
    return this.get('SELECT * FROM MonthlyPlans WHERE user_id = ? AND year_month = ?', [userId, yearMonth]);
  }
  
  async saveMonthlyPlan(userId, yearMonth, planContent) {
    // Check if plan exists
    const existingPlan = await this.getMonthlyPlan(userId, yearMonth);
    
    if (existingPlan) {
      // Update existing plan
      const sql = `
        UPDATE MonthlyPlans
        SET plan_content = ?, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ? AND year_month = ?
      `;
      
      await this.run(sql, [planContent, userId, yearMonth]);
    } else {
      // Create new plan
      const sql = `
        INSERT INTO MonthlyPlans (user_id, year_month, plan_content)
        VALUES (?, ?, ?)
      `;
      
      await this.run(sql, [userId, yearMonth, planContent]);
    }
    
    return this.getMonthlyPlan(userId, yearMonth);
  }
  
  // Weekly plan methods
  async getWeeklyPlan(userId, yearWeek) {
    return this.get('SELECT * FROM WeeklyPlans WHERE user_id = ? AND year_week = ?', [userId, yearWeek]);
  }
  
  async saveWeeklyPlan(userId, yearWeek, planContent) {
    // Check if plan exists
    const existingPlan = await this.getWeeklyPlan(userId, yearWeek);
    
    if (existingPlan) {
      // Update existing plan
      const sql = `
        UPDATE WeeklyPlans
        SET plan_content = ?, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ? AND year_week = ?
      `;
      
      await this.run(sql, [planContent, userId, yearWeek]);
    } else {
      // Create new plan
      const sql = `
        INSERT INTO WeeklyPlans (user_id, year_week, plan_content)
        VALUES (?, ?, ?)
      `;
      
      await this.run(sql, [userId, yearWeek, planContent]);
    }
    
    return this.getWeeklyPlan(userId, yearWeek);
  }
  
  // Task statistics methods for reporting
  async getTaskStatsByWeek(userId, yearWeek) {
    // Parse year and week from yearWeek (format: YYYY-WW)
    const [year, week] = yearWeek.split('-');
    
    // Calculate start and end dates of the week
    const startDate = this.getDateOfISOWeek(parseInt(week), parseInt(year));
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
    
    // Format dates for SQLite
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    
    // Get tasks for the week
    const tasks = await this.getTasks(userId, startDateStr, endDateStr);
    
    // Calculate statistics
    const stats = {
      total: tasks.length,
      completed: 0,
      canceled: 0,
      planned: 0,
      completionRate: 0
    };
    
    tasks.forEach(task => {
      switch (task.status) {
        case 'COMPLETED':
          stats.completed++;
          break;
        case 'CANCELED':
          stats.canceled++;
          break;
        case 'PLAN':
          stats.planned++;
          break;
      }
    });
    
    // Calculate completion rate
    if (stats.total > 0) {
      stats.completionRate = (stats.completed / stats.total) * 100;
    }
    
    return { stats, tasks };
  }
  
  // Get task statistics for a month
  async getTaskStatsByMonth(userId, yearMonth) {
    // Parse year and month from yearMonth (format: YYYY-MM)
    const [year, month] = yearMonth.split('-');
    
    // Calculate start and end dates of the month
    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    const endDate = new Date(parseInt(year), parseInt(month), 0); // Last day of the month
    
    // Format dates for SQLite
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    
    console.log(`Getting monthly tasks from ${startDateStr} to ${endDateStr}`);
    
    // Get tasks for the month
    const tasks = await this.getTasks(userId, startDateStr, endDateStr);
    
    // Calculate statistics
    const stats = {
      total: tasks.length,
      completed: 0,
      canceled: 0,
      planned: 0,
      completionRate: 0
    };
    
    tasks.forEach(task => {
      switch (task.status) {
        case 'COMPLETED':
          stats.completed++;
          break;
        case 'CANCELED':
          stats.canceled++;
          break;
        case 'PLAN':
          stats.planned++;
          break;
      }
    });
    
    // Calculate completion rate
    if (stats.total > 0) {
      stats.completionRate = (stats.completed / stats.total) * 100;
    }
    
    return { stats, tasks };
  }
  
  // Helper method to get the date of an ISO week
  getDateOfISOWeek(week, year) {
    // Create a date for the first day of the year
    const date = new Date(year, 0, 1);
    
    // Get to the first Monday of the year
    while (date.getDay() !== 1) {
      date.setDate(date.getDate() + 1);
    }
    
    // Add the required number of weeks
    date.setDate(date.getDate() + (week - 1) * 7);
    
    // Log for debugging
    console.log(`Week ${week} of ${year} starts on: ${date.toDateString()}`);
    
    return date;
  }
  
  // Close database connection
  close() {
    this.db.close((err) => {
      if (err) {
        console.error('Error closing database:', err.message);
      } else {
        console.log('Database connection closed');
      }
    });
  }
}

module.exports = Database;
