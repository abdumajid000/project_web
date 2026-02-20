setupBaseUI();
if (!requireAuth()) throw new Error("Auth required");

const form = document.getElementById("create-form");
const messageEl = document.getElementById("form-message");
const categorySelect = document.getElementById("category");
const regionSelect = document.getElementById("region");
const submitBtn = document.getElementById("submit-btn");
const desc = document.getElementById("description");
const descCount = document.getElementById("desc-count");

fillRegionSelect(regionSelect, false);

function saveDraft() {
  const draft = {
    title: document.getElementById("title").value,
    description: document.getElementById("description").value,
    category: categorySelect.value,
    region: regionSelect.value,
    type: form.querySelector('input[name="type"]:checked')?.value || "",
    contact: document.getElementById("contact").value,
  };
  localStorage.setItem("lf_create_draft", JSON.stringify(draft));
}

function restoreDraft() {
  const raw = localStorage.getItem("lf_create_draft");
  if (!raw) return;
  try {
    const draft = JSON.parse(raw);
    document.getElementById("title").value = draft.title || "";
    document.getElementById("description").value = draft.description || "";
    categorySelect.value = draft.category || "";
    regionSelect.value = draft.region || "";
    if (draft.type) {
      const radio = form.querySelector(`input[name="type"][value="${draft.type}"]`);
      if (radio) radio.checked = true;
    }
    document.getElementById("contact").value = draft.contact || "";
    descCount.textContent = `${(draft.description || "").length} ta belgi`;
  } catch {
    localStorage.removeItem("lf_create_draft");
  }
}

desc.addEventListener("input", () => {
  descCount.textContent = `${desc.value.length} ta belgi`;
  saveDraft();
});

["title", "contact"].forEach((id) => document.getElementById(id).addEventListener("input", saveDraft));
categorySelect.addEventListener("change", saveDraft);
regionSelect.addEventListener("change", saveDraft);
form.querySelectorAll('input[name="type"]').forEach((r) => r.addEventListener("change", saveDraft));

async function loadCategories() {
  const categories = await fetchJSON(`${API}/categories`);
  categories.forEach((cat) => {
    const opt = document.createElement("option");
    opt.value = cat.id;
    opt.textContent = cat.name;
    categorySelect.appendChild(opt);
  });
  restoreDraft();
}

function validate(formData) {
  const required = ["title", "description", "category", "region", "contact"];
  for (const field of required) {
    if (!String(formData.get(field) || "").trim()) throw new Error(`"${field}" maydoni to'ldirilishi kerak`);
  }
  if (!formData.get("type")) throw new Error("Yo'qolgan/Topilgan turini tanlang");
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  messageEl.textContent = "";
  messageEl.className = "";
  try {
    submitBtn.disabled = true;
    submitBtn.textContent = "Yuborilmoqda...";

    const formData = new FormData(form);
    validate(formData);
    const payload = {
      title: String(formData.get("title")).trim(),
      description: String(formData.get("description")).trim(),
      category_id: Number(formData.get("category")),
      region: String(formData.get("region")).trim(),
      type: formData.get("type"),
      contact: String(formData.get("contact")).trim(),
    };

    const result = await fetchJSON(`${API}/items`, {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(payload),
    });

    messageEl.textContent = result.message;
    messageEl.className = "success";
    showToast("E'lon yuborildi");
    form.reset();
    descCount.textContent = "0 ta belgi";
    localStorage.removeItem("lf_create_draft");
  } catch (err) {
    messageEl.textContent = err.message;
    messageEl.className = "error";
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Yuborish";
  }
});

loadCategories().catch((e) => {
  messageEl.textContent = e.message;
  messageEl.className = "error";
});
