(() => {
  const CACHE_PREFIX = "EEG_TODAY|";
  const CACHE_TYPE = "EEG_TODAY";
  const popupState = { open: false, city: "", key: "", updating: false };

  const esc = v => U.esc(v == null ? "" : v);
  const todayKey = () => {
    const p = U.parts();
    return `${p.y}${String(p.m).padStart(2, "0")}${String(p.d).padStart(2, "0")}`;
  };
  const cacheKey = (date, city) => `${CACHE_PREFIX}${date}|${city}`;

  function currentCity() {
    try { DailyCity.init(); } catch (_) {}
    return String(DailyCity?.get?.() || "").trim();
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
    return U.money(Number(p?.eegTotalPaid) || 0);
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
    const el = $("eegTodayStatus");
    if (!el) return;
    el.textContent = text || "";
    el.className = `eeg-today-status${kind ? ` is-${kind}` : ""}`;
    el.hidden = !text;
  }

  function render(record) {
    const list = $("eegTodayList");
    if (!list) return;
    const patients = sortPatients(record?.patients || []);
    if (!patients.length) {
      list.innerHTML = '<div class="eeg-today-empty">No EEG patients found for today.</div>';
      return;
    }
    list.innerHTML = patients.map((p, i) => {
      const age = ageText(p);
      const meta = age ? `${age} • ${paidText(p)}` : paidText(p);
      return `<div class="eeg-today-row"><span class="eeg-today-number">${i + 1}.</span><span class="eeg-today-patient"><b>${esc(p?.name || "")}</b><span>${esc(meta)}</span></span></div>`;
    }).join("");
  }

  function setLastUpdated(record) {
    const el = $("eegTodayLastUpdated");
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
    if (status === "CACHED_INCOMPLETE" || status === "STALE") {
      setStatus("⚠ Patient list may not be up-to-date.", "warning");
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
      cachedAt: refreshAt
    };
  }

  async function retrieveFromServer(city) {
    const r = await NeuronAPI.call("getTodayEEGPatientList", { city }, 15000);
    if (!r || r.ok !== true) throw Error(r?.error || "Unable to retrieve today's EEG patient list.");
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
    const city = currentCity();
    const date = todayKey();
    if (!city) {
      alert("Today's EEG city is not selected.");
      return;
    }
    const m = $("eegTodayPopup");
    if (!m) return;
    popupState.open = true;
    popupState.city = city;
    popupState.key = cacheKey(date, city);
    m.hidden = false;
    document.body.classList.add("eeg-today-modal-open");
    setStatus("", "");
    $("eegTodayList").innerHTML = '<div class="eeg-today-loading">Loading…</div>';
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
      $("eegTodayList").innerHTML = '<div class="eeg-today-empty">Unable to retrieve today’s EEG list.</div>';
    }
  }

  function closePopup() {
    const m = $("eegTodayPopup");
    if (m) m.hidden = true;
    popupState.open = false;
    document.body.classList.remove("eeg-today-modal-open");
  }

  async function handleUpdate() {
    const city = currentCity();
    const date = todayKey();
    if (!city) { setStatus("Today's EEG city is not selected.", "warning"); return; }
    popupState.city = city;
    popupState.key = cacheKey(date, city);
    const previous = await IDB.get("cache", popupState.key).catch(() => null);
    try { await refresh(city, previous); } catch (_) {}
  }

  document.addEventListener("DOMContentLoaded", () => {
    const section = document.querySelector(".portal-section-eeg");
    if (!section) return;
    section.querySelector(".portal-section-title")?.addEventListener("click", openPopup);
    section.querySelector(".portal-section-title")?.addEventListener("keydown", e => { if(e.key === "Enter" || e.key === " "){ e.preventDefault(); openPopup(); } });
    section.querySelectorAll(".portal-action").forEach(a => a.addEventListener("click", e => e.stopPropagation()));
    $("eegTodayUpdate")?.addEventListener("click", handleUpdate);
    $("eegTodayOk")?.addEventListener("click", closePopup);
    $("eegTodayBackdrop")?.addEventListener("click", closePopup);
    document.addEventListener("keydown", e => { if (e.key === "Escape" && popupState.open) closePopup(); });
  });
})();
