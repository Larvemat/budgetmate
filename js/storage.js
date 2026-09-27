const Storage = {
  KEYS: { EXPENSES: 'bm_expenses', SETTINGS: 'bm_settings', THEME: 'bm_theme', RECURRING: 'bm_recurring' },
  
  getSettings() {
    const data = localStorage.getItem(this.KEYS.SETTINGS);
    return data ? JSON.parse(data) : { budget: 0, renewDay: 1, savingsGoal: 0, lastRecurringApplied: null };
  },
  
  saveSettings(settings) {
    localStorage.setItem(this.KEYS.SETTINGS, JSON.stringify(settings));
  },
  
  getExpenses() {
    const data = localStorage.getItem(this.KEYS.EXPENSES);
    return data ? JSON.parse(data) : [];
  },
  
  saveExpenses(expenses) {
    localStorage.setItem(this.KEYS.EXPENSES, JSON.stringify(expenses));
  },
  
  addExpense(expense) {
    const expenses = this.getExpenses();
    const newExpense = {
      ...expense,
      id: this._generateId(),
      createdAt: Date.now()
    };
    expenses.push(newExpense);
    this.saveExpenses(expenses);
    return newExpense;
  },
  
  deleteExpense(id) {
    let expenses = this.getExpenses();
    expenses = expenses.filter(e => e.id !== id);
    this.saveExpenses(expenses);
  },

  getRecurring() {
    const data = localStorage.getItem(this.KEYS.RECURRING);
    return data ? JSON.parse(data) : [];
  },

  saveRecurring(recurring) {
    localStorage.setItem(this.KEYS.RECURRING, JSON.stringify(recurring));
  },

  addRecurring(item) {
    const recurring = this.getRecurring();
    const newItem = {
      ...item,
      id: this._generateId(),
      createdAt: Date.now()
    };
    recurring.push(newItem);
    this.saveRecurring(recurring);
    return newItem;
  },

  deleteRecurring(id) {
    let recurring = this.getRecurring();
    recurring = recurring.filter(r => r.id !== id);
    this.saveRecurring(recurring);
  },
  
  getTheme() {
    return localStorage.getItem(this.KEYS.THEME) || 'auto';
  },
  
  setTheme(theme) {
    localStorage.setItem(this.KEYS.THEME, theme);
  },
  
  exportData() {
    return JSON.stringify({
      settings: this.getSettings(),
      expenses: this.getExpenses(),
      recurring: this.getRecurring(),
      exportDate: new Date().toISOString()
    });
  },
  
  importData(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      if (data && typeof data === 'object') {
        if (data.settings) this.saveSettings(data.settings);
        if (data.expenses && Array.isArray(data.expenses)) this.saveExpenses(data.expenses);
        if (data.recurring && Array.isArray(data.recurring)) this.saveRecurring(data.recurring);
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  },
  
  clearAll() {
    localStorage.removeItem(this.KEYS.SETTINGS);
    localStorage.removeItem(this.KEYS.EXPENSES);
    localStorage.removeItem(this.KEYS.THEME);
    localStorage.removeItem(this.KEYS.RECURRING);
  },
  
  _generateId() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
};
