/**
 * COASTGUARD - Charts Module
 * Chart.js chart factory and update functions (Light Executive Theme).
 */

// Default Chart.js global settings for clean white theme
Chart.defaults.color = '#64748b';
Chart.defaults.borderColor = 'rgba(226, 232, 240, 0.8)';
Chart.defaults.font.family = 'Inter, sans-serif';
Chart.defaults.font.size = 11;

const CHART_COLORS = {
  primary: '#0f766e',
  cyan: '#0284c7',
  critical: '#dc2626',
  high: '#ea580c',
  medium: '#d97706',
  low: '#16a34a',
  muted: '#94a3b8'
};

function makeLineChart(canvasId, labels, datasets, options = {}) {
  const ctx = document.getElementById(canvasId)?.getContext('2d');
  if (!ctx) return null;
  return new Chart(ctx, {
    type: 'line',
    data: { labels, datasets: datasets.map(d => ({
      borderWidth: 2,
      pointRadius: 2,
      pointHoverRadius: 4,
      tension: 0.35,
      fill: true,
      ...d
    }))},
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 400 },
      plugins: {
        legend: { display: options.legend !== false, position: 'top',
          labels: { boxWidth: 10, padding: 12, font: { size: 10, weight: 600 }, color: '#334155' }
        },
        tooltip: {
          backgroundColor: '#0f172a',
          borderColor: '#334155',
          borderWidth: 1,
          padding: 10,
          titleFont: { family: 'JetBrains Mono', size: 11, weight: 700 },
          bodyFont: { size: 11 },
          titleColor: '#ffffff',
          bodyColor: '#e2e8f0'
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(226, 232, 240, 0.7)' },
          ticks: { font: { size: 9 }, color: '#64748b', maxTicksLimit: 12 }
        },
        y: {
          grid: { color: 'rgba(226, 232, 240, 0.7)' },
          ticks: { font: { size: 9 }, color: '#64748b' },
          beginAtZero: options.beginAtZero !== false
        }
      },
      ...options.chartOptions
    }
  });
}

function makeBarChart(canvasId, labels, datasets, options = {}) {
  const ctx = document.getElementById(canvasId)?.getContext('2d');
  if (!ctx) return null;
  return new Chart(ctx, {
    type: 'bar',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 400 },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#0f172a',
          borderColor: '#334155',
          borderWidth: 1,
          padding: 10,
          titleFont: { family: 'JetBrains Mono', size: 11 },
          titleColor: '#ffffff',
          bodyColor: '#e2e8f0'
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { font: { size: 9 }, color: '#64748b' }
        },
        y: {
          grid: { color: 'rgba(226, 232, 240, 0.7)' },
          ticks: { font: { size: 9 }, color: '#64748b' },
          beginAtZero: true
        }
      },
      ...options.chartOptions
    }
  });
}

function makeDoughnutChart(canvasId, labels, data, colors) {
  const ctx = document.getElementById(canvasId)?.getContext('2d');
  if (!ctx) return null;
  return new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: colors,
        borderColor: '#ffffff',
        borderWidth: 2.5,
        hoverBorderWidth: 3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '70%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: { boxWidth: 10, padding: 12, font: { size: 10, weight: 600 }, color: '#334155' }
        },
        tooltip: {
          backgroundColor: '#0f172a',
          borderColor: '#334155',
          borderWidth: 1,
          padding: 10,
          titleFont: { family: 'JetBrains Mono', size: 11 },
          titleColor: '#ffffff',
          bodyColor: '#e2e8f0'
        }
      }
    }
  });
}

function updateLineChart(chart, labels, data) {
  if (!chart) return;
  chart.data.labels = labels;
  chart.data.datasets[0].data = data;
  chart.update('none');
}

function addDataPoint(chart, label, value, maxPoints = 30) {
  if (!chart) return;
  chart.data.labels.push(label);
  chart.data.datasets.forEach(ds => {
    if (Array.isArray(value)) {
      ds.data.push(value[chart.data.datasets.indexOf(ds)]);
    } else {
      ds.data.push(value);
    }
    if (ds.data.length > maxPoints) ds.data.shift();
  });
  if (chart.data.labels.length > maxPoints) chart.data.labels.shift();
  chart.update('none');
}

window.CHART_COLORS = CHART_COLORS;
window.makeLineChart = makeLineChart;
window.makeBarChart = makeBarChart;
window.makeDoughnutChart = makeDoughnutChart;
window.updateLineChart = updateLineChart;
window.addDataPoint = addDataPoint;
