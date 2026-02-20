setupBaseUI();

const listEl = document.getElementById("my-list");
const searchEl = document.getElementById("my-search");
const statusEl = document.getElementById("my-status");
let itemsRaw = [];

function render(items) {
  listEl.innerHTML = "";
  if (!items.length) {
    listEl.innerHTML = '<div class="card">Sizda mos e\'lon topilmadi.</div>';
    return;
  }

  items.forEach((item) => {
    const card = document.createElement("article");
    card.className = "item-card";
    card.innerHTML = `
      <h3>${item.title}</h3>
      <div class="stats">
        <span class="badge ${item.type}">${item.type === "lost" ? "Yo'qolgan" : "Topilgan"}</span>
        <span class="badge ${item.status}">${item.status}</span>
        <span class="badge">${item.region}</span>
      </div>
      <p>${item.description}</p>
      <div class="meta">Kategoriya: ${item.category_name}</div>
      <div class="meta">Aloqa: ${item.contact}</div>
    `;
    listEl.appendChild(card);
  });
}

function applyFilter() {
  const q = searchEl.value.trim().toLowerCase();
  const st = statusEl.value;
  let filtered = itemsRaw;
  if (q) filtered = filtered.filter((x) => x.title.toLowerCase().includes(q));
  if (st) filtered = filtered.filter((x) => x.status === st);
  render(filtered);
}

async function loadMine() {
  const telegram_id = getTelegramId();
  if (!telegram_id) {
    listEl.innerHTML = '<div class="card error">URL ichida telegram_id kerak</div>';
    return;
  }

  listEl.innerHTML = '<div class="card muted">Yuklanmoqda...</div>';
  itemsRaw = await fetchJSON(`${API}/items/my?telegram_id=${encodeURIComponent(telegram_id)}`);
  applyFilter();
}

searchEl.addEventListener("input", applyFilter);
statusEl.addEventListener("change", applyFilter);

loadMine().catch((e) => {
  listEl.innerHTML = `<div class="card error">${e.message}</div>`;
});
