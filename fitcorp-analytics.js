/**
 * FitCorp Analytics Tracker v1.0
 * Paste this script at the bottom of index.html, before </body>
 * 
 * Tracks: page views, unique visitors, conversions (form submissions),
 * CTA clicks per button, referrers, visitor language
 */
(function () {
  const DB_KEY = "fitcorp_analytics";
  const SESSION_KEY = "fitcorp_session";

  // ── Helpers ──────────────────────────────────────────────────────────────

  function getDB() {
    try {
      return JSON.parse(localStorage.getItem(DB_KEY)) || initDB();
    } catch {
      return initDB();
    }
  }

  function saveDB(db) {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
  }

  function initDB() {
    return {
      pageViews: 0,
      uniqueVisitors: 0,
      visitorIds: [],
      conversions: 0,
      ctaClicks: {},       // { buttonLabel: count }
      referrers: {},       // { domain: count }
      languages: {},       // { lang: count }
      dailyViews: {},      // { "YYYY-MM-DD": count }
      dailyConversions: {}, // { "YYYY-MM-DD": count }
    };
  }

  function today() {
    return new Date().toISOString().split("T")[0];
  }

  function getVisitorId() {
    let id = localStorage.getItem("fitcorp_vid");
    if (!id) {
      id = "v_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem("fitcorp_vid", id);
    }
    return id;
  }

  function isNewSession() {
    const last = sessionStorage.getItem(SESSION_KEY);
    if (!last) {
      sessionStorage.setItem(SESSION_KEY, Date.now().toString());
      return true;
    }
    return false;
  }

  // ── Track Page View ───────────────────────────────────────────────────────

  function trackPageView() {
    const db = getDB();
    const d = today();
    const visitorId = getVisitorId();

    db.pageViews++;
    db.dailyViews[d] = (db.dailyViews[d] || 0) + 1;

    // Unique visitor (by persistent ID, counted once per ID)
    if (!db.visitorIds.includes(visitorId)) {
      db.visitorIds.push(visitorId);
      db.uniqueVisitors++;
    }

    // Referrer
    const ref = document.referrer;
    if (ref) {
      try {
        const domain = new URL(ref).hostname.replace(/^www\./, "");
        db.referrers[domain] = (db.referrers[domain] || 0) + 1;
      } catch {}
    } else {
      db.referrers["direct"] = (db.referrers["direct"] || 0) + 1;
    }

    // Language
    const lang = (navigator.language || "unknown").split("-")[0].toLowerCase();
    db.languages[lang] = (db.languages[lang] || 0) + 1;

    saveDB(db);
  }

  // ── Track Conversions ─────────────────────────────────────────────────────

  function trackConversion() {
    const db = getDB();
    const d = today();
    db.conversions++;
    db.dailyConversions[d] = (db.dailyConversions[d] || 0) + 1;
    saveDB(db);
    console.log("[FitCorp Analytics] Conversion tracked");
  }

  // ── Track CTA Clicks ──────────────────────────────────────────────────────

  function trackCTAClick(label) {
    const db = getDB();
    db.ctaClicks[label] = (db.ctaClicks[label] || 0) + 1;
    saveDB(db);
    console.log("[FitCorp Analytics] CTA click:", label);
  }

  // ── Auto-attach to CTAs ───────────────────────────────────────────────────

  function attachCTAListeners() {
    // Buttons and links that look like CTAs
    const selectors = [
      'a[href*="#contact"]',
      'a[href*="#form"]',
      'button[type="submit"]',
      ".cta-button",
      ".btn-primary",
      '[data-cta]',
    ];
    selectors.forEach((sel) => {
      document.querySelectorAll(sel).forEach((el) => {
        if (el._fitcorpTracked) return;
        el._fitcorpTracked = true;
        el.addEventListener("click", () => {
          const label =
            el.dataset.cta ||
            el.innerText.trim().slice(0, 40) ||
            el.getAttribute("href") ||
            "unknown";
          trackCTAClick(label);
        });
      });
    });

    // Also track any element with data-track attribute
    document.querySelectorAll("[data-track]").forEach((el) => {
      if (el._fitcorpTracked) return;
      el._fitcorpTracked = true;
      el.addEventListener("click", () => {
        trackCTAClick(el.dataset.track);
      });
    });
  }

  // ── Auto-attach to Forms ──────────────────────────────────────────────────

  function attachFormListeners() {
    document.querySelectorAll("form").forEach((form) => {
      if (form._fitcorpTracked) return;
      form._fitcorpTracked = true;
      form.addEventListener("submit", () => {
        trackConversion();
      });
    });
  }

  // ── Init ──────────────────────────────────────────────────────────────────

  function init() {
    trackPageView();
    attachCTAListeners();
    attachFormListeners();

    // Re-scan after DOM changes (for SPAs or dynamic content)
    setTimeout(() => {
      attachCTAListeners();
      attachFormListeners();
    }, 2000);
  }

  // Expose globally for manual calls
  window.FitCorpAnalytics = {
    trackConversion,
    trackCTAClick,
    getDB,
    reset: () => {
      localStorage.removeItem(DB_KEY);
      console.log("[FitCorp Analytics] Data reset");
    },
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
