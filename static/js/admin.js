setupBaseUI();

const listEl = document.getElementById("pending-list");
const adminIdInput = document.getElementById("admin-id");
const adminSearch = document.getElementById("admin-search");
const catNameInput = document.getElementById("new-category");
const categoryMsg = document.getElementById("cat-message");
let pendingItems = [];

function getAdminId() {
  return adminIdInput.value.trim();
}

function renderPending(items) {
  listEl.innerHTML = "";
  if (!items.length) {
    listEl.innerHTML = '<div class="card">Pending e\'lon yo\'q.</div>';
    return;
  }

  items.forEach((item) => {
    const card = document.createElement("article");
    card.className = "item-card";
    card.innerHTML = `
      <h3>${item.title}</h3>
      <div class="stats">
        <span class="badge ${item.type}">${item.type === "lost" ? "Yo'qolgan" : "Topilgan"}</span>
        <span class="badge pending">pending</span>
        <span class="badge">${item.region}</span>
      </div>
      <p>${item.description}</p>
      <div class="meta">Owner telegram_id: ${item.telegram_id}</div>
      <div class="meta">Contact: ${item.contact}</div>
      <div class="actions">
        <button data-approve="${item.id}">Tasdiqlash</button>
        <button class="danger" data-delete="${item.id}">O'chirish</button>
      </div>
    `;
    listEl.appendChild(card);
  });
}

function applySearch() {
  const q = adminSearch.value.trim().toLowerCase();
  if (!q) return renderPending(pendingItems);
  renderPending(pendingItems.filter((i) => i.title.toLowerCase().includes(q)));
}

async function loadPending() {
  const telegram_id = getAdminId();
  if (!telegram_id) {
    listEl.innerHTML = '<div class="card">Admin telegram_id kiriting.</div>';
    return;
  }

  listEl.innerHTML = '<div class="card muted">Yuklanmoqda...</div>';
  pendingItems = await fetchJSON(`${API}/admin/pending?telegram_id=${encodeURIComponent(telegram_id)}`);
  applySearch();
}

document.getElementById("load-pending").addEventListener("click", () => {
  loadPending().catch((e) => showToast(e.message));
});

adminSearch.addEventListener("input", applySearch);

document.getElementById("add-category").addEventListener("click", async () => {
  categoryMsg.textContent = "";
  try {
    const telegram_id = getAdminId();
    if (!telegram_id) throw new Error("Avval admin telegram_id kiriting");
    if (!catNameInput.value.trim()) throw new Error("Kategoriya nomini kiriting");

    const res = await fetchJSON(`${API}/admin/categories?telegram_id=${encodeURIComponent(telegram_id)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: catNameInput.value.trim() }),
    });

    categoryMsg.textContent = `Qo'shildi: ${res.name}`;
    categoryMsg.className = "success";
    catNameInput.value = "";
    showToast("Kategoriya qo'shildi");
  } catch (e) {
    categoryMsg.textContent = e.message;
    categoryMsg.className = "error";
  }
});

listEl.addEventListener("click", async (e) => {
  const approveId = e.target.getAttribute("data-approve");
  const deleteId = e.target.getAttribute("data-delete");
  const adminId = getAdminId();

  if (!adminId) {
    showToast("Avval admin telegram_id kiriting");
    return;
  }

  try {
    if (approveId) {
      await fetchJSON(`${API}/admin/approve/${approveId}?telegram_id=${encodeURIComponent(adminId)}`, { method: "POST" });
      showToast("E'lon tasdiqlandi");
      await loadPending();
    }
    if (deleteId) {
      await fetchJSON(`${API}/admin/delete/${deleteId}?telegram_id=${encodeURIComponent(adminId)}`, { method: "DELETE" });
      showToast("E'lon o'chirildi");
      await loadPending();
    }
  } catch (err) {
    showToast(err.message);
  }
});
