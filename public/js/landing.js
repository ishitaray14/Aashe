document.addEventListener('DOMContentLoaded', () => {
  AASHE.initNavbar();
  initCounters();
  initChart();
  initSmoothScroll();
  checkLoggedIn();
});

function initCounters() {
  const els = document.querySelectorAll('.stat-number[data-target]');
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        AASHE.animateCounter(e.target, parseInt(e.target.dataset.target));
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.5 });
  els.forEach(el => obs.observe(el));
}

function initChart() {
  const canvas = document.getElementById('impactChart');
  if (!canvas) return;
  const obs = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting) {
      AASHE.drawDonut('impactChart', AASHE.data.analytics.items, AASHE.data.analytics.totalDonations);
      obs.disconnect();
    }
  }, { threshold: 0.3 });
  obs.observe(canvas);
}

function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const t = document.querySelector(a.getAttribute('href'));
      if (t) { e.preventDefault(); t.scrollIntoView({ behavior: 'smooth' }); }
    });
  });
}

function checkLoggedIn() {
  const user = AASHE.getSession();
  if (user) {
    const nav = document.querySelector('.nav-actions');
    if (nav) nav.innerHTML = `<a href="${AASHE.getDashboardPath(user.role)}" class="btn btn-primary">My Dashboard</a>`;
  }
}
