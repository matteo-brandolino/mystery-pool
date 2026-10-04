(() => {
  'use strict';

  const SECONDS = 10;
  const count = document.getElementById('count');
  const go = document.getElementById('go');
  const fallback = document.getElementById('fallback');

  let left = SECONDS;
  let sent = false;

  function proceed() {
    if (sent) return;
    sent = true;
    clearInterval(timer);
    if (window.opener) {
      window.opener.postMessage({ source: 'mystery-pool', action: 'continue' }, location.origin);
    } else {
      fallback.hidden = false;
    }
  }

  const timer = setInterval(() => {
    left -= 1;
    count.textContent = String(left);
    if (left <= 0) proceed();
  }, 1000);

  go.addEventListener('click', proceed);
})();
