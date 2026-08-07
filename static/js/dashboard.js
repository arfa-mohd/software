function initDashboardCharts() {
  const canvas = document.getElementById("revenueChart") || document.getElementById("kpiTrendChart");
  if (!canvas) return;
  if (window.kpiTrendChartInstance) {
    try { window.kpiTrendChartInstance.destroy(); } catch(e) {}
  }
  try {
    const ctx = canvas.getContext("2d");
    window.kpiTrendChartInstance = new Chart(ctx, {
      type: "line",
      data: {
        labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug"],
        datasets: [{
          label: "Hospital Revenue (₹)",
          data: [280000, 320000, 450000, 410000, 520000, 490000, 610000, 580000],
          borderColor: "#0284c7",
          backgroundColor: "rgba(2, 132, 199, 0.08)",
          fill: true,
          tension: 0.4,
          borderWidth: 3,
          pointRadius: 4,
          pointBackgroundColor: "#0284c7"
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { grid: { color: "#f1f5f9" }, ticks: { callback: v => '₹' + (v/1000) + 'k' } },
          x: { grid: { display: false } }
        }
      }
    });
  } catch (e) {
    console.warn("Dashboard chart notice:", e);
  }
}
