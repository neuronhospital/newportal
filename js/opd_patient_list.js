(() => {
  const CACHE_PREFIX = "OPD_TODAY|";
  const CACHE_TYPE = "OPD_TODAY";
  const popupState = { open: false, city: "", key: "", updating: false };

  const esc = v => U.esc(v == null ? "" : v);
  const todayKey = () => {
    const p = U.parts();
    return `${p.y}${String(p.m).padStart(2, "0")}${String(p.d).padStart(2, "0")}`;
  };
  const cacheKey = (date, city) => `${CACHE_PREFIX}${date}|${city}`;

  function currentCity() {
    return String(window.TodayCity?.resolve?.() || "").trim();
  }

  function ageText(p) {
    const age = p?.age;
    const n = Number(age);
    const value = Number.isFinite(n) ? String(age) : String(age ?? "").trim();
    const unit = String(p?.ageUnit || "").trim().toLowerCase();
    if (!value) return "";
    const labels = { days: n === 1 ? "Day" : "Days", months: n === 1 ? "Month" : "Months", years: n === 1 ? "Year" : "Years" };
    return `${value} ${labels[unit] || unit}`.trim();
  }

  function paidText(p) {
    const paid = Number(p?.opdTotalPaid);
    const charges = Number(p?.opdCharges);
    const amount = Number.isFinite(paid) ? paid : (Number.isFinite(charges) ? charges : 0);
    return U.money(amount);
  }

  function serialOf(id) {
    const m = String(id || "").match(/-(\d+)$/);
    return m ? Number(m[1]) : Number.POSITIVE_INFINITY;
  }

  function sortPatients(patients) {
    return [...(Array.isArray(patients) ? patients : [])].sort((a, b) => {
      const sa = serialOf(a?.appointmentId), sb = serialOf(b?.appointmentId);
      if (sa !== sb) return sa - sb;
      return String(a?.time || "").localeCompare(String(b?.time || ""));
    });
  }

  function setStatus(text, kind = "") {
    const el = $("opdTodayStatus");
    if (!el) return;
    el.textContent = text || "";
    el.className = `opd-today-status${kind ? ` is-${kind}` : ""}`;
    el.hidden = !text;
  }

  function render(record) {
    const list = $("opdTodayList");
    if (!list) return;
    const patients = sortPatients(record?.patients || []);
    if (!patients.length) {
      list.innerHTML = '<div class="opd-today-empty">No OPD patients found for today.</div>';
      return;
    }
    list.innerHTML = patients.map((p, i) => {
      const age = ageText(p);
      const meta = age ? `${age} • ${paidText(p)}` : paidText(p);
      return `<div class="opd-today-row"><span class="opd-today-number">${i + 1}.</span><span class="opd-today-patient"><b>${esc(p?.name || "")}</b><span>${esc(meta)}</span></span></div>`;
    }).join("");
  }

  function setLastUpdated(record) {
    const el = $("opdTodayLastUpdated");
    if (!el) return;
    const ts = Number(record?.lastServerRefreshAt || 0);
    if (!ts) { el.hidden = true; el.textContent = ""; return; }
    const d = new Date(ts);
    const time = d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true });
    el.textContent = `Last updated: ${time}`;
    el.hidden = false;
  }

  function showCacheStatus(record) {
    const status = String(record?.status || "");
    const stale = window.IDB?.cacheStale_?.(record, record?.patients, "appointmentId") === true;
    if (status === "CACHED_INCOMPLETE" || status === "STALE" || stale) {
      setStatus("⚠ This list is not up to date. Please Update.", "warning");
    } else if (status === "REFRESHING") {
      setStatus("Updating from server…", "working");
    } else if (status === "REFRESHED") {
      setStatus("Server refreshed • Local cache updated", "success");
    } else {
      setStatus("Local cache • Up to date", "success");
    }
  }

  async function cleanupOldCaches(today) {
    try { await IDB.deleteCacheByPrefixExcept("cache", CACHE_PREFIX, `${CACHE_PREFIX}${today}|`); } catch (_) {}
  }

  function baseRecord(date, city, patients, complete, refreshAt) {
    return {
      key: cacheKey(date, city),
      type: CACHE_TYPE,
      date,
      city,
      patients: sortPatients(patients),
      status: complete ? "CACHED_COMPLETE" : "CACHED_INCOMPLETE",
      complete: complete === true,
      lastServerRefreshAt: refreshAt,
      lastServerCheckAt: refreshAt,
      cachedAt: refreshAt
    };
  }

  async function retrieveFromServer(city) {
    const r = await NeuronAPI.call("getTodayOPDPatientList", { city }, 15000);
    if (!r || r.ok !== true) throw Error(r?.error || "Unable to retrieve today's OPD patient list.");
    return r;
  }

  async function refresh(city, existingRecord = null) {
    const date = todayKey(), key = cacheKey(date, city);
    if (popupState.updating) return;
    popupState.updating = true;
    setStatus("Updating from server…", "working");
    const previous = existingRecord || await IDB.get("cache", key).catch(() => null);
    try {
      const r = await retrieveFromServer(city);
      const now = Date.now();
      const record = baseRecord(date, city, r.patients, r.complete !== false, now);
      record.status = r.complete === false ? "CACHED_INCOMPLETE" : "REFRESHED";
      await IDB.replace("cache", key, record);
      render(record);
      setLastUpdated(record);
      showCacheStatus(record);
      return record;
    } catch (e) {
      if (previous) {
        render(previous);
        setLastUpdated(previous);
        showCacheStatus(previous);
      } else {
        setStatus(e?.message || "Unable to update patient list.", "warning");
      }
      throw e;
    } finally {
      popupState.updating = false;
    }
  }

  async function openPopup() {
    const m = $("opdTodayPopup");
    if (!m) return;
    const city = currentCity();
    const date = todayKey();

    popupState.open = true;
    popupState.city = city;
    popupState.key = city ? cacheKey(date, city) : "";
    m.hidden = false;
    document.body.classList.add("opd-today-modal-open");
    setStatus("", "");
    setLastUpdated(null);

    if (!city) {
      $("opdTodayList").innerHTML = `<div class="opd-today-empty">Today's OPD city is not selected.</div>`;
      return;
    }

    $("opdTodayList").innerHTML = '<div class="opd-today-loading">Loading…</div>';
    await cleanupOldCaches(date);

    let record = await IDB.get("cache", popupState.key).catch(() => null);
    if (record) {
      render(record);
      setLastUpdated(record);
      showCacheStatus(record);
      return;
    }
    try {
      record = await refresh(city);
    } catch (_) {
      $("opdTodayList").innerHTML = '<div class="opd-today-empty">Unable to retrieve today’s OPD list.</div>';
    }
  }

  function closePopup() {
    const m = $("opdTodayPopup");
    if (m) m.hidden = true;
    popupState.open = false;
    document.body.classList.remove("opd-today-modal-open");
  }

  async function handleUpdate() {
    const city = currentCity();
    const date = todayKey();
    if (!city) { setStatus("Today's OPD city is not selected.", "warning"); return; }
    popupState.city = city;
    popupState.key = cacheKey(date, city);
    const previous = await IDB.get("cache", popupState.key).catch(() => null);
    try { await refresh(city, previous); } catch (_) {}
  }


  document.addEventListener("DOMContentLoaded", () => {
    const section = document.querySelector(".portal-section-opd");
    if (!section) return;
    section.querySelector(".opd-patient-list-trigger")?.addEventListener("click", openPopup);
    section.querySelector(".opd-patient-list-trigger")?.addEventListener("keydown", e => { if(e.key === "Enter" || e.key === " "){ e.preventDefault(); openPopup(); } });
    section.querySelectorAll(".portal-action").forEach(a => a.addEventListener("click", e => e.stopPropagation()));
    $("opdTodayUpdate")?.addEventListener("click", handleUpdate);
    $("opdTodayOk")?.addEventListener("click", closePopup);
    $("opdTodayBackdrop")?.addEventListener("click", closePopup);
    document.addEventListener("keydown", e => { if (e.key === "Escape" && popupState.open) closePopup(); });
  });
})();
