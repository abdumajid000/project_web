setupThemeToggle();

const tabs = document.querySelectorAll('.tab-btn');
const tabContent = {
  login: document.getElementById('tab-login'),
  register: document.getElementById('tab-register'),
  reset: document.getElementById('tab-reset'),
};

tabs.forEach((btn) => {
  btn.addEventListener('click', () => {
    tabs.forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    Object.values(tabContent).forEach((el) => el.classList.add('hidden'));
    tabContent[btn.dataset.tab].classList.remove('hidden');
  });
});

async function doLogin() {
  const phone = document.getElementById('login-phone').value.trim();
  const password = document.getElementById('login-password').value;
  const result = await fetchJSON(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, password }),
  });
  setAuthToken(result.token);
  setUserInfo({ full_name: result.full_name, phone: result.phone, is_admin: result.is_admin });
  showToast('Muvaffaqiyatli kirildi');
  setTimeout(() => {
    window.location.href = result.is_admin ? '/admin' : '/';
  }, 300);
}

document.getElementById('login-btn').addEventListener('click', async () => {
  try {
    await doLogin();
  } catch (e) {
    showToast(e.message);
  }
});

document.getElementById('send-code').addEventListener('click', async () => {
  try {
    const phone = document.getElementById('reg-phone').value.trim();
    const telegram_id = document.getElementById('telegram-id').value.trim();
    await fetchJSON(`${API}/auth/request-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, telegram_id }),
    });
    showToast('Kod yuborildi');
  } catch (e) {
    showToast(e.message);
  }
});

document.getElementById('verify-and-save').addEventListener('click', async () => {
  try {
    const phone = document.getElementById('reg-phone').value.trim();
    const code = document.getElementById('verify-code').value.trim();
    const full_name = document.getElementById('full-name').value.trim() || 'User';
    const telegram_id = document.getElementById('telegram-id').value.trim();
    const password = document.getElementById('set-password').value;

    await fetchJSON(`${API}/auth/verify-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, code, full_name, telegram_id }),
    });

    await fetchJSON(`${API}/auth/set-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, password }),
    });

    showToast("Ro'yxatdan o'tish tugadi. Endi login qiling");
    document.querySelector('[data-tab="login"]').click();
    document.getElementById('login-phone').value = phone;
  } catch (e) {
    showToast(e.message);
  }
});

document.getElementById('forgot-send').addEventListener('click', async () => {
  try {
    const phone = document.getElementById('reset-phone').value.trim();
    const telegram_id = document.getElementById('reset-telegram').value.trim();
    await fetchJSON(`${API}/auth/forgot-password/request-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, telegram_id }),
    });
    showToast('Tiklash kodi yuborildi');
  } catch (e) {
    showToast(e.message);
  }
});

document.getElementById('reset-btn').addEventListener('click', async () => {
  try {
    const phone = document.getElementById('reset-phone').value.trim();
    const code = document.getElementById('reset-code').value.trim();
    const new_password = document.getElementById('reset-pass').value;
    await fetchJSON(`${API}/auth/forgot-password/reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, code, new_password }),
    });
    showToast('Parol yangilandi. Endi login qiling');
    document.querySelector('[data-tab="login"]').click();
    document.getElementById('login-phone').value = phone;
  } catch (e) {
    showToast(e.message);
  }
});
