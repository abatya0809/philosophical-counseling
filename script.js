// ==========================================
// Contact tab switching
// ==========================================
const tabs = document.querySelectorAll('.contact__tab');
const panels = document.querySelectorAll('.contact__panel');

tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    tabs.forEach(t => {
      t.classList.remove('contact__tab--active');
      t.setAttribute('aria-selected', 'false');
    });
    panels.forEach(p => p.classList.add('contact__panel--hidden'));

    tab.classList.add('contact__tab--active');
    tab.setAttribute('aria-selected', 'true');
    document.getElementById(`panel-${tab.dataset.tab}`).classList.remove('contact__panel--hidden');
  });
});

// ==========================================
// Form — Formspree submission
// ==========================================
// 手順: https://formspree.io でアカウント作成 → 新規フォーム作成 →
// 発行されたエンドポイント URL（例: https://formspree.io/f/xpzgkdvw）を下記に貼り付ける
const FORMSPREE_ENDPOINT = 'https://formspree.io/f/YOUR_FORM_ID';

const form = document.getElementById('contactForm');
const successBox = document.getElementById('formSuccess');

if (form) form.addEventListener('submit', async e => {
  e.preventDefault();
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  const btn = form.querySelector('button[type="submit"]');
  btn.textContent = '送信中…';
  btn.disabled = true;

  const data = new FormData(form);

  try {
    const res = await fetch(FORMSPREE_ENDPOINT, {
      method: 'POST',
      body: data,
      headers: { Accept: 'application/json' },
    });

    if (res.ok) {
      form.hidden = true;
      successBox.hidden = false;
    } else {
      const json = await res.json().catch(() => ({}));
      const msg = json?.errors?.map(e => e.message).join(', ') || '送信に失敗しました。しばらく経ってから再度お試しください。';
      alert(msg);
      btn.textContent = '送信する';
      btn.disabled = false;
    }
  } catch {
    alert('ネットワークエラーが発生しました。しばらく経ってから再度お試しください。');
    btn.textContent = '送信する';
    btn.disabled = false;
  }
});

// ==========================================
// Scroll reveal
// ==========================================
const revealEls = document.querySelectorAll(
  '.card, .step, .faq__item, .what__text, .about__image-wrap, .about__content, .section__header'
);
revealEls.forEach(el => el.classList.add('reveal'));

const observer = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('visible');
      observer.unobserve(e.target);
    }
  });
}, { threshold: 0.12 });
revealEls.forEach(el => observer.observe(el));

document.querySelectorAll('.card').forEach((el, i) => {
  el.style.transitionDelay = `${i * 0.1}s`;
});

// ==========================================
// Nav scroll style
// ==========================================
const nav = document.querySelector('.nav');
window.addEventListener('scroll', () => {
  nav.style.background = window.scrollY > 40
    ? 'rgba(14,14,16,0.97)'
    : 'rgba(14,14,16,0.85)';
}, { passive: true });

// ==========================================
// Mobile nav
// ==========================================
const hamburger = document.querySelector('.nav__hamburger');
hamburger.addEventListener('click', () => nav.classList.toggle('nav--open'));
document.querySelectorAll('.nav__links a').forEach(a => {
  a.addEventListener('click', () => nav.classList.remove('nav--open'));
});
