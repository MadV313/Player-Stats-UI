// scripts/stats.js
// Player Stats page — now token-aware.
// Prefers /me/<token> endpoints when ?token=&api= are present (or token in localStorage),
// with graceful fallbacks to /user/:id and computed collection stats.

document.addEventListener("DOMContentLoaded", async () => {
  const qs = new URLSearchParams(location.search);

  // --- Resolve API base (prefer global/window, then ?api=, then UI proxy)
  const API_BASE =
    (typeof window !== "undefined" && window.API_BASE) ||
    (qs.get("api") ? qs.get("api").replace(/\/+$/, "") : "") ||
    "/api";

  // --- Resolve token (URL → saved → window)
  let token =
    qs.get("token") ||
    (typeof localStorage !== "undefined" && localStorage.getItem("sv13.token")) ||
    (typeof window !== "undefined" && window.PLAYER_TOKEN) ||
    "";

  // Persist any token we just learned (so other UIs can reuse it)
  try {
    if (token) localStorage.setItem("sv13.token", token);
  } catch {}

  // --- Optional legacy "id" fallback (if no token)
  const legacyUserId = qs.get("id") || "";

  // --- UI helpers
  const $ = (id) => document.getElementById(id);
  const setText = (id, v) => {
    const el = $(id);
    if (el) el.textContent = v;
  };

  // Defaults while loading
  setText("player-name", "Loading...");
  setText("player-coins", "–");
  setText("cards-collected", "–");
  setText("cards-owned", "–");
  setText("win-loss", "–");

  // --- Utilities
  const safeFetch = async (input, init) => {
    const res = await fetch(input, init);
    const text = await res.text().catch(() => "");
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch {}
    if (!res.ok) {
      const msg = (data && data.error) || `${res.status} ${res.statusText || ""}`.trim();
      const err = new Error(msg);
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  };

  async function loadViaToken() {
    const base = API_BASE.replace(/\/+$/, "");
    const encToken = encodeURIComponent(token);

    // 1) /me/<token>/stats
    let stats = null;
    try {
      stats = await safeFetch(`${base}/me/${encToken}/stats`, { cache: "no-store" });
    } catch (e) {
      // If API_BASE is the UI proxy and backend is unreachable, this will throw.
      // We'll continue to fallbacks below.
      console.warn("[stats] /me/<token>/stats failed:", e?.message || e);
    }

    // 2) /me/<token>/collection (to compute counts if missing)
    let collection = null;
    try {
      collection = await safeFetch(`${base}/me/${encToken}/collection`, { cache: "no-store" });
    } catch (e) {
      console.warn("[stats] /me/<token>/collection failed:", e?.message || e);
    }

    // ---- Render
    // Name
    const displayName =
      (stats && (stats.name || stats.discordName || stats.username)) ||
      "Survivor";
    setText("player-name", displayName);

    // Coins
    if (stats && (Number.isFinite(stats.coins) || Number.isFinite(stats.balance))) {
      setText("player-coins", String(stats.coins ?? stats.balance ?? 0));
    } else {
      setText("player-coins", "0");
    }

    // Cards collected (unique) + owned (total)
    // Prefer stats.cards / stats.collected when present; else compute from collection.
    let collected = Number(stats?.cards ?? stats?.collected);
    let ownedTotal = Number(stats?.owned ?? stats?.cardsOwned);

    if (!Number.isFinite(collected) || !Number.isFinite(ownedTotal)) {
      if (Array.isArray(collection)) {
        // Array of { card_id, owned/quantity }
        let uniq = 0;
        let total = 0;
        for (const c of collection) {
          const q = Number(c.owned ?? c.quantity ?? 0);
          if (q > 0) uniq += 1;
          if (Number.isFinite(q)) total += q;
        }
        if (!Number.isFinite(collected)) collected = uniq;
        if (!Number.isFinite(ownedTotal)) ownedTotal = total;
      } else if (collection && typeof collection === "object") {
        // Map-like { "001": 2, "002": 0, ... }
        let uniq = 0;
        let total = 0;
        for (const v of Object.values(collection)) {
          const q = Number(v);
          if (q > 0) uniq += 1;
          if (Number.isFinite(q)) total += q;
        }
        if (!Number.isFinite(collected)) collected = uniq;
        if (!Number.isFinite(ownedTotal)) ownedTotal = total;
      }
    }

    setText("cards-collected", `${Number.isFinite(collected) ? collected : 0} / 127`);
    setText("cards-owned", `${Number.isFinite(ownedTotal) ? ownedTotal : 0} / 250`);

    // W/L
    const wins = Number(stats?.duelsWon ?? stats?.wins);
    const losses = Number(stats?.duelsLost ?? stats?.losses);
    if (Number.isFinite(wins) || Number.isFinite(losses)) {
      setText("win-loss", `${Number.isFinite(wins) ? wins : 0} / ${Number.isFinite(losses) ? losses : 0}`);
    } else {
      setText("win-loss", "0 / 0");
    }
  }

  async function loadViaLegacyUserId() {
    // If API_BASE is a proxy, user route may be /user/:id relative to proxy.
    // If API_BASE is absolute to backend, same path works.
    const base = API_BASE.replace(/\/+$/, "");
    try {
      const data = await safeFetch(`${base}/user/${encodeURIComponent(legacyUserId)}`, { cache: "no-store" });

      setText("player-name", data.name || "Survivor");
      setText("player-coins", String(data.coins ?? 0));
      setText("cards-collected", `${Number(data.cardsCollected ?? data.collected ?? 0)} / 127`);
      setText("cards-owned", `${Number(data.cardsOwned ?? data.owned ?? 0)} / 250`);
      setText("win-loss", `${Number(data.duelsWon ?? data.wins ?? 0)} / ${Number(data.duelsLost ?? data.losses ?? 0)}`);
    } catch (err) {
      console.error("❌ Failed to load legacy user data:", err);
      setText("player-name", "⚠️ Failed to load.");
    }
  }

  try {
    if (token) {
      await loadViaToken();
    } else if (legacyUserId) {
      await loadViaLegacyUserId();
    } else {
      setText("player-name", "❌ No token or user id provided.");
    }
  } catch (e) {
    console.error("❌ Stats load error:", e);
    setText("player-name", "⚠️ Failed to load.");
  }
});
