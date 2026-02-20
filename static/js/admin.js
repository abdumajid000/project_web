setupBaseUI();
if (!requireAuth('/admin/login')) throw new Error("Auth required");

const listEl = document.getElementById("pending-list");
const adminSearch = document.getElementById("admin-search");
const catNameInput = document.getElementById("new-category");
const categoryMsg = document.getElementById("cat-message");
let pendingItems = [];

async function checkAdmin() {
  const me = await fetchJSON('/auth/me', { headers: authHeaders() });
  if (!me.is_admin) {
    showToast("Admin ruxsati yo'q");
    setTimeout(() => { window.location.href = '/admin/login'; }, 400);
  }
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
      <div class="meta">Owner telegram_id: ${item.telegram_id || '-'}</div>
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
  listEl.innerHTML = '<div class="card muted">Yuklanmoqda...</div>';
  pendingItems = await fetchJSON(`${API}/admin/pending`, { headers: authHeaders() });
  applySearch();
}

document.getElementById("load-pending").addEventListener("click", () => {
  loadPending().catch((e) => showToast(e.message));
});

adminSearch.addEventListener("input", applySearch);

document.getElementById("add-category").addEventListener("click", async () => {
  categoryMsg.textContent = "";
  try {
    if (!catNameInput.value.trim()) throw new Error("Kategoriya nomini kiriting");
    const res = await fetchJSON(`${API}/admin/categories`, {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
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
  try {
    if (approveId) {
      await fetchJSON(`${API}/admin/approve/${approveId}`, { method: "POST", headers: authHeaders() });
      showToast("E'lon tasdiqlandi");
      await loadPending();
    }
    if (deleteId) {
      await fetchJSON(`${API}/admin/delete/${deleteId}`, { method: "DELETE", headers: authHeaders() });
      showToast("E'lon o'chirildi");
      await loadPending();
    }
  } catch (err) {
    showToast(err.message);
  }
});

checkAdmin().catch((e) => showToast(e.message));
