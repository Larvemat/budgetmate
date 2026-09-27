const App = {
  currentView: 'dashboard',

  init() {
    // Apply recurring expenses for the current month
    Budget.applyRecurringExpenses();

    // Apply saved theme
    const theme = Storage.getTheme();
    UI.applyTheme(theme);

    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (Storage.getTheme() === 'auto') UI.applyTheme('auto');
    });

    // --- Tab Bar Navigation ---
    document.querySelectorAll('.tab-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.target;
        if (target) this.navigate(target);
      });
    });

    // --- FAB ---
    const fab = document.getElementById('fab-add-expense');
    if (fab) fab.addEventListener('click', () => this.navigate('add'));

    // --- Keypad ---
    document.querySelectorAll('.key-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.key;
        if (key) UI.handleKeypadInput(key);
      });
    });

    // --- Save Expense ---
    const saveBtn = document.getElementById('save-expense');
    if (saveBtn) saveBtn.addEventListener('click', () => UI.handleAddExpense());
    
    // --- History View ---
    const searchHistory = document.getElementById('history-search');
    if (searchHistory) searchHistory.addEventListener('input', () => UI.renderHistory());
    
    document.querySelectorAll('.period-tab').forEach(tab => {
       tab.addEventListener('click', (e) => {
          document.querySelectorAll('.period-tab').forEach(t => t.classList.remove('active'));
          e.target.classList.add('active');
          UI.historyOffset = parseInt(e.target.dataset.offset);
          UI.renderHistory();
       });
    });

    // --- Settings: Budget & Savings ---
    const budgetInput = document.getElementById('settings-budget');
    if (budgetInput) {
      budgetInput.addEventListener('change', e => {
        const settings = Storage.getSettings();
        settings.budget = parseFloat(e.target.value) || 0;
        Storage.saveSettings(settings);
        UI.showToast('Budget mis à jour ✅');
      });
    }
    const savingsInput = document.getElementById('settings-savings');
    if (savingsInput) {
      savingsInput.addEventListener('change', e => {
        const settings = Storage.getSettings();
        settings.savingsGoal = parseFloat(e.target.value) || 0;
        Storage.saveSettings(settings);
        UI.showToast('Objectif épargne mis à jour ✅');
      });
    }

    const renewSelect = document.getElementById('settings-renew');
    if (renewSelect) {
      renewSelect.addEventListener('change', e => {
        const settings = Storage.getSettings();
        settings.renewDay = parseInt(e.target.value) || 1;
        Storage.saveSettings(settings);
        UI.showToast('Jour de renouvellement mis à jour ✅');
      });
    }

    // --- Settings: Theme ---
    const themeSelect = document.getElementById('settings-theme');
    if (themeSelect) {
      themeSelect.addEventListener('change', e => {
        Storage.setTheme(e.target.value);
        UI.applyTheme(e.target.value);
      });
    }

    // --- Settings: Export / Import / Clear ---
    const exportBtn = document.getElementById('export-data');
    if (exportBtn) exportBtn.addEventListener('click', () => this.handleExport());

    const importTrigger = document.getElementById('import-trigger');
    const importInput = document.getElementById('import-file');
    if (importTrigger && importInput) {
      importTrigger.addEventListener('click', () => importInput.click());
      importInput.addEventListener('change', e => this.handleImport(e));
    }

    const clearBtn = document.getElementById('clear-data');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        UI.showConfirm('Réinitialiser', 'Toutes tes données seront supprimées. Cette action est irréversible.', () => {
          Storage.clearAll();
          UI.showToast('Données supprimées');
          setTimeout(() => window.location.reload(), 500);
        });
      });
    }

    // --- Stats: Period Selector ---
    const periodSelect = document.getElementById('period-selector');
    if (periodSelect) {
      periodSelect.addEventListener('change', e => {
        UI.renderStats(e.target.value);
      });
    }
    
    // --- Recurring Expenses Modal ---
    const btnAddRec = document.getElementById('btn-add-recurring');
    const modalRec = document.getElementById('modal-recurring');
    const catSelect = document.getElementById('rec-category');
    
    if (btnAddRec && modalRec && catSelect) {
       // Populate categories
       Budget.CATEGORIES.forEach(c => {
          const opt = document.createElement('option');
          opt.value = c.id;
          opt.textContent = `${c.emoji} ${c.label}`;
          catSelect.appendChild(opt);
       });
       
       btnAddRec.addEventListener('click', () => {
          document.getElementById('rec-note').value = '';
          document.getElementById('rec-amount').value = '';
          modalRec.classList.add('show');
       });
       
       document.getElementById('rec-cancel').addEventListener('click', () => {
          modalRec.classList.remove('show');
       });
       
       document.getElementById('rec-save').addEventListener('click', () => {
          const note = document.getElementById('rec-note').value.trim();
          const amount = parseFloat(document.getElementById('rec-amount').value);
          const category = document.getElementById('rec-category').value;
          
          if (!note || !amount || amount <= 0) {
             UI.showToast('Veuillez remplir tous les champs', 'error');
             return;
          }
          
          Storage.addRecurring({ note, amount, category });
          UI.showToast('Abonnement ajouté ✅');
          modalRec.classList.remove('show');
          UI.renderSettings();
       });
    }

    // --- Event Delegation ---
    document.addEventListener('click', e => {
      // Delete regular expense
      const delBtn = e.target.closest('.delete-btn[data-id]');
      if (delBtn && delBtn.dataset.id) {
        e.stopPropagation();
        UI.handleDeleteExpense(delBtn.dataset.id);
      }
      // Delete recurring expense
      const delRecBtn = e.target.closest('.delete-btn[data-recurring-id]');
      if (delRecBtn && delRecBtn.dataset.recurringId) {
        e.stopPropagation();
        UI.handleDeleteRecurring(delRecBtn.dataset.recurringId);
      }
    });

    // Navigate to dashboard
    this.navigate('dashboard');
  },

  navigate(viewName) {
    // Hide all views
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));

    // Show target view
    const target = document.getElementById('view-' + viewName);
    if (target) target.classList.add('active');

    // Update tab bar highlights
    document.querySelectorAll('.tab-item').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.target === viewName);
    });

    // Scroll to top
    const container = document.querySelector('.app-container');
    if (container) container.scrollTop = 0;

    this.currentView = viewName;
    UI.activeView = viewName;

    // Render the view
    switch (viewName) {
      case 'dashboard': UI.renderDashboard(); break;
      case 'add':       UI.renderAddExpense(); break;
      case 'stats':     UI.renderStats(); break;
      case 'settings':  UI.renderSettings(); break;
      case 'history':   UI.renderHistory(); break;
    }
  },

  handleExport() {
    const data = Storage.exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const dateStr = new Date().toISOString().split('T')[0];

    const a = document.createElement('a');
    a.href = url;
    a.download = `budgetmate-${dateStr}.json`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
    UI.showToast('Données exportées 📤');
  },

  handleImport(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      const success = Storage.importData(event.target.result);
      if (success) {
        UI.showToast('Données importées ✅');
        this.navigate(this.currentView);
      } else {
        UI.showToast('Fichier invalide', 'error');
      }
      e.target.value = '';
    };
    reader.readAsText(file);
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());
