(() => {
  const STORAGE_KEY = "remoteJobs.v1";

  const SAMPLE_JOBS = [
    {
      id: "sample-1",
      title: "Senior Frontend Developer",
      company: "Example Co",
      category: "Engineering",
      type: "Full-time",
      region: "Worldwide",
      salary: "$90k – $120k",
      url: "https://example.com/jobs/frontend",
      description: "Build and maintain our web app with React and TypeScript.\nThis is a sample listing — edit or delete it.",
      tags: ["react", "typescript"],
      createdAt: Date.now() - 86400000 * 2,
    },
    {
      id: "sample-2",
      title: "Customer Support Specialist",
      company: "Sample Inc.",
      category: "Support",
      type: "Part-time",
      region: "Europe",
      salary: "",
      url: "https://example.com/jobs/support",
      description: "Help customers over chat and email. Flexible hours.",
      tags: ["support", "english"],
      createdAt: Date.now() - 86400000 * 5,
    },
  ];

  // Editing tools are hidden from visitors. Add ?admin to the address to show them.
  if (new URLSearchParams(location.search).has("admin")) document.body.classList.add("is-admin");

  const $ = (id) => document.getElementById(id);
  const els = {
    list: $("list"), empty: $("empty"), count: $("countText"),
    search: $("search"), fCategory: $("fCategory"), fType: $("fType"),
    fRegion: $("fRegion"), fSort: $("fSort"),
    jobDialog: $("jobDialog"), jobForm: $("jobForm"), formTitle: $("formTitle"),
    formError: $("formError"), manageDialog: $("manageDialog"), importFile: $("importFile"),
  };
  const fields = ["title", "company", "category", "type", "region", "salary", "url", "description", "tags"];

  // ---------- storage ----------
  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw === null) return (window.SEED_JOBS || SAMPLE_JOBS).slice();
      const data = JSON.parse(raw);
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }
  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs));
  }
  let jobs = load();

  // ---------- helpers ----------
  const uid = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()));

  function isHttpUrl(value) {
    try {
      const u = new URL(value);
      return u.protocol === "http:" || u.protocol === "https:";
    } catch {
      return false;
    }
  }

  // Stable color per company name, for the avatar badge.
  function hue(name = "") {
    let h = 0;
    for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) % 360;
    return h;
  }

  function timeAgo(ts) {
    const days = Math.floor((Date.now() - ts) / 86400000);
    if (days < 1) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 30) return `${days} days ago`;
    const months = Math.floor(days / 30);
    return months === 1 ? "1 month ago" : `${months} months ago`;
  }

  function el(tag, props = {}, ...children) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (k === "class") node.className = v;
      else if (k === "text") node.textContent = v;
      else if (k.startsWith("on")) node.addEventListener(k.slice(2), v);
      else node.setAttribute(k, v);
    }
    for (const c of children) if (c) node.append(c);
    return node;
  }

  // ---------- filters ----------
  function uniqueValues(key) {
    return [...new Set(jobs.map((j) => (j[key] || "").trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  }

  function fillSelect(select, values, placeholder) {
    const current = select.value;
    select.replaceChildren(el("option", { value: "", text: placeholder }));
    for (const v of values) select.append(el("option", { value: v, text: v }));
    select.value = values.includes(current) ? current : "";
  }

  function fillDatalist(id, values) {
    $(id).replaceChildren(...values.map((v) => el("option", { value: v })));
  }

  function refreshFilterOptions() {
    fillSelect(els.fCategory, uniqueValues("category"), "All categories");
    fillSelect(els.fType, uniqueValues("type"), "All job types");
    fillSelect(els.fRegion, uniqueValues("region"), "All regions");
    fillDatalist("categoryList", uniqueValues("category"));
    fillDatalist("regionList", uniqueValues("region"));
  }

  function filtered() {
    const q = els.search.value.trim().toLowerCase();
    const cat = els.fCategory.value, type = els.fType.value, region = els.fRegion.value;
    let out = jobs.filter((j) => {
      if (cat && j.category !== cat) return false;
      if (type && j.type !== type) return false;
      if (region && j.region !== region) return false;
      if (!q) return true;
      const hay = [j.title, j.company, j.category, j.region, j.description, (j.tags || []).join(" ")]
        .join(" ").toLowerCase();
      return q.split(/\s+/).every((word) => hay.includes(word));
    });
    const sort = els.fSort.value;
    out.sort((a, b) =>
      sort === "old" ? a.createdAt - b.createdAt
      : sort === "company" ? (a.company || "").localeCompare(b.company || "")
      : b.createdAt - a.createdAt);
    return out;
  }

  // ---------- render ----------
  function renderJob(job) {
    const desc = el("p", { class: "desc clamped", text: job.description || "" });
    const toggle = (job.description || "").length > 160
      ? el("button", {
          class: "link-btn", type: "button", text: "Show more",
          onclick: (e) => {
            const clamped = desc.classList.toggle("clamped");
            e.target.textContent = clamped ? "Show more" : "Show less";
          },
        })
      : null;

    const meta = el("div", { class: "meta" },
      job.category && el("span", { class: "pill", text: job.category }),
      job.type && el("span", { class: "pill", text: job.type }),
      job.region && el("span", { class: "pill region", text: "🌍 " + job.region }),
      job.salary && el("span", { class: "pill salary", text: job.salary }));

    const tags = (job.tags || []).length
      ? el("div", { class: "meta" }, ...job.tags.map((t) => el("span", { class: "tag", text: "#" + t })))
      : null;

    const apply = isHttpUrl(job.url)
      ? el("a", { class: "apply", href: job.url, target: "_blank", rel: "noopener noreferrer nofollow", text: "Apply →" })
      : null;

    return el("article", { class: "job" },
      el("div", { class: "job-head" },
        el("div", { class: "job-title" },
          el("div", { class: "avatar", style: `--h:${hue(job.company)}`, text: (job.company || "?").trim().charAt(0).toUpperCase() }),
          el("div", {},
            el("h3", { text: job.title }),
            el("span", { class: "company", text: job.company }))),
        apply),
      meta,
      job.description ? desc : null,
      toggle,
      tags,
      el("div", { class: "job-foot" },
        el("span", { class: "date", text: timeAgo(job.createdAt) }),
        el("div", { class: "job-actions admin-only" },
          el("button", { class: "btn btn-ghost btn-small", type: "button", text: "Edit", onclick: () => openForm(job) }),
          el("button", {
            class: "btn btn-danger btn-small", type: "button", text: "Delete",
            onclick: () => {
              if (confirm(`Delete "${job.title}"?`)) {
                jobs = jobs.filter((j) => j.id !== job.id);
                save();
                render(true);
              }
            },
          }))));
  }

  function render(refreshOptions = false) {
    if (refreshOptions) refreshFilterOptions();
    const shown = filtered();
    els.list.replaceChildren(...shown.map(renderJob));
    els.empty.hidden = shown.length > 0;
    els.count.textContent = jobs.length;
  }

  // ---------- add / edit ----------
  function openForm(job) {
    els.jobForm.reset();
    els.formError.hidden = true;
    $("jobId").value = job ? job.id : "";
    els.formTitle.textContent = job ? "Edit job" : "Post a job";
    if (job) {
      for (const f of fields) {
        $(f).value = f === "tags" ? (job.tags || []).join(", ") : job[f] || "";
      }
    }
    els.jobDialog.showModal();
    $("title").focus();
  }

  function showError(msg) {
    els.formError.textContent = msg;
    els.formError.hidden = false;
  }

  els.jobForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const values = Object.fromEntries(fields.map((f) => [f, $(f).value.trim()]));
    if (!values.title || !values.company) return showError("Title and company are required.");
    if (!isHttpUrl(values.url)) return showError("Enter a valid apply link starting with http:// or https://");

    const tags = values.tags.split(",").map((t) => t.trim().replace(/^#/, "")).filter(Boolean);
    const id = $("jobId").value;
    if (id) {
      const job = jobs.find((j) => j.id === id);
      if (job) Object.assign(job, values, { tags });
    } else {
      jobs.push({ id: uid(), ...values, tags, createdAt: Date.now() });
    }
    save();
    els.jobDialog.close();
    render(true);
  });

  $("addBtn").addEventListener("click", () => openForm(null));
  $("cancelBtn").addEventListener("click", () => els.jobDialog.close());

  // ---------- manage: export / import / reset ----------
  $("manageBtn").addEventListener("click", () => els.manageDialog.showModal());
  $("closeManageBtn").addEventListener("click", () => els.manageDialog.close());

  $("exportBtn").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(jobs, null, 2)], { type: "application/json" });
    const a = el("a", { href: URL.createObjectURL(blob), download: "remote-jobs.json" });
    a.click();
    URL.revokeObjectURL(a.href);
  });

  $("importBtn").addEventListener("click", () => els.importFile.click());
  els.importFile.addEventListener("change", async () => {
    const file = els.importFile.files[0];
    els.importFile.value = "";
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (!Array.isArray(data)) throw new Error("Expected a list of jobs");
      const valid = data
        .filter((j) => j && typeof j.title === "string" && typeof j.company === "string")
        .map((j) => ({
          id: typeof j.id === "string" ? j.id : uid(),
          title: j.title, company: j.company,
          category: String(j.category || ""), type: String(j.type || ""),
          region: String(j.region || ""), salary: String(j.salary || ""),
          url: String(j.url || ""), description: String(j.description || ""),
          tags: Array.isArray(j.tags) ? j.tags.map(String) : [],
          createdAt: Number(j.createdAt) || Date.now(),
        }));
      const existing = new Set(jobs.map((j) => j.id));
      const fresh = valid.filter((j) => !existing.has(j.id));
      jobs.push(...fresh);
      save();
      render(true);
      alert(`Imported ${fresh.length} job(s)` + (valid.length - fresh.length ? `, skipped ${valid.length - fresh.length} duplicate(s).` : "."));
    } catch (err) {
      alert("Could not import that file: " + err.message);
    }
  });

  $("resetBtn").addEventListener("click", () => {
    if (confirm("Delete ALL jobs? Export a backup first if you want to keep them.")) {
      jobs = [];
      save();
      render(true);
      els.manageDialog.close();
    }
  });

  // ---------- filter events ----------
  for (const node of [els.search, els.fCategory, els.fType, els.fRegion, els.fSort]) {
    node.addEventListener("input", () => render());
  }
  $("clearBtn").addEventListener("click", () => {
    els.search.value = "";
    els.fCategory.value = els.fType.value = els.fRegion.value = "";
    els.fSort.value = "new";
    render();
  });

  render(true);
})();
