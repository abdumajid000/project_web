setupBaseUI();

const phone = document.getElementById("admin-phone");
const password = document.getElementById("admin-password");

document.getElementById("admin-login-btn").addEventListener("click", async () => {
  try {
    const result = await fetchJSON(`/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: phone.value.trim(), password: password.value }),
    });
    if (!result.is_admin) {
      showToast("Bu akkaunt admin emas");
      return;
    }
    setAuthToken(result.token);
    setUserInfo({ full_name: result.full_name, phone: result.phone, is_admin: result.is_admin });
    window.location.href = "/admin";
  } catch (e) {
    showToast(e.message);
  }
});
