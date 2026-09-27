const UI = {
  activeView: 'dashboard',
  amountString: '0',
  selectedCategory: null,
  historyOffset: 0,

  // --- Toast notification ---
  showToast(message, type = 'success') {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => toast.classList.add('show'));
    });
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 400);
    }, 2500);
  },

  // --- Confirm dialog ---
  showConfirm(title, message, onConfirm) {
    return new Promise(resolve => {
      const overlay = document.createElement('div');
      overlay.className = 'confirm-overlay';
      overlay.innerHTML = `
        <div class="confirm-dialog">
          <div class="confirm-header">
            <h3>${title}</h3>
            <p>${message}</p>
          </div>
          <div class="confirm-actions">
            <button class="confirm-cancel">Annuler</button>
            <button class="confirm-ok">Confirmer</button>
          </div>
        </div>`;
      document.body.appendChild(overlay);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => overlay.classList.add('show'));
      });

      const close = () => {
        overlay.classList.remove('show');
        setTimeout(() => overlay.remove(), 300);
      };

      overlay.querySelector('.confirm-cancel').onclick = () => { close(); resolve(false); };
      overlay.querySelector('.confirm-ok').onclick = () => {
        close();
        if (onConfirm) onConfirm();
        resolve(true);
      };
      overlay.addEventListener('click', e => { if (e.target === overlay) { close(); resolve(false); } });
    });
  },

  // --- Formatting ---
  formatMoney(amount) {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);
  },

  formatDate(dateString) {
    return new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(dateString));
  },

  // --- Dashboard ---
  renderDashboard() {
    const settings = Storage.getSettings();
    const prompt = document.getElementById('setup-prompt');
    if (prompt) prompt.style.display = (!settings.budget || settings.budget <= 0) ? 'block' : 'none';

    const expenses = Budget.getCurrentExpenses();
    const period = Budget.getCurrentPeriod();
    const summary = Budget.getSummary(expenses, settings); // now factors in savings

    // Budget amount (Effective)
    const budgetEl = document.getElementById('dashboard-budget');
    if (budgetEl) budgetEl.textContent = this.formatMoney(summary.effectiveBudget);

    // Spent
    const spentEl = document.getElementById('dashboard-spent');
    if (spentEl) spentEl.textContent = this.formatMoney(summary.totalSpent);

    // Remaining
    const remainEl = document.getElementById('dashboard-remaining');
    if (remainEl) remainEl.textContent = this.formatMoney(summary.remaining);

    // Daily budget
    const dailyEl = document.getElementById('dashboard-daily');
    if (dailyEl) dailyEl.textContent = this.formatMoney(summary.dailyBudget) + ' / jour';

    // Days left
    const daysEl = document.getElementById('dashboard-days');
    if (daysEl) daysEl.textContent = period.daysLeft + ' jour' + (period.daysLeft !== 1 ? 's' : '') + ' restant' + (period.daysLeft !== 1 ? 's' : '');

    // Percentage
    const pctEl = document.getElementById('spent-percentage');
    if (pctEl) pctEl.textContent = Math.round(summary.percentSpent) + '%';

    // Progress ring
    const circle = document.getElementById('progress-circle');
    if (circle) {
      const r = 50;
      const circumference = 2 * Math.PI * r;
      circle.style.strokeDasharray = circumference;
      const offset = circumference - (Math.min(summary.percentSpent, 100) / 100) * circumference;
      circle.style.strokeDashoffset = offset;

      const status = Budget.getStatusColor(summary.percentSpent);
      const colorMap = { success: '#34c759', warning: '#ff9500', danger: '#ff3b30' };
      circle.style.stroke = colorMap[status] || '#fff';
    }

    // Status message
    const msgEl = document.getElementById('dashboard-message');
    if (msgEl) {
      msgEl.textContent = Budget.getStatusMessage(summary.percentSpent, summary.remaining, period.daysLeft);
      msgEl.className = 'status-message status-' + Budget.getStatusColor(summary.percentSpent);
    }

    // Recent expenses
    this.renderExpenseList(expenses.slice(-5).reverse(), 'recent-expenses-list', 'Aucune dépense pour cette période 🤷');
  },

  // Generic Expense List renderer
  renderExpenseList(expenses, containerId, emptyMessage) {
    const list = document.getElementById(containerId);
    if (!list) return;
    list.innerHTML = '';

    if (expenses.length === 0) {
      list.innerHTML = `<div class="empty-state">${emptyMessage}</div>`;
      return;
    }

    expenses.forEach(expense => {
      const cat = Budget.CATEGORIES.find(c => c.id === expense.category) || { emoji: '❓', label: 'Autre' };
      const div = document.createElement('div');
      div.className = 'expense-item';
      div.innerHTML = `
        <div class="expense-icon">${cat.emoji}</div>
        <div class="expense-details">
          <div class="expense-title">${cat.label}${expense.note ? ' — ' + expense.note : ''}</div>
          <div class="expense-time">${this.formatDate(expense.date)}</div>
        </div>
        <div class="expense-amount">-${this.formatMoney(expense.amount)}</div>
        <button class="delete-btn" data-id="${expense.id}">🗑️</button>`;
      list.appendChild(div);
    });
  },

  // --- History View ---
  renderHistory() {
    // Render tabs names
    const tabs = document.querySelectorAll('.period-tab');
    tabs.forEach(tab => {
       const offset = parseInt(tab.dataset.offset);
       const p = Budget.getPeriod(offset);
       tab.textContent = offset === 0 ? 'Ce mois' : p.name;
    });

    const expenses = Budget.getExpensesForPeriod(this.historyOffset).reverse();
    const query = (document.getElementById('history-search').value || '').toLowerCase();
    
    const filtered = expenses.filter(e => {
        if (!query) return true;
        const cat = Budget.CATEGORIES.find(c => c.id === e.category) || { label: '' };
        return (e.note || '').toLowerCase().includes(query) || cat.label.toLowerCase().includes(query);
    });

    this.renderExpenseList(filtered, 'history-expenses-list', 'Aucune dépense trouvée 🔍');
  },

  // --- Add Expense ---
  renderAddExpense() {
    this.amountString = '0';
    this.selectedCategory = null;
    this.updateAmountDisplay();

    const dateInput = document.getElementById('expense-date');
    if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];

    const noteInput = document.getElementById('expense-note');
    if (noteInput) noteInput.value = '';

    const grid = document.getElementById('category-grid');
    if (grid) {
      grid.innerHTML = '';
      Budget.CATEGORIES.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = 'category-btn';
        btn.dataset.id = cat.id;
        btn.innerHTML = `<span class="emoji">${cat.emoji}</span><span class="label">${cat.label}</span>`;
        btn.addEventListener('click', () => {
          grid.querySelectorAll('.category-btn').forEach(b => b.classList.remove('selected'));
          btn.classList.add('selected');
          this.selectedCategory = cat.id;
        });
        grid.appendChild(btn);
      });
    }
  },

  updateAmountDisplay() {
    const el = document.getElementById('amount-display');
    if (el) {
      el.textContent = this.amountString.replace('.', ',');
    }
  },

  handleKeypadInput(key) {
    if (key === 'backspace') {
      this.amountString = this.amountString.length > 1 ? this.amountString.slice(0, -1) : '0';
    } else if (key === '.') {
      if (!this.amountString.includes('.')) {
        this.amountString += '.';
      }
    } else {
      if (this.amountString === '0') {
        this.amountString = key;
      } else {
        const parts = this.amountString.split('.');
        if (parts.length === 2 && parts[1].length >= 2) return;
        if (parseFloat(this.amountString + key) >= 10000) return;
        this.amountString += key;
      }
    }
    this.updateAmountDisplay();

    const el = document.getElementById('amount-display');
    if (el) {
      el.classList.remove('pulse-anim');
      void el.offsetWidth;
      el.classList.add('pulse-anim');
    }
  },

  handleAddExpense() {
    const amount = parseFloat(this.amountString);
    if (!amount || amount <= 0) {
      this.showToast('Entre un montant', 'error');
      return;
    }
    if (!this.selectedCategory) {
      this.showToast('Choisis une catégorie', 'error');
      return;
    }

    const dateVal = document.getElementById('expense-date').value;
    const noteVal = document.getElementById('expense-note').value;

    Storage.addExpense({
      amount: amount,
      category: this.selectedCategory,
      date: dateVal || new Date().toISOString().split('T')[0],
      note: noteVal.trim()
    });

    this.showToast('Dépense ajoutée ✅');
    App.navigate('dashboard');
  },

  handleDeleteExpense(id) {
    this.showConfirm('Supprimer', 'Tu veux supprimer cette dépense ?', () => {
      Storage.deleteExpense(id);
      this.showToast('Supprimée ✅');
      if (this.activeView === 'history') this.renderHistory();
      else this.renderDashboard();
    });
  },
  
  handleDeleteRecurring(id) {
    this.showConfirm('Supprimer abonnement', 'Ne plus ajouter cette dépense automatiquement ?', () => {
       Storage.deleteRecurring(id);
       this.showToast('Abonnement supprimé');
       this.renderSettings();
    });
  },

  // --- Statistics ---
  renderStats(period) {
    period = period || (document.getElementById('period-selector')?.value) || 'current';
    const expenses = period === 'current' ? Budget.getCurrentExpenses() : Budget.getPreviousExpenses();
    const settings = Storage.getSettings();
    const summary = Budget.getSummary(expenses, settings);
    const budgetPeriod = Budget.getCurrentPeriod();

    const totalEl = document.getElementById('stats-total');
    if (totalEl) totalEl.textContent = this.formatMoney(summary.totalSpent);
    const avgEl = document.getElementById('stats-daily-avg');
    if (avgEl) avgEl.textContent = this.formatMoney(summary.averageDaily);

    const theme = Storage.getTheme();
    const isDark = theme === 'dark' || (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    // Trends
    const trendsCard = document.getElementById('trends-card');
    if (trendsCard) {
      if (period === 'current') {
         trendsCard.style.display = 'block';
         const trends = Budget.getTrends(expenses, Budget.getPreviousExpenses());
         const list = document.getElementById('trends-list');
         list.innerHTML = '';
         if (trends.length === 0) {
           list.innerHTML = '<div style="color:var(--text-secondary);font-size:14px;padding:8px 0;">Pas assez de données pour comparer.</div>';
         } else {
           trends.forEach(t => {
             const div = document.createElement('div');
             div.className = 'trend-item';
             const icon = t.isIncrease ? '📈' : '📉';
             const colorClass = t.isIncrease ? 'trend-up' : 'trend-down';
             const sign = t.isIncrease ? '+' : '';
             div.innerHTML = `
                <div class="trend-left">
                   <span>${t.emoji}</span>
                   <span>${t.category}</span>
                </div>
                <div class="trend-val ${colorClass}">
                   ${icon} ${sign}${Math.round(t.percentChange)}%
                </div>
             `;
             list.appendChild(div);
           });
         }
      } else {
         trendsCard.style.display = 'none';
      }
    }

    const catData = Budget.getCategoryBreakdown(expenses);
    Charts.drawDonut('stats-donut', catData, isDark);

    const start = period === 'current' ? budgetPeriod.start : (() => {
      const s = new Date(budgetPeriod.start);
      s.setMonth(s.getMonth() - 1);
      return s;
    })();
    const weeklyData = Budget.getWeeklyBreakdown(expenses, start);
    const weeklyBudget = summary.effectiveBudget / (budgetPeriod.daysTotal / 7);
    Charts.drawBars('stats-bars', weeklyData, weeklyBudget, isDark);

    const list = document.getElementById('stats-category-list');
    if (list) {
      list.innerHTML = '';
      if (catData.length === 0) {
        list.innerHTML = '<div class="empty-state">Pas encore de données</div>';
      } else {
        catData.forEach((item, i) => {
          const div = document.createElement('div');
          div.className = 'cat-item';
          div.innerHTML = `
            <div class="cat-color" style="background:${Charts.COLORS[i % Charts.COLORS.length]}"></div>
            <div class="cat-icon">${item.emoji}</div>
            <div class="cat-name">${item.category}</div>
            <div class="cat-amount">${this.formatMoney(item.total)}</div>
            <div class="cat-percent">${Math.round(item.percentage)}%</div>`;
          list.appendChild(div);
        });
      }
    }

    const bigCard = document.getElementById('biggest-expense-card');
    if (bigCard) {
      if (summary.biggestExpense) {
        bigCard.style.display = 'block';
        const cat = Budget.CATEGORIES.find(c => c.id === summary.biggestExpense.category) || { emoji: '❓', label: 'Autre' };
        document.getElementById('biggest-emoji').textContent = cat.emoji;
        document.getElementById('biggest-title').textContent = cat.label + (summary.biggestExpense.note ? ' — ' + summary.biggestExpense.note : '');
        document.getElementById('biggest-date').textContent = this.formatDate(summary.biggestExpense.date);
        document.getElementById('biggest-amount').textContent = this.formatMoney(summary.biggestExpense.amount);
      } else {
        bigCard.style.display = 'none';
      }
    }
  },

  // --- Settings ---
  renderSettings() {
    const settings = Storage.getSettings();

    const budgetInput = document.getElementById('settings-budget');
    if (budgetInput) budgetInput.value = settings.budget || '';

    const savingsInput = document.getElementById('settings-savings');
    if (savingsInput) savingsInput.value = settings.savingsGoal || '';

    const renewSelect = document.getElementById('settings-renew');
    if (renewSelect && renewSelect.options.length === 0) {
      for (let i = 1; i <= 28; i++) {
        const opt = document.createElement('option');
        opt.value = i;
        opt.textContent = i;
        renewSelect.appendChild(opt);
      }
    }
    if (renewSelect) renewSelect.value = settings.renewDay || 1;

    const themeSelect = document.getElementById('settings-theme');
    if (themeSelect) themeSelect.value = Storage.getTheme();
    
    // Render recurring
    const recList = document.getElementById('recurring-list');
    if (recList) {
       const recurring = Storage.getRecurring();
       recList.innerHTML = '';
       recurring.forEach(req => {
          const cat = Budget.CATEGORIES.find(c => c.id === req.category) || { emoji: '❓', label: 'Autre' };
          const div = document.createElement('div');
          div.className = 'settings-item';
          div.innerHTML = `
            <div style="display:flex;align-items:center;gap:8px;">
               <span>${cat.emoji}</span>
               <span class="settings-label">${req.note}</span>
            </div>
            <div style="display:flex;align-items:center;gap:12px;">
               <span style="font-weight:600;">${this.formatMoney(req.amount)}</span>
               <button class="delete-btn" data-recurring-id="${req.id}">🗑️</button>
            </div>
          `;
          recList.appendChild(div);
       });
    }
  },

  // --- Theme ---
  applyTheme(theme) {
    if (theme === 'auto') {
      const isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    } else {
      document.documentElement.setAttribute('data-theme', theme);
    }
  }
};
