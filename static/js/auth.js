setupBaseUI();

const phone = document.getElementById("phone");
const telegramId = document.getElementById("telegram-id");
const fullName = document.getElementById("full-name");
const code = document.getElementById("code");
const setPassword = document.getElementById("set-password");
const loginPassword = document.getElementById("login-password");
const resetCode = document.getElementById("reset-code");
const resetPass = document.getElementById("reset-pass");

async function loginAndStore() {
  const result = await fetchJSON(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone: phone.value.trim(), password: loginPassword.value }),
  });
  setAuthToken(result.token);
  setUserInfo({ full_name: result.full_name, phone: result.phone, is_admin: result.is_admin });
  showToast("Muvaffaqiyatli kirildi");
  setTimeout(() => {
    window.location.href = result.is_admin ? "/admin" : "/";
  }, 400);
}

document.getElementById("send-code").addEventListener("click", async () => {
  try {
    await fetchJSON(`${API}/auth/request-code`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: phone.value.trim(), telegram_id: telegramId.value.trim() }),
    });
    showToast("Kod yuborildi");
  } catch (e) {
    showToast(e.message);
  }
});

document.getElementById("verify-code").addEventListener("click", async () => {
  try {
    await fetchJSON(`${API}/auth/verify-code`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone: phone.value.trim(),
        code: code.value.trim(),
        full_name: fullName.value.trim() || "User",
        telegram_id: telegramId.value.trim(),
      }),
    });
    showToast("Telefon tasdiqlandi");
  } catch (e) {
    showToast(e.message);
  }
});

document.getElementById("save-password").addEventListener("click", async () => {
  try {
    await fetchJSON(`${API}/auth/set-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: phone.value.trim(), password: setPassword.value }),
    });
    showToast("Parol saqlandi");
  } catch (e) {
    showToast(e.message);
  }
});

document.getElementById("login-btn").addEventListener("click", async () => {
  try {
    await loginAndStore();
  } catch (e) {
    showToast(e.message);
  }
});

document.getElementById("forgot-send").addEventListener("click", async () => {
  try {
    await fetchJSON(`${API}/auth/forgot-password/request-code`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: phone.value.trim(), telegram_id: telegramId.value.trim() }),
    });
    showToast("Tiklash kodi yuborildi");
  } catch (e) {
    showToast(e.message);
  }
});

document.getElementById("reset-btn").addEventListener("click", async () => {
  try {
    await fetchJSON(`${API}/auth/forgot-password/reset`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: phone.value.trim(), code: resetCode.value.trim(), new_password: resetPass.value }),
    });
    showToast("Parol yangilandi");
  } catch (e) {
    showToast(e.message);
  }
});
