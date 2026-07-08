/**
 * charts.js
 * ---------
 * Initializes the Chart.js dashboard charts. Kept separate from app.js so
 * chart-specific config doesn't clutter the navigation/rendering logic.
 */

function initDashboardCharts() {
  if (typeof Chart === 'undefined') {
    console.warn("Chart.js not loaded. Skipping chart initialization.");
    return;
  }
  const fontColor = "#94A3B8";
  Chart.defaults.font.family = "'Inter', sans-serif";
  Chart.defaults.color = fontColor;

  const engagementCtx = document.getElementById("engagementChart");
  if (engagementCtx) {
    new Chart(engagementCtx, {
      type: "line",
      data: {
        labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
        datasets: [{
          label: "Avg. engagement score",
          data: [68, 71, 75, 74, 79, 83, 81],
          borderColor: "#06B6D4",
          backgroundColor: "rgba(6,182,212,0.15)",
          fill: true,
          tension: 0.4,
          pointBackgroundColor: "#06B6D4",
        }],
      },
      options: {
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { color: "rgba(248,250,252,0.06)" } },
          y: { grid: { color: "rgba(248,250,252,0.06)" }, suggestedMin: 50, suggestedMax: 100 },
        },
      },
    });
  }

  const platformCtx = document.getElementById("platformChart");
  if (platformCtx) {
    new Chart(platformCtx, {
      type: "doughnut",
      data: {
        labels: ["LinkedIn", "Instagram", "X / Twitter"],
        datasets: [{
          data: [42, 35, 23],
          backgroundColor: ["#4F46E5", "#7C3AED", "#06B6D4"],
          borderColor: "#1E293B",
          borderWidth: 3,
        }],
      },
      options: {
        plugins: { legend: { position: "bottom", labels: { boxWidth: 10, padding: 16 } } },
        cutout: "65%",
      },
    });
  }
}

/**
 * Renders/re-renders the "Campaign engagement by day" bar chart on the
 * Dashboard using the latest autonomous campaign's 7 day results. Safe to
 * call multiple times (e.g. after every new campaign run) — destroys the
 * previous Chart.js instance first so canvases don't leak or double-stack.
 */
let campaignChartInstance = null;
function renderCampaignChart(days) {
  const ctx = document.getElementById("campaignEngagementChart");
  if (!ctx) return;
  if (campaignChartInstance) {
    campaignChartInstance.destroy();
    campaignChartInstance = null;
  }
  if (!days || !days.length) return;

  campaignChartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: days.map(d => d.dayName.slice(0, 3)),
      datasets: [{
        label: "Predicted overall engagement",
        data: days.map(d => d.engagement.overall),
        backgroundColor: "rgba(79,70,229,0.65)",
        borderColor: "#4F46E5",
        borderWidth: 1,
        borderRadius: 6,
      }],
    },
    options: {
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false } },
        y: { grid: { color: "rgba(248,250,252,0.06)" }, suggestedMin: 0, suggestedMax: 100 },
      },
    },
  });
}
