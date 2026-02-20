setupBaseUI();

const listEl = document.getElementById("items-list");
const regionFilter = document.getElementById("region-filter");
const typeFilter = document.getElementById("type-filter");
const sortFilter = document.getElementById("sort-filter");
const searchFilter = document.getElementById("search-filter");
const countBadge = document.getElementById("count-badge");
const quickRegions = document.getElementById("quick-regions");

const metricTotal = document.getElementById("metric-total");
const metricLost = document.getElementById("metric-lost");
const metricFound = document.getElementById("metric-found");

const modal = document.getElementById("item-modal");
const modalClose = document.getElementById("modal-close");
const modalTitle = document.getElementById("modal-title");
const modalTags = document.getElementById("modal-tags");
const modalDescription = document.getElementById("modal-description");
const modalContact = document.getElementById("modal-contact");
const copyContactBtn = document.getElementById("copy-contact");

const PAGE_SIZE = 6;
let serverItems = [];
let selectedContact = "";
let currentPage = 1;

fillRegionSelect(regionFilter, true);

function persistFilters() {
  localStorage.setItem("lf_home_filters", JSON.stringify({
    region: regionFilter.value,
    type: typeFilter.value,
    sort: sortFilter.value,
    search: searchFilter.value,
  }));
}

function restoreFilters() {
  const saved = localStorage.getItem("lf_home_filters");
  if (!saved) return;
  try {
    const data = JSON.parse(saved);
    regionFilter.value = data.region || "";
    typeFilter.value = data.type || "";
    sortFilter.value = data.sort || "new";
    searchFilter.value = data.search || "";
  } catch {
    localStorage.removeItem("lf_home_filters");
  }
}

function buildRegionChips() {
  quickRegions.innerHTML = "";
  ["", ...REGIONS].forEach((region) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "chip";
    btn.textContent = region || "Hammasi";
    btn.addEventListener("click", () => {
      regionFilter.value = region;
      currentPage = 1;
      persistFilters();
      loadItems().catch((e) => showToast(e.message));
    });
    quickRegions.appendChild(btn);
  });
}

function updateMetrics(items) {
  metricTotal.textContent = String(items.length);
  metricLost.textContent = String(items.filter((x) => x.type === "lost").length);
  metricFound.textContent = String(items.filter((x) => x.type === "found").length);
}

function openModal(item) {
  selectedContact = item.contact;
  modalTitle.textContent = item.title;
  modalDescription.textContent = item.description;
  modalContact.textContent = `Aloqa: ${item.contact}`;
  modalTags.innerHTML = `
    <span class="badge ${item.type}">${item.type === "lost" ? "Yo'qolgan" : "Topilgan"}</span>
    <span class="badge">${item.region}</span>
    <span class="badge">${item.category_name}</span>
  `;
  modal.showModal();
}

function renderPagination(totalPages) {
  if (totalPages <= 1) return "";
  return `
    <div class="pager">
      <button type="button" class="secondary" ${currentPage === 1 ? "disabled" : ""} id="prev-page">◀ Oldingi</button>
      <span class="meta">Sahifa ${currentPage}/${totalPages}</span>
      <button type="button" class="secondary" ${currentPage === totalPages ? "disabled" : ""} id="next-page">Keyingi ▶</button>
    </div>
  `;
}

function renderItems(items) {
  listEl.innerHTML = "";
  countBadge.textContent = `${items.length} ta e'lon`;
  updateMetrics(items);

  if (!items.length) {
    listEl.innerHTML = '<div class="card muted">Hozircha mos e\'lon topilmadi.</div>';
    return;
  }

  const totalPages = Math.ceil(items.length / PAGE_SIZE);
  if (currentPage > totalPages) currentPage = totalPages;
  const start = (currentPage - 1) * PAGE_SIZE;
  const pageItems = items.slice(start, start + PAGE_SIZE);

  pageItems.forEach((item) => {
    const card = document.createElement("article");
    card.className = "item-card";
    card.innerHTML = `
      <h3>${item.title}</h3>
      <div class="stats">
        <span class="badge ${item.type}">${item.type === "lost" ? "Yo'qolgan" : "Topilgan"}</span>
        <span class="badge">${item.region}</span>
        <span class="badge">${item.category_name}</span>
      </div>
      <p>${item.description.slice(0, 150)}${item.description.length > 150 ? "..." : ""}</p>
      <div class="actions"><button type="button" data-open="${item.id}">Batafsil</button></div>
    `;
    card.querySelector("[data-open]").addEventListener("click", () => openModal(item));
    listEl.appendChild(card);
  });

  const pagerWrap = document.createElement("div");
  pagerWrap.innerHTML = renderPagination(totalPages);
  listEl.appendChild(pagerWrap);

  const prev = document.getElementById("prev-page");
  const next = document.getElementById("next-page");
  if (prev) prev.addEventListener("click", () => { currentPage -= 1; renderItems(items); });
  if (next) next.addEventListener("click", () => { currentPage += 1; renderItems(items); });
}

function clientFilter() {
  const q = searchFilter.value.trim().toLowerCase();
  let filtered = serverItems;

  if (q) filtered = filtered.filter((i) => i.title.toLowerCase().includes(q) || i.description.toLowerCase().includes(q));
  if (sortFilter.value === "old") filtered = [...filtered].reverse();
  if (sortFilter.value === "title") filtered = [...filtered].sort((a, b) => a.title.localeCompare(b.title));

  renderItems(filtered);
}

async function loadItems() {
  listEl.innerHTML = '<div class="card muted">Yuklanmoqda...</div>';
  const query = new URLSearchParams();
  if (regionFilter.value) query.set("region", regionFilter.value);
  if (typeFilter.value) query.set("type", typeFilter.value);
  serverItems = await fetchJSON(`${API}/items?${query.toString()}`);
  clientFilter();
}

document.getElementById("filter-btn").addEventListener("click", () => {
  currentPage = 1;
  persistFilters();
  loadItems().catch((e) => showToast(e.message));
});

document.getElementById("clear-btn").addEventListener("click", () => {
  regionFilter.value = "";
  typeFilter.value = "";
  sortFilter.value = "new";
  searchFilter.value = "";
  currentPage = 1;
  persistFilters();
  loadItems().catch((e) => showToast(e.message));
});

searchFilter.addEventListener("input", () => { currentPage = 1; persistFilters(); clientFilter(); });
sortFilter.addEventListener("change", () => { currentPage = 1; persistFilters(); clientFilter(); });
regionFilter.addEventListener("change", persistFilters);
typeFilter.addEventListener("change", persistFilters);

modalClose.addEventListener("click", () => modal.close());
copyContactBtn.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(selectedContact);
    showToast("Kontakt nusxalandi");
  } catch {
    showToast("Nusxalashda xatolik");
  }
});

restoreFilters();
buildRegionChips();
loadItems().catch((e) => showToast(e.message));
