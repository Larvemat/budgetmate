const Budget = {
  getPeriod(offsetMonths = 0) {
    const settings = Storage.getSettings();
    const renewDay = parseInt(settings.renewDay, 10) || 1;
    const now = new Date();
    
    let start = new Date(now.getFullYear(), now.getMonth(), renewDay);
    if (now.getDate() < renewDay) {
      start.setMonth(start.getMonth() - 1);
    }
    
    // Apply offset for historical periods
    start.setMonth(start.getMonth() + offsetMonths);
    
    let end = new Date(start.getFullYear(), start.getMonth() + 1, renewDay);
    end.setDate(end.getDate() - 1);
    
    const timeDiff = end.getTime() - start.getTime();
    const daysTotal = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
    
    // Calculate days passed based on offset
    let daysPassed;
    if (offsetMonths === 0) {
       const nowTimeDiff = now.getTime() - start.getTime();
       daysPassed = Math.floor(nowTimeDiff / (1000 * 3600 * 24)) + 1;
    } else if (offsetMonths < 0) {
       daysPassed = daysTotal; // Past months are fully passed
    } else {
       daysPassed = 0; // Future months have 0 days passed
    }
    
    const daysLeft = Math.max(0, daysTotal - daysPassed);
    const periodId = `${start.getFullYear()}-${(start.getMonth()+1).toString().padStart(2, '0')}`;
    const name = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(start);
    
    return { start, end, daysTotal, daysLeft, daysPassed, periodId, name: name.charAt(0).toUpperCase() + name.slice(1) };
  },

  getCurrentPeriod() {
    return this.getPeriod(0);
  },
  
  getExpensesForPeriod(offsetMonths = 0) {
    const expenses = Storage.getExpenses();
    const period = this.getPeriod(offsetMonths);
    const startTime = period.start.getTime();
    const endTime = period.end.getTime() + 24 * 60 * 60 * 1000 - 1;
    
    return expenses.filter(e => {
      const expDate = new Date(e.date).getTime();
      return expDate >= startTime && expDate <= endTime;
    });
  },

  getCurrentExpenses() {
    return this.getExpensesForPeriod(0);
  },
  
  getPreviousExpenses() {
    return this.getExpensesForPeriod(-1);
  },
  
  getSummary(expenses, settings) {
    const budgetAmount = parseFloat(settings.budget) || 0;
    const savingsGoal = parseFloat(settings.savingsGoal) || 0;
    
    // Effective budget subtracts savings goal
    const effectiveBudget = Math.max(0, budgetAmount - savingsGoal);
    
    const totalSpent = expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);
    const remaining = Math.max(0, effectiveBudget - totalSpent);
    const percentSpent = effectiveBudget > 0 ? Math.min(100, (totalSpent / effectiveBudget) * 100) : (totalSpent > 0 ? 100 : 0);
    
    const period = this.getCurrentPeriod();
    const dailyBudget = period.daysLeft > 0 ? remaining / period.daysLeft : 0;
    const averageDaily = period.daysPassed > 0 ? totalSpent / period.daysPassed : 0;
    
    let biggestExpense = null;
    if (expenses.length > 0) {
      biggestExpense = expenses.reduce((max, e) => parseFloat(e.amount) > parseFloat(max.amount) ? e : max, expenses[0]);
    }
    
    return {
      effectiveBudget,
      totalSpent,
      remaining,
      percentSpent,
      dailyBudget,
      averageDaily,
      biggestExpense,
      expenseCount: expenses.length
    };
  },

  getTrends(currentExpenses, previousExpenses) {
    const currentBreakdown = this.getCategoryBreakdown(currentExpenses);
    const previousBreakdown = this.getCategoryBreakdown(previousExpenses);

    const trends = [];
    currentBreakdown.forEach(curr => {
      const prev = previousBreakdown.find(p => p.categoryId === curr.categoryId);
      const prevTotal = prev ? prev.total : 0;
      const diff = curr.total - prevTotal;
      const percentChange = prevTotal > 0 ? (diff / prevTotal) * 100 : (curr.total > 0 ? 100 : 0);

      // Only show significant differences (more than 1 euro)
      if (Math.abs(diff) > 1) {
         trends.push({
           categoryId: curr.categoryId,
           category: curr.category,
           emoji: curr.emoji,
           diff,
           percentChange,
           isIncrease: diff > 0
         });
      }
    });
    return trends.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
  },
  
  getCategoryBreakdown(expenses) {
    const breakdown = {};
    expenses.forEach(e => {
      if (!breakdown[e.category]) {
        breakdown[e.category] = { total: 0, count: 0 };
      }
      breakdown[e.category].total += parseFloat(e.amount);
      breakdown[e.category].count += 1;
    });
    
    const totalSpent = expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);
    
    return Object.keys(breakdown).map(catId => {
      const cat = this.CATEGORIES.find(c => c.id === catId) || { emoji: '❓', label: 'Inconnu' };
      return {
        categoryId: catId,
        category: cat.label,
        emoji: cat.emoji,
        total: breakdown[catId].total,
        percentage: totalSpent > 0 ? (breakdown[catId].total / totalSpent) * 100 : 0,
        count: breakdown[catId].count
      };
    }).sort((a, b) => b.total - a.total);
  },
  
  getWeeklyBreakdown(expenses, periodStart) {
    const weeks = [];
    for(let i=0; i<5; i++) {
        weeks.push({ week: `Sem ${i+1}`, total: 0 });
    }
    
    expenses.forEach(e => {
       const expDate = new Date(e.date);
       const daysDiff = Math.floor((expDate - periodStart) / (1000 * 60 * 60 * 24));
       const weekIndex = Math.max(0, Math.min(4, Math.floor(daysDiff / 7)));
       weeks[weekIndex].total += parseFloat(e.amount);
    });
    
    const now = new Date();
    const daysSinceStart = Math.max(0, Math.floor((now - periodStart) / (1000 * 60 * 60 * 24)));
    const currentWeekIndex = Math.min(4, Math.floor(daysSinceStart / 7));
    return weeks.slice(0, currentWeekIndex + 1);
  },
  
  getStatusColor(percentSpent) {
    if (percentSpent < 50) return 'success';
    if (percentSpent <= 85) return 'warning';
    return 'danger';
  },
  
  getStatusMessage(percentSpent, remaining, daysLeft) {
    if (remaining <= 0) return 'Budget dépassé ! 🚨 Reste tranquille...';
    if (daysLeft === 0) return 'Dernier jour du mois, on y est presque ! 🎉';
    
    if (percentSpent < 30) return 'Super départ ! Ton budget est large. 🌟';
    if (percentSpent < 50) return 'Tu gères comme un chef ! 💪';
    if (percentSpent < 75) return 'Tout va bien, on maintient le cap. ⛵';
    if (percentSpent < 90) return 'Attention, le budget se resserre... ⚠️';
    return 'Alerte rouge ! Il te reste très peu d\'argent. 🆘';
  },

  applyRecurringExpenses() {
    const settings = Storage.getSettings();
    const period = this.getCurrentPeriod();

    if (settings.lastRecurringApplied === period.periodId) {
       return; // Already applied for this period
    }

    const recurring = Storage.getRecurring();
    const now = new Date();

    recurring.forEach(req => {
        // Find the correct date in the current period based on the renewal day
        let expDate = new Date(period.start);
        
        // Let's add them at the start of the period to be simple
        if (expDate > now) expDate = now; 

        Storage.addExpense({
            amount: parseFloat(req.amount),
            category: req.category,
            date: expDate.toISOString().split('T')[0],
            note: req.note + ' (Auto)'
        });
    });

    settings.lastRecurringApplied = period.periodId;
    Storage.saveSettings(settings);
  },
  
  CATEGORIES: [
    { id: 'food', emoji: '🍔', label: 'Nourriture' },
    { id: 'transport', emoji: '🚌', label: 'Transport' },
    { id: 'fun', emoji: '🎮', label: 'Loisirs' },
    { id: 'studies', emoji: '📚', label: 'Études' },
    { id: 'groceries', emoji: '🛒', label: 'Courses' },
    { id: 'clothes', emoji: '👕', label: 'Vêtements' },
    { id: 'health', emoji: '💊', label: 'Santé' },
    { id: 'subscriptions', emoji: '📱', label: 'Abos' },
    { id: 'other', emoji: '🎁', label: 'Autre' }
  ]
};
