const phone = document.getElementById("phone");
const telegramId = document.getElementById("telegram-id");
const fullName = document.getElementById("full-name");
const code = document.getElementById("code");
const setPassword = document.getElementById("set-password");

document.getElementById("send-code").addEventListener("click", async () => {
  try {
    await fetchJSON(`/auth/request-code`, {
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
    await fetchJSON(`/auth/verify-code`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone: phone.value.trim(),
        code: code.value.trim(),
        full_name: fullName.value.trim() || "User",
        telegram_id: telegramId.value.trim(),
      }),
    });
    showToast("Tasdiqlandi. Endi parol qo'ying");
  } catch (e) {
    showToast(e.message);
  }
});

document.getElementById("save-password").addEventListener("click", async () => {
  try {
    await fetchJSON(`/auth/set-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: phone.value.trim(), password: setPassword.value }),
    });
    showToast("Ro'yxatdan o'tish yakunlandi");
    setTimeout(() => {
      window.location.href = "/login";
    }, 400);
  } catch (e) {
    showToast(e.message);
  }
});
