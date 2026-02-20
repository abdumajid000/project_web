const phone = document.getElementById("login-phone");
const password = document.getElementById("login-password");
const fpTelegram = document.getElementById("fp-telegram");
const fpCode = document.getElementById("fp-code");
const fpPass = document.getElementById("fp-pass");

async function login() {
  const result = await fetchJSON(`/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone: phone.value.trim(), password: password.value }),
  });
  setAuthToken(result.token);
  setUserInfo({ full_name: result.full_name, phone: result.phone, is_admin: result.is_admin });
  showToast("Kirish muvaffaqiyatli");
  setTimeout(() => {
    window.location.href = result.is_admin ? "/admin" : "/";
  }, 300);
}

document.getElementById("login-btn").addEventListener("click", async () => {
  try {
    await login();
  } catch (e) {
    showToast(e.message);
  }
});

document.getElementById("fp-send").addEventListener("click", async () => {
  try {
    await fetchJSON(`/auth/forgot-password/request-code`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: phone.value.trim(), telegram_id: fpTelegram.value.trim() }),
    });
    showToast("Kod Telegramga yuborildi");
  } catch (e) {
    showToast(e.message);
  }
});

document.getElementById("fp-reset").addEventListener("click", async () => {
  try {
    await fetchJSON(`/auth/forgot-password/reset`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: phone.value.trim(), code: fpCode.value.trim(), new_password: fpPass.value }),
    });
    showToast("Parol yangilandi");
  } catch (e) {
    showToast(e.message);
  }
});
