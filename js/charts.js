const Charts = {
  COLORS: ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ef4444', '#06b6d4', '#84cc16'],

  drawDonut(canvasId, categoryData, isDarkMode) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    // Set canvas size to match CSS size (for sharp rendering)
    const rect = canvas.parentElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    const centerX = w / 2;
    const centerY = h / 2;
    const radius = Math.min(centerX, centerY) - 16;

    ctx.clearRect(0, 0, w, h);

    if (!categoryData || categoryData.length === 0) {
      // Empty state ring
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      ctx.strokeStyle = isDarkMode ? '#333' : '#e5e5ea';
      ctx.lineWidth = 24;
      ctx.stroke();

      ctx.fillStyle = isDarkMode ? '#98989d' : '#8e8e93';
      ctx.font = '500 15px -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Pas de données', centerX, centerY);
      return;
    }

    const total = categoryData.reduce((sum, item) => sum + item.total, 0);
    const startTime = performance.now();
    const duration = 700;

    const animate = (now) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3); // easeOutCubic
      ctx.clearRect(0, 0, w, h);

      let angle = -Math.PI / 2;
      categoryData.forEach((item, i) => {
        const slice = (item.total / total) * 2 * Math.PI * ease;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, angle, angle + slice);
        ctx.fillStyle = this.COLORS[i % this.COLORS.length];
        ctx.fill();
        angle += slice;
      });

      // Inner circle (donut hole)
      const inner = radius * 0.6;
      ctx.beginPath();
      ctx.arc(centerX, centerY, inner, 0, 2 * Math.PI);
      ctx.fillStyle = isDarkMode ? '#1c1c1e' : '#ffffff';
      ctx.fill();

      // Center text
      if (progress >= 1) {
        ctx.fillStyle = isDarkMode ? '#fff' : '#1c1c1e';
        ctx.font = 'bold 20px -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(total), centerX, centerY);
      }

      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  },

  drawBars(canvasId, weeklyData, budgetPerWeek, isDarkMode) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const rect = canvas.parentElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;

    ctx.clearRect(0, 0, w, h);
    if (!weeklyData || weeklyData.length === 0) {
      ctx.fillStyle = isDarkMode ? '#98989d' : '#8e8e93';
      ctx.font = '500 15px -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Pas de données', w / 2, h / 2);
      return;
    }

    const maxVal = Math.max(...weeklyData.map(d => d.total), budgetPerWeek * 1.2, 10);
    const padL = 10;
    const padR = 10;
    const padTop = 24;
    const padBot = 28;
    const chartH = h - padTop - padBot;
    const chartW = w - padL - padR;
    const barGap = 16;
    const barW = Math.min(40, (chartW - barGap * (weeklyData.length + 1)) / weeklyData.length);

    const startTime = performance.now();
    const duration = 700;

    const animate = (now) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      ctx.clearRect(0, 0, w, h);

      // Budget guideline
      if (budgetPerWeek > 0) {
        const guideY = padTop + chartH - (budgetPerWeek / maxVal) * chartH;
        ctx.beginPath();
        ctx.setLineDash([4, 4]);
        ctx.moveTo(padL, guideY);
        ctx.lineTo(w - padR, guideY);
        ctx.strokeStyle = isDarkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Bars
      const totalBarSpace = weeklyData.length * barW + (weeklyData.length - 1) * barGap;
      const startX = padL + (chartW - totalBarSpace) / 2;

      weeklyData.forEach((item, i) => {
        const barH = (item.total / maxVal) * chartH * ease;
        const x = startX + i * (barW + barGap);
        const y = padTop + chartH - barH;

        // Rounded rect
        const r = Math.min(6, barW / 2);
        ctx.beginPath();
        ctx.moveTo(x, padTop + chartH);
        ctx.lineTo(x, y + r);
        ctx.arcTo(x, y, x + r, y, r);
        ctx.arcTo(x + barW, y, x + barW, y + r, r);
        ctx.lineTo(x + barW, padTop + chartH);
        ctx.closePath();
        ctx.fillStyle = item.total > budgetPerWeek ? '#ff3b30' : '#6366f1';
        ctx.fill();

        // Labels
        if (progress >= 0.8) {
          ctx.fillStyle = isDarkMode ? '#98989d' : '#8e8e93';
          ctx.font = '500 11px -apple-system, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(item.week, x + barW / 2, h - 8);

          ctx.fillStyle = isDarkMode ? '#fff' : '#1c1c1e';
          ctx.font = '600 12px -apple-system, sans-serif';
          ctx.fillText(Math.round(item.total) + '€', x + barW / 2, y - 6);
        }
      });

      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }
};
