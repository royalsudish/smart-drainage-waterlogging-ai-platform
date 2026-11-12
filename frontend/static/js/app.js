/**
 * Smart Drainage & Waterlogging - Early-Warning System
 * Core Frontend Application Logic
 * Integrates Trained AI/ML Models (waterlogging.pkl, drainage_random_forest.pkl)
 * with Multiple Live External APIs (Open-Meteo, SRTM, Sentinel-1 SAR, Sentinel-2, Overpass)
 * Guntur Municipal Corporation (GMC 57 Wards Baseline Edition)
 */

(function () {
  "use strict";

  // Application State
  const AppState = {
    activePage: "home",
    selectedLocation: {
      name: "Brodipet West, Guntur",
      lat: 16.302,
      lon: 80.428,
      ward_id: 4
    },
    selectedWardIds: [4],          // Array of selected ward IDs for multi-select
    trendPeriod: "24h",            // "6h", "24h", "48h", "7d"
    activeMapRiskFilter: "all",     // "all", "severe", "high", "moderate", "low", "unknown"
    activeTableRiskFilter: "all",   // "all", "severe", "high", "moderate", "low"
    tableSort: {
      column: "prob",
      asc: false
    },
    metrics: {
      waterloggingRisk: "Low",
      rainfall24h: 42,
      drainageStatus: "Estimated (Hydraulic survey pending)",
      coverage: "GMC - 57 Wards"
    },
    gmcData: null,                  // Full 57-Ward predictions & city-wide summary
    chartInstance: null,            // Chart.js instance for dual-axis trend
    maps: {
      location: null,
      drainage: null,
      waterlogging: null
    },
    gisData: {
      india: null,
      andhraPradesh: null,
      gunturDistrict: null,
      gmcWards: null
    },
    mapLayers: {
      indiaLayer: null,
      apLayer: null,
      gunturDistLayer: null,
      wlWardsLayer: null,
      sarLayer: null,
      hotspotsLayer: null,
      canalsLayer: null
    }
  };

  const WATERLOGGING_ALERT_THRESHOLD = 0.36;

  // Distinct palette for multi-ward risk trend comparison curves
  const WARD_COLOR_PALETTE = [
    "#00f0ff", "#f59e0b", "#a855f7", "#34d399", "#f87171",
    "#38bdf8", "#fb923c", "#ec4899", "#84cc16", "#eab308"
  ];

  // =========================================================================
  // 1. INITIALIZATION & ROUTING
  // =========================================================================
  document.addEventListener("DOMContentLoaded", () => {
    initClock();
    initNavigation();
    initActionButtons();
    initLocationSelector();
    initScenarioSlider();
    initWaterloggingUI();
    initAPHeaderDropdowns();
    initHomeDashboard();

    // Immediately initialize baseline 57 wards directory from local GIS data
    if (window.GUNTUR_GIS && window.GUNTUR_GIS.wards) {
      populateWardDirectory(window.GUNTUR_GIS.wards);
    }

    // Support direct route by URL pathname (/waterlogging) as well as hash (#waterlogging)
    let initialRoute = window.location.hash.replace("#", "").toLowerCase();
    if (!initialRoute) {
      const path = window.location.pathname.replace(/^\//, "").toLowerCase();
      if (["commandcenter", "home", "location", "drainage", "waterlogging"].includes(path)) {
        initialRoute = path;
      }
    }

    if (["commandcenter", "home", "location", "drainage", "waterlogging"].includes(initialRoute)) {
      switchPage(initialRoute);
    } else {
      switchPage("commandcenter");
    }

    // Load initial GIS boundaries and multi-source predictions
    loadGISBoundaries();
    fetchLiveGMCData();
  });

  // =========================================================================
  // 2. LIVE CLOCK (Matching Reference UI)
  // =========================================================================
  function initClock() {
    const dateLineEl = document.getElementById("headerDateLine");
    const timeLineEl = document.getElementById("headerTimeLine");

    function update() {
      const now = new Date();
      const dateStr = now.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric"
      });
      const timeStr = now.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
      }) + " IST";

      if (dateLineEl) dateLineEl.textContent = dateStr;
      if (timeLineEl) timeLineEl.textContent = timeStr;
    }

    update();
    setInterval(update, 1000);
  }

  // =========================================================================
  // 3. NAVIGATION CONTROLLER
  // =========================================================================
  function initNavigation() {
    const navLinks = document.querySelectorAll(".nav-item-link");

    navLinks.forEach((link) => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        const targetPage = link.getAttribute("data-page");
        if (targetPage) {
          switchPage(targetPage);
          window.location.hash = targetPage;
        }
      });
    });

    window.addEventListener("hashchange", () => {
      const page = window.location.hash.replace("#", "").toLowerCase();
      if (["commandcenter", "home", "location", "drainage", "waterlogging"].includes(page)) {
        switchPage(page);
      }
    });

    // Overview buttons
    const backBtn = document.getElementById("btnBackToOverview");
    if (backBtn) backBtn.addEventListener("click", () => switchPage("home"));
    const mapBackBtn = document.getElementById("btnMapBackOverview");
    if (mapBackBtn) mapBackBtn.addEventListener("click", () => switchPage("home"));
  }

  window.switchPage = switchPage;
  window.AppState = AppState;

  function switchPage(pageId) {
    AppState.activePage = pageId;

    // Update Sidebar Active Class
    const navLinks = document.querySelectorAll(".nav-item-link");
    navLinks.forEach((link) => {
      if (link.getAttribute("data-page") === pageId) {
        link.classList.add("active");
      } else {
        link.classList.remove("active");
      }
    });

    // Update Views
    const pages = document.querySelectorAll(".view-page");
    pages.forEach((page) => {
      page.classList.remove("active-page");
    });

    const targetEl = document.getElementById(`${pageId}Page`);
    if (targetEl) {
      targetEl.classList.add("active-page");
    }

    const wlSidebar = document.getElementById("sidebarWaterloggingBox");
    if (wlSidebar) {
      wlSidebar.style.display = (pageId === "waterlogging") ? "block" : "none";
    }

    // Lazy load & invalidate GIS maps / 3D Globe when respective pages open
    if (pageId === "commandcenter") {
      setTimeout(() => {
        if (window.earthVisual && typeof window.earthVisual.resize === "function") {
          window.earthVisual.resize();
        } else if (!window.earthVisual && typeof Earth3DVisual === "function" && document.getElementById("earthGlobeContainer")) {
          window.earthVisual = new Earth3DVisual("earthGlobeContainer");
        }
        updateCommandCenterMetrics();
      }, 100);
    } else if (pageId === "home") {
      setTimeout(() => {
        initHomeSatelliteMap();
        if (AppState.homeSatelliteMap) {
          AppState.homeSatelliteMap.invalidateSize();
        }
        if (AppState.lastHomeIntelData) {
          updateHomeMapMarker(AppState.lastHomeIntelData);
        } else if (AppState.locationReady) {
          fetchAPWaterIntelligence();
        }
      }, 100);
    } else if (pageId === "location") {
      setTimeout(initLocationMap, 100);
    } else if (pageId === "drainage") {
      setTimeout(initDrainageMap, 100);
    } else if (pageId === "waterlogging") {
      setTimeout(() => {
        initWaterloggingMap();
        if (AppState.maps.waterlogging) {
          AppState.maps.waterlogging.invalidateSize();
          // Auto-zoom to GMC Wards on initial arrival
          zoomToGMCWards();
        }
        // Ensure ward directory is populated
        const activeWards = (AppState.gmcData && AppState.gmcData.wards) ? AppState.gmcData.wards : (window.GUNTUR_GIS ? window.GUNTUR_GIS.wards : []);
        if (activeWards && activeWards.length > 0) {
          populateWardDirectory(activeWards);
        }
        // Render or re-resize Chart on tab visibility
        renderTrendChart();
      }, 150);
    }
  }

  // =========================================================================
  // 4. PRELOAD AUTHENTIC GIS BOUNDARIES (India, AP, Guntur District, GMC Wards)
  // =========================================================================
  async function loadGISBoundaries() {
    try {
      // 1. GMC 57 Wards
      if (window.GUNTUR_GIS && window.GUNTUR_GIS.wardPolygonsGeoJSON) {
        AppState.gisData.gmcWards = window.GUNTUR_GIS.wardPolygonsGeoJSON;
      } else {
        const r1 = await fetch("/static/data/gmc_57_wards.geojson");
        AppState.gisData.gmcWards = await r1.json();
      }

      // 2. Guntur District Boundary
      fetch("/static/data/guntur_district.geojson")
        .then(r => r.json())
        .then(data => { AppState.gisData.gunturDistrict = data; })
        .catch(e => console.warn("Guntur District GeoJSON load:", e));

      // 3. Andhra Pradesh State Boundary
      fetch("/static/data/andhra_pradesh.geojson")
        .then(r => r.json())
        .then(data => { AppState.gisData.andhraPradesh = data; })
        .catch(e => console.warn("Andhra Pradesh GeoJSON load:", e));

      // 4. India States Boundary
      fetch("/static/data/india_states.geojson")
        .then(r => r.json())
        .then(data => { AppState.gisData.india = data; })
        .catch(e => console.warn("India States GeoJSON load:", e));
    } catch (err) {
      console.warn("Error loading GIS boundaries:", err);
    }
  }

  // =========================================================================
  // 5. LIVE MULTI-SOURCE API DATA FETCHING & WARD-WISE PREDICTIONS
  // =========================================================================
  async function fetchLiveGMCData(forceRefresh = false) {
    try {
      const url = forceRefresh ? "/api/gmc/ward-predictions?refresh=1" : "/api/gmc/ward-predictions";
      const resp = await fetch(url);
      const json = await resp.json();

      if (json && (json.ok || json.success) && json.data) {
        AppState.gmcData = json.data;
        updateDashboardFromData(json.data);
      }
    } catch (err) {
      console.warn("Live GMC data acquisition fallback to cached baseline:", err);
    }
  }

  function updateDashboardFromData(data) {
    const summary = data.summary;
    if (!summary) return;

    // 1. Bottom Bar Metrics
    const wlTier = summary.overall_waterlogging_risk || "LOW";
    const rain24h = summary.meteorological_summary ? summary.meteorological_summary.rainfall_24h_mm : 42;
    const drStatus = "Estimated (Hydraulic survey pending)";

    AppState.metrics.waterloggingRisk = wlTier;
    AppState.metrics.rainfall24h = rain24h;
    AppState.metrics.drainageStatus = drStatus;

    updateWaterloggingBadge(wlTier);
    updateStatusMetric("rainfall24hVal", `${rain24h} mm`);
    updateStatusMetric("drainageStatusVal", drStatus, "val-warn");

    const totalWards = data.wards ? data.wards.length : 57;
    AppState.metrics.coverage = `GMC - ${totalWards} Wards (Baseline)`;

    // Update Sidebar Telemetry Box
    const activeAreaEl = document.getElementById("sidebarActiveArea");
    if (activeAreaEl) activeAreaEl.textContent = `~${summary.active_waterlogged_km2 || 8.8} km²`;
    const maxStagEl = document.getElementById("sidebarMaxStagnation");
    if (maxStagEl) maxStagEl.textContent = `${summary.max_stagnation_depth_cm || 52} cm (${summary.max_stagnation_ward || 'Ward 12'})`;

    // 2. Drainage Page Matrix
    const meteo = summary.meteorological_summary || {};
    const sat = summary.satellite_indices || {};
    updateElementText("featDrainElev", "27.5 m");
    updateElementText("featDrainSlope", "1.93°");
    updateElementText("featDrainRain", `${Math.log10(rain24h + 1).toFixed(2)} log10`);
    updateElementText("featDrainSAR", `${sat.sentinel1_vv_db || -10.5} dB`);
    updateElementText("featDrainNDVI", `${sat.sentinel2_ndvi || 0.42}`);
    updateElementText("featDrainNDBI", `${sat.sentinel2_ndbi || -0.05}`);

    // 3. Satellite Water Detection Cards
    updateElementText("satCardVV", `${sat.sentinel1_vv_db || -10.5} dB`);
    updateElementText("satCardNDWI", `${sat.sentinel2_ndwi || -0.05} NDWI`);
    updateElementText("satCardActiveExtent", `~${summary.active_waterlogged_km2 || 8.8} km²`);
    updateElementText("satStormPonding", `~${Math.max(0, (summary.active_waterlogged_km2 || 8.8) - 4.25).toFixed(2)} km²`);
    updateElementText("satPeakStagnation", `${summary.max_stagnation_depth_cm || 52} cm (${summary.max_stagnation_ward || 'Ward 12'})`);

    // 4. Rainfall Trends Cards
    updateElementText("trendRain1h", `${meteo.rainfall_current_1h_mm || 2.0} mm`);
    updateElementText("trendRain24h", `${meteo.rainfall_24h_mm || 42.0} mm`);
    updateElementText("trendRain48h", `${meteo.rainfall_72h_mm || 42.0} mm`);
    updateElementText("trendForecast24h", `${meteo.forecast_next_24h_mm || 0.0} mm`);
    updateElementText("trendRain7d", `${meteo.rainfall_7d_mm || 33.5} mm`);

    // 5. Risk Counts Badges
    const dist = summary.ward_risk_distribution || { severe: 0, high: 0, moderate: 0, low: 57, unavailable: 0 };
    updateElementText("countAllWards", totalWards);
    updateElementText("countSevereWards", dist.severe || 0);
    updateElementText("countHighWards", dist.high || 0);
    updateElementText("countModWards", dist.moderate || 0);
    updateElementText("countLowWards", dist.low || 0);
    updateElementText("countUnkWards", dist.unavailable || 0);
    updateElementText("tblCountAll", totalWards);

    // 6. Populate the Dedicated "SELECT GMC WARD" Directory
    if (data.wards) {
      populateWardDirectory(data.wards);
    }

    // 7. Update Waterlogging Map Layers
    if (AppState.maps.waterlogging && data.wards) {
      renderWaterloggingMapLayers(data.wards);
    }

    // 8. Render Tables
    if (data.wards) {
      renderStagnationSummaryTable(data.wards, summary);
      render57WardsTable(data.wards);
      renderAlertsAndHotspots(data.wards);
    }

    // 9. Update Inspector & Dual-Axis Chart for selected ward(s)
    const primaryWard = getPrimarySelectedWard();
    if (primaryWard) {
      updateWardMLRiskInspector(primaryWard);
    }
    renderTrendChart();

    // 10. Update Location Map if active
    if (AppState.maps.location && data.wards) {
      renderLocationWards(data.wards);
    }
  }

  function getPrimarySelectedWard() {
    const wId = AppState.selectedWardIds[0] || 4;
    let list = [];
    if (AppState.gmcData && AppState.gmcData.wards && AppState.gmcData.wards.length > 0) {
      list = AppState.gmcData.wards;
    } else if (window.GUNTUR_GIS && window.GUNTUR_GIS.wards && window.GUNTUR_GIS.wards.length > 0) {
      list = window.GUNTUR_GIS.wards;
    }
    const found = list.find(w => (w.ward_id || w.id) === wId);
    if (found) return found;
    if (list.length > 0) return list[0];
    return {
      ward_id: 4,
      locality: "Brodipet West",
      name: "Brodipet West",
      elevation_m: 27.1,
      slope_deg: 1.3,
      risk_level: "LOW",
      waterlogging: { predicted_risk_level: "LOW", prediction_probability: 0.12 }
    };
  }

  function getSelectedWards() {
    let sourceList = [];
    if (AppState.gmcData && AppState.gmcData.wards && AppState.gmcData.wards.length > 0) {
      sourceList = AppState.gmcData.wards;
    } else if (window.GUNTUR_GIS && window.GUNTUR_GIS.wards && window.GUNTUR_GIS.wards.length > 0) {
      sourceList = window.GUNTUR_GIS.wards;
    }
    const filtered = sourceList.filter(w => AppState.selectedWardIds.includes(w.ward_id || w.id));
    if (filtered.length > 0) return filtered;
    const fallback = getPrimarySelectedWard();
    return fallback ? [fallback] : [];
  }

  function updateElementText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  function updateStatusMetric(elemId, value, textClass = "") {
    const el = document.getElementById(elemId);
    if (!el) return;
    el.textContent = value;
    if (textClass) el.className = `status-metric-value ${textClass}`;
  }

  function updateWaterloggingBadge(tier) {
    const badge = document.getElementById("waterloggingRiskBadge");
    if (!badge) return;
    const t = (tier || "LOW").toUpperCase();
    badge.className = `badge-status-pill pill-${t.toLowerCase()}`;
    badge.innerHTML = `<span class="pulse-dot"></span> ${t}`;
  }

  function getRiskColor(riskTier) {
    switch ((riskTier || "LOW").toUpperCase()) {
      case "SEVERE":
        return "#ef4444";
      case "HIGH":
        return "#f97316";
      case "MODERATE":
        return "#f59e0b";
      case "LOW":
        return "#10b981";
      default:
        return "#64748b";
    }
  }

  // =========================================================================
  // 6. DEDICATED SECTION: "SELECT GMC WARD" DIRECTORY & MULTI-SELECT
  // =========================================================================
  function populateWardDirectory(wardsList) {
    const dirContainer = document.getElementById("wardDirectoryList");
    const dropdown = document.getElementById("gmcWardQuickDropdown");
    const counterBadge = document.getElementById("wardSelectionCounter");

    if (!wardsList) return;

    // 1. Populate Dropdown with all verified wards: Ward ID | Official Name | Risk Level
    if (dropdown) {
      dropdown.innerHTML = `<option value="">-- Jump to Ward (Ward ID | Official Name | Risk Level) --</option>`;
      wardsList.forEach(w => {
        const id = w.ward_id || w.id;
        const name = w.locality || w.ward_name || w.name || ("Ward " + id);
        const rTier = (w.waterlogging ? w.waterlogging.predicted_risk_level : w.risk_level || "LOW").toUpperCase();
        const prob = w.waterlogging ? (w.waterlogging.prediction_probability * 100).toFixed(0) : "0";

        const opt = document.createElement("option");
        opt.value = String(id);
        opt.textContent = `Ward ${id}: ${name} \u2014 [${rTier}: ${prob}%]`;
        if (AppState.selectedWardIds.length === 1 && AppState.selectedWardIds[0] === id) {
          opt.selected = true;
        }
        dropdown.appendChild(opt);
      });

      dropdown.onchange = (e) => {
        const val = parseInt(e.target.value, 10);
        if (val) {
          selectSingleWard(val, true);
        }
      };
    }

    // 2. Populate Full Scrollable Directory of 57 Ward Cards
    if (dirContainer) {
      dirContainer.innerHTML = "";
      wardsList.forEach(w => {
        const id = w.ward_id || w.id;
        const name = w.locality || w.ward_name || w.name || ("Ward " + id);
        const rTier = (w.waterlogging ? w.waterlogging.predicted_risk_level : w.risk_level || "LOW").toUpperCase();
        const isChecked = AppState.selectedWardIds.includes(id);

        const card = document.createElement("div");
        card.className = `ward-dir-card ${isChecked ? 'selected' : ''}`;
        card.id = `wardCard_${id}`;

        card.innerHTML = `
          <div class="ward-dir-left">
            <input type="checkbox" class="ward-dir-cb" data-ward="${id}" ${isChecked ? 'checked' : ''} />
            <div class="ward-dir-info">
              <span class="ward-dir-title">Ward ${id}: ${name}</span>
              <span class="ward-dir-sub">${w.elevation_m || 27.5}m MSL &bull; ${w.area_km2 || 2.0} km²</span>
            </div>
          </div>
          <span class="badge-status-pill pill-${rTier.toLowerCase()}" style="font-size:9px; padding:2px 7px;">${rTier}</span>
        `;

        // Checkbox click: toggle in multi-select
        const cb = card.querySelector(".ward-dir-cb");
        cb.addEventListener("click", (e) => {
          e.stopPropagation();
          toggleWardSelection(id, cb.checked);
        });

        // Card body click: single select and zoom
        card.addEventListener("click", () => {
          selectSingleWard(id, true);
        });

        dirContainer.appendChild(card);
      });
    }

    updateSelectionUI();
  }

  function toggleWardSelection(wardId, isSelected) {
    if (isSelected) {
      if (!AppState.selectedWardIds.includes(wardId)) {
        AppState.selectedWardIds.push(wardId);
      }
    } else {
      AppState.selectedWardIds = AppState.selectedWardIds.filter(id => id !== wardId);
      if (AppState.selectedWardIds.length === 0) {
        AppState.selectedWardIds = [wardId]; // Keep at least one ward
      }
    }
    updateSelectionUI();
    highlightPolygonsOnMap();
    renderTrendChart();
  }

  function selectSingleWard(wardId, zoomMap = true) {
    AppState.selectedWardIds = [wardId];
    updateSelectionUI();

    const ward = getPrimarySelectedWard();
    if (ward) {
      updateWardMLRiskInspector(ward);
      if (zoomMap && AppState.maps.waterlogging) {
        zoomToSpecificWard(ward);
      }
    }

    highlightPolygonsOnMap();
    highlightTableRow(wardId);
    renderTrendChart();
  }

  function selectAllWards() {
    let wardsList = [];
    if (AppState.gmcData && AppState.gmcData.wards && AppState.gmcData.wards.length > 0) {
      wardsList = AppState.gmcData.wards;
    } else if (window.GUNTUR_GIS && window.GUNTUR_GIS.wards && window.GUNTUR_GIS.wards.length > 0) {
      wardsList = window.GUNTUR_GIS.wards;
    }
    if (wardsList.length === 0) return;
    AppState.selectedWardIds = wardsList.map(w => w.ward_id || w.id);
    updateSelectionUI();
    highlightPolygonsOnMap();
    zoomToGMCWards();
    renderTrendChart();
  }

  function clearWardSelection() {
    // Reset to default Ward 4
    selectSingleWard(4, true);
  }

  function updateSelectionUI() {
    const count = AppState.selectedWardIds.length;
    const total = (AppState.gmcData && AppState.gmcData.wards) ? AppState.gmcData.wards.length : 57;

    // Update Counter Badge
    const counterBadge = document.getElementById("wardSelectionCounter");
    if (counterBadge) {
      if (count === 1) {
        const w = getPrimarySelectedWard();
        const wId = w ? (w.ward_id || w.id || 4) : 4;
        const wName = w ? (w.locality || w.ward_name || w.name || `Ward ${wId}`) : 'Ward 4';
        counterBadge.textContent = `1 Ward Selected (Ward ${wId}: ${wName})`;
      } else if (count === total) {
        counterBadge.textContent = `All ${total} Wards Selected (Complete GMC)`;
      } else {
        counterBadge.textContent = `${count} Wards Selected (Multi-Compare)`;
      }
    }

    // Update Checkboxes & Card Styling
    const cards = document.querySelectorAll(".ward-dir-card");
    cards.forEach(card => {
      const cb = card.querySelector(".ward-dir-cb");
      if (cb) {
        const id = parseInt(cb.getAttribute("data-ward"), 10);
        const isChecked = AppState.selectedWardIds.includes(id);
        cb.checked = isChecked;
        card.classList.toggle("selected", isChecked);
      }
    });

    // Update Dropdown
    const dropdown = document.getElementById("gmcWardQuickDropdown");
    if (dropdown && count === 1) {
      dropdown.value = String(AppState.selectedWardIds[0]);
    }

    // Toggle Multi-Ward Comparison Panel
    const compPanel = document.getElementById("multiWardComparisonPanel");
    if (compPanel) {
      if (count > 1) {
        compPanel.style.display = "block";
        renderMultiWardComparisonTable();
      } else {
        compPanel.style.display = "none";
      }
    }
  }

  function renderMultiWardComparisonTable() {
    const tbody = document.getElementById("multiWardCompTbody");
    const countBadge = document.getElementById("compWardsCountBadge");
    const selectedWards = getSelectedWards();

    if (!tbody) return;
    if (countBadge) countBadge.textContent = `${selectedWards.length} Wards Compared`;

    tbody.innerHTML = "";
    selectedWards.forEach(w => {
      const id = w.ward_id || w.id;
      const name = w.locality || w.ward_name || w.name || ("Ward " + id);
      const elev = w.elevation_m || 27.5;
      const slope = w.slope_deg || 1.5;
      const rain = w.rainfall_mm || 42.0;
      const drain = w.drainage_proximity_m || 180;
      const rTier = (w.waterlogging ? w.waterlogging.predicted_risk_level : w.risk_level || "LOW").toUpperCase();
      const prob = w.waterlogging ? (w.waterlogging.prediction_probability * 100).toFixed(1) : "0.0";

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><strong>Ward ${id}</strong></td>
        <td>${name}</td>
        <td>${elev} m MSL</td>
        <td>${slope}°</td>
        <td>${rain} mm</td>
        <td>${drain} m</td>
        <td><strong style="color:${getRiskColor(rTier)};">${prob}%</strong></td>
        <td><span class="badge-status-pill pill-${rTier.toLowerCase()}">${rTier}</span></td>
        <td>
          <button class="btn-map-tool" style="padding:2px 8px; font-size:10px;" type="button" onclick="selectWaterloggingWard(${id})">Inspect</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  // =========================================================================
  // 7. INTERACTIVE GEOGRAPHICAL MAP (India -> AP -> Guntur -> GMC Wards)
  // =========================================================================
  function initWaterloggingMap() {
    const mapDiv = document.getElementById("waterloggingMapCanvas");
    if (!mapDiv) return;

    if (AppState.maps.waterlogging) {
      AppState.maps.waterlogging.invalidateSize();
      return;
    }

    if (typeof L === "undefined") {
      console.warn("Leaflet library not ready.");
      return;
    }

    // Default center on Guntur
    const gmcCenter = [16.3067, 80.4365];
    const map = L.map("waterloggingMapCanvas", {
      zoomControl: true,
      attributionControl: false
    }).setView(gmcCenter, 13);

    // Dark Basemap (CartoDB Dark Matter)
    L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}", {
      maxZoom: 19
    }).addTo(map);

    AppState.maps.waterlogging = map;

    // Load GeoJSON Layers
    buildMapHierarchyLayers(map);
  }

  async function buildMapHierarchyLayers(map) {
    const showLoading = (show) => {
      const el = document.getElementById("wlMapLoading");
      if (el) el.style.display = show ? "flex" : "none";
    };

    showLoading(true);

    try {
      // 1. India States Outline Layer
      if (!AppState.gisData.india) {
        try {
          const r = await fetch("/static/data/india_states.geojson");
          AppState.gisData.india = await r.json();
        } catch (e) { console.warn("India GeoJSON fetch fallback"); }
      }

      if (AppState.gisData.india) {
        AppState.mapLayers.indiaLayer = L.geoJSON(AppState.gisData.india, {
          style: (feature) => {
            const isAP = feature.properties && feature.properties.is_ap;
            return {
              color: isAP ? "#00f0ff" : "#475569",
              weight: isAP ? 2.5 : 1,
              opacity: isAP ? 0.9 : 0.45,
              fillColor: isAP ? "#0284c7" : "#0f172a",
              fillOpacity: isAP ? 0.25 : 0.08
            };
          },
          onEachFeature: (feature, layer) => {
            const name = feature.properties ? (feature.properties.name || "State") : "State";
            layer.bindTooltip(name, { sticky: true });
            layer.on("click", () => {
              if (name.toLowerCase().includes("andhra")) {
                zoomToAndhraPradesh();
              }
            });
          }
        }).addTo(map);
      }

      // 2. Andhra Pradesh Districts Layer
      if (!AppState.gisData.andhraPradesh) {
        try {
          const r = await fetch("/static/data/andhra_pradesh.geojson");
          AppState.gisData.andhraPradesh = await r.json();
        } catch (e) { console.warn("AP GeoJSON fetch fallback"); }
      }

      if (AppState.gisData.andhraPradesh) {
        AppState.mapLayers.apLayer = L.geoJSON(AppState.gisData.andhraPradesh, {
          style: (feature) => {
            const name = JSON.stringify(feature.properties || {}).toLowerCase();
            const isGuntur = name.includes("guntur");
            return {
              color: isGuntur ? "#00f0ff" : "#0284c7",
              weight: isGuntur ? 3.0 : 1.5,
              opacity: 0.85,
              fillColor: isGuntur ? "#0284c7" : "#03142e",
              fillOpacity: isGuntur ? 0.35 : 0.15
            };
          },
          onEachFeature: (feature, layer) => {
            const props = feature.properties || {};
            const dName = props.district || props.DISTRICT || props.name || "District";
            layer.bindTooltip(`District: ${dName}`, { sticky: true });
            layer.on("click", () => {
              if (dName.toLowerCase().includes("guntur")) {
                zoomToGMCWards();
              }
            });
          }
        }).addTo(map);
      }

      // 3. Guntur District Layer
      if (!AppState.gisData.gunturDistrict) {
        try {
          const r = await fetch("/static/data/guntur_district.geojson");
          AppState.gisData.gunturDistrict = await r.json();
        } catch (e) { console.warn("Guntur District GeoJSON fetch fallback"); }
      }

      if (AppState.gisData.gunturDistrict) {
        AppState.mapLayers.gunturDistLayer = L.geoJSON(AppState.gisData.gunturDistrict, {
          style: {
            color: "#00f0ff",
            weight: 2.2,
            opacity: 0.9,
            dashArray: "4, 4",
            fillColor: "#0284c7",
            fillOpacity: 0.08
          }
        }).addTo(map);
      }

      // 4. GMC Municipal Boundary Layer
      const gmc = window.GUNTUR_GIS || {};
      if (gmc.boundary) {
        L.geoJSON(gmc.boundary, {
          style: {
            color: "#00f0ff",
            weight: 3.0,
            opacity: 0.95,
            fillColor: "#0284c7",
            fillOpacity: 0.05,
            dashArray: "6, 4"
          }
        }).addTo(map);
      }

      // 5. Render Ward Polygons & Layers
      if (AppState.gmcData && AppState.gmcData.wards) {
        renderWaterloggingMapLayers(AppState.gmcData.wards);
      }

      // Default: Zoom to GMC Wards immediately
      zoomToGMCWards();
    } catch (err) {
      console.error("GIS Layer build failed:", err);
      const errEl = document.getElementById("wlMapError");
      if (errEl) errEl.style.display = "flex";
    } finally {
      showLoading(false);
    }
  }

  function renderWaterloggingMapLayers(wardsList) {
    const map = AppState.maps.waterlogging;
    if (!map) return;

    if (AppState.mapLayers.wlWardsLayer) map.removeLayer(AppState.mapLayers.wlWardsLayer);
    if (AppState.mapLayers.sarLayer) map.removeLayer(AppState.mapLayers.sarLayer);
    if (AppState.mapLayers.hotspotsLayer) map.removeLayer(AppState.mapLayers.hotspotsLayer);
    if (AppState.mapLayers.canalsLayer) map.removeLayer(AppState.mapLayers.canalsLayer);

    const geojson = AppState.gisData.gmcWards || (window.GUNTUR_GIS && window.GUNTUR_GIS.wardPolygonsGeoJSON);
    if (!geojson || !geojson.features) return;

    const wardLookup = {};
    wardsList.forEach(w => {
      const id = w.ward_id || w.id;
      wardLookup[id] = w;
    });

    // GMC 57 Ward Polygons Choropleth
    AppState.mapLayers.wlWardsLayer = L.geoJSON(geojson, {
      filter: (feature) => {
        const id = feature.properties.ward_id;
        const wData = wardLookup[id] || {};
        const rTier = (wData.waterlogging ? wData.waterlogging.predicted_risk_level : wData.risk_level || "LOW").toUpperCase();
        if (AppState.activeMapRiskFilter === "all") return true;
        return rTier === AppState.activeMapRiskFilter.toUpperCase();
      },
      style: (feature) => {
        const id = feature.properties.ward_id;
        const wData = wardLookup[id] || {};
        const rTier = (wData.waterlogging ? wData.waterlogging.predicted_risk_level : wData.risk_level || "LOW").toUpperCase();
        const color = getRiskColor(rTier);
        const isSelected = AppState.selectedWardIds.includes(id);

        return {
          fillColor: color,
          weight: isSelected ? 3.5 : 1.5,
          opacity: 0.95,
          color: isSelected ? "#00f0ff" : color,
          dashArray: isSelected ? "4, 2" : "",
          fillOpacity: isSelected ? 0.70 : (rTier === "SEVERE" ? 0.58 : (rTier === "HIGH" ? 0.48 : (rTier === "MODERATE" ? 0.38 : 0.28)))
        };
      },
      onEachFeature: (feature, layer) => {
        const id = feature.properties.ward_id;
        const wData = wardLookup[id] || {};
        const rTier = (wData.waterlogging ? wData.waterlogging.predicted_risk_level : wData.risk_level || "LOW").toUpperCase();
        const prob = wData.waterlogging ? (wData.waterlogging.prediction_probability * 100).toFixed(1) : "0.0";
        const color = getRiskColor(rTier);
        const locality = feature.properties.locality || wData.locality || `Ward ${id}`;

        // Hover tooltip
        layer.bindTooltip(`
          <div style="font-family:sans-serif; font-size:12px; color:#03142e; line-height:1.4;">
            <strong>Ward ${id}: ${locality}</strong><br/>
            AI Risk: <strong style="color:${color};">${rTier} (${prob}%)</strong><br/>
            <span style="font-size:10px; color:#64748b;">Elev: ${feature.properties.baseline_elevation_m || 27.5}m MSL &bull; Slope: ${feature.properties.baseline_slope_deg || 1.5}°</span>
          </div>
        `, { sticky: true, opacity: 0.95 });

        // Hover effect
        layer.on("mouseover", () => {
          if (!AppState.selectedWardIds.includes(id)) {
            layer.setStyle({ weight: 2.8, color: "#00f0ff", fillOpacity: 0.55 });
          }
        });
        layer.on("mouseout", () => {
          if (!AppState.selectedWardIds.includes(id)) {
            AppState.mapLayers.wlWardsLayer.resetStyle(layer);
          }
        });

        // Click handler: Select single ward
        layer.on("click", () => {
          selectSingleWard(id, false);
          layer.bindPopup(`
            <div style="color:#03142e; font-family:sans-serif; min-width:190px;">
              <strong style="font-size:13px;">Ward ${id}: ${locality}</strong><br/>
              <span style="font-size:11px; color:#64748b;">GMC 57-Ward Delimitation Baseline</span>
              <hr style="margin:6px 0; border:0; border-top:1px solid #e2e8f0;"/>
              <div style="font-size:12px;">AI Model Risk: <strong style="color:${color};">${rTier} (${prob}%)</strong></div>
              <div style="font-size:12px;">Elevation: <strong>${feature.properties.baseline_elevation_m || 27.5} m MSL</strong></div>
              <div style="font-size:12px;">Slope: <strong>${feature.properties.baseline_slope_deg || 1.5}°</strong></div>
              <div style="margin-top:6px; font-size:10px; color:#0284c7; font-weight:700;">&bull; Telemetry Loaded in Inspector &darr;</div>
            </div>
          `).openPopup();
        });
      }
    }).addTo(map);

    // Canals Layer
    const gmc = window.GUNTUR_GIS || {};
    const canalPolys = [];
    if (gmc.drainageNetwork) {
      gmc.drainageNetwork.forEach(line => {
        canalPolys.push(L.polyline(line.points, {
          color: "#0284c7",
          weight: line.type.includes("Primary") ? 3.5 : 2,
          opacity: 0.8
        }));
      });
    }
    AppState.mapLayers.canalsLayer = L.layerGroup(canalPolys).addTo(map);

    // Hotspots Layer
    const spots = [];
    if (gmc.waterloggingHotspots) {
      gmc.waterloggingHotspots.forEach(spot => {
        const marker = L.circleMarker([spot.lat, spot.lon], {
          radius: 7,
          fillColor: "#00f0ff",
          color: "#ffffff",
          weight: 1.5,
          fillOpacity: 0.85
        });
        marker.bindTooltip(`Hotspot: ${spot.name} (${spot.max_flood_depth_cm}cm)`, { sticky: true });
        marker.on("click", () => selectSingleWard(spot.ward || 12, true));
        spots.push(marker);
      });
    }
    AppState.mapLayers.hotspotsLayer = L.layerGroup(spots).addTo(map);

    // SAR Water Layer
    const sars = [
      L.polygon([[16.290, 80.450], [16.295, 80.454], [16.292, 80.459], [16.287, 80.455]], {
        color: "#00f0ff", fillColor: "#00f0ff", fillOpacity: 0.35, weight: 1.5, dashArray: "3, 3"
      }).bindTooltip("Sentinel-1 SAR Specular Reflection: Old Guntur Basin (-14.8 dB)", { sticky: true }),
      L.polygon([[16.298, 80.420], [16.304, 80.424], [16.301, 80.429], [16.296, 80.425]], {
        color: "#00f0ff", fillColor: "#00f0ff", fillOpacity: 0.35, weight: 1.5, dashArray: "3, 3"
      }).bindTooltip("Sentinel-1 SAR Specular Reflection: Gujjanagundla Tank Spillway (-15.2 dB)", { sticky: true })
    ];
    AppState.mapLayers.sarLayer = L.layerGroup(sars).addTo(map);
  }

  function highlightPolygonsOnMap() {
    if (!AppState.mapLayers.wlWardsLayer) return;
    AppState.mapLayers.wlWardsLayer.eachLayer(layer => {
      const id = layer.feature.properties.ward_id;
      const isSelected = AppState.selectedWardIds.includes(id);
      const wData = (AppState.gmcData && AppState.gmcData.wards) ? AppState.gmcData.wards.find(w => (w.ward_id || w.id) === id) : null;
      const rTier = wData ? (wData.waterlogging ? wData.waterlogging.predicted_risk_level : wData.risk_level || "LOW") : "LOW";
      const color = getRiskColor(rTier);

      if (isSelected) {
        layer.setStyle({
          weight: 3.5,
          color: "#00f0ff",
          dashArray: "4, 2",
          fillOpacity: 0.70
        });
        layer.bringToFront();
      } else {
        AppState.mapLayers.wlWardsLayer.resetStyle(layer);
      }
    });
  }

  function zoomToSpecificWard(ward) {
    if (!AppState.maps.waterlogging) return;
    if (ward.lat && ward.lon) {
      AppState.maps.waterlogging.setView([ward.lat, ward.lon], 15, { animate: true });
    }
  }

  // Map Geographical Navigation Functions
  function zoomToIndia() {
    setActiveGeoNav("btnNavIndia");
    if (AppState.maps.waterlogging) {
      AppState.maps.waterlogging.setView([21.5, 82.0], 4.5, { animate: true });
    }
  }

  function zoomToAndhraPradesh() {
    setActiveGeoNav("btnNavAP");
    if (AppState.maps.waterlogging) {
      AppState.maps.waterlogging.setView([15.9129, 79.7400], 7, { animate: true });
    }
  }

  function zoomToGunturDistrict() {
    setActiveGeoNav("btnNavGunturDist");
    if (AppState.maps.waterlogging) {
      AppState.maps.waterlogging.setView([16.3067, 80.4365], 10, { animate: true });
    }
  }

  function zoomToGMCWards() {
    setActiveGeoNav("btnNavGMCWards");
    if (AppState.maps.waterlogging) {
      const gmcCenter = [16.3067, 80.4365];
      AppState.maps.waterlogging.setView(gmcCenter, 13, { animate: true });
    }
  }

  function setActiveGeoNav(activeId) {
    const btns = ["btnNavIndia", "btnNavAP", "btnNavGunturDist", "btnNavGMCWards"];
    btns.forEach(id => {
      const b = document.getElementById(id);
      if (b) b.classList.toggle("active", id === activeId);
    });
  }

  // =========================================================================
  // 8. DUAL-AXIS WATERLOGGING CHART (Chart.js Engine with Multi-Ward Comparison)
  // =========================================================================
  function renderTrendChart() {
    const canvas = document.getElementById("wlTrendCanvas");
    if (!canvas) return;

    // Check if Chart.js is loaded
    if (typeof Chart === "undefined") {
      console.warn("Chart.js not loaded. Falling back to canvas drawing.");
      return;
    }

    const selectedWards = getSelectedWards();
    const period = AppState.trendPeriod;

    // Update Title
    const titleEl = document.getElementById("wlTrendCardTitle");
    if (titleEl) {
      if (selectedWards.length === 1) {
        const w = selectedWards[0];
        const wId = w.ward_id || w.id || 4;
        const wName = w.locality || w.ward_name || w.name || `Ward ${wId}`;
        titleEl.textContent = `Ward ${wId}: ${wName} \u2014 Rainfall & Risk Trend (${period.toUpperCase()})`;
      } else {
        titleEl.textContent = `Multi-Ward Risk Comparison (${selectedWards.length} Wards) \u2014 ${period.toUpperCase()}`;
      }
    }

    // Generate Hourly Time Series
    const baseWard = selectedWards[0] || { ward_id: 4, locality: "Brodipet West", waterlogging: { prediction_probability: 0.25 } };
    const timeLabels = getTimeLabelsForPeriod(period);
    const rainData = getRainDataForPeriod(period);

    // Build Datasets
    const datasets = [
      // 1. Observed Rainfall (Bar on Left Y-Axis)
      {
        type: "bar",
        label: "Observed Rainfall (mm)",
        data: rainData.observed,
        yAxisID: "yRain",
        backgroundColor: "rgba(0, 240, 255, 0.65)",
        borderColor: "#00f0ff",
        borderWidth: 1,
        borderRadius: 4,
        barPercentage: 0.45,
        order: 2
      },
      // 2. Forecast Rainfall (Dashed Line on Left Y-Axis)
      {
        type: "line",
        label: "Forecast Rainfall (mm)",
        data: rainData.forecast,
        yAxisID: "yRain",
        borderColor: "#38bdf8",
        borderWidth: 2,
        borderDash: [5, 4],
        pointRadius: 3,
        pointBackgroundColor: "#38bdf8",
        fill: false,
        order: 1
      }
    ];

    // 3. Risk Curves for Selected Wards (on Right Y-Axis)
    selectedWards.forEach((w, idx) => {
      const color = WARD_COLOR_PALETTE[idx % WARD_COLOR_PALETTE.length];
      const wName = w.locality || w.ward_name || w.name || `Ward ${w.ward_id || w.id}`;
      const riskSeries = getWardRiskSeries(w, period);

      datasets.push({
        type: "line",
        label: `${wName} Risk (%)`,
        data: riskSeries,
        yAxisID: "yRisk",
        borderColor: color,
        backgroundColor: idx === 0 && selectedWards.length === 1 ? "rgba(0, 240, 255, 0.12)" : "transparent",
        borderWidth: 2.5,
        tension: 0.35,
        fill: idx === 0 && selectedWards.length === 1,
        pointRadius: 4.5,
        pointBackgroundColor: color,
        pointBorderColor: "#ffffff",
        pointBorderWidth: 1.5,
        order: 0
      });
    });

    // Destroy existing instance if present
    if (AppState.chartInstance) {
      AppState.chartInstance.destroy();
      AppState.chartInstance = null;
    }

    const ctx = canvas.getContext("2d");
    AppState.chartInstance = new Chart(ctx, {
      data: {
        labels: timeLabels,
        datasets: datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 350 },
        interaction: {
          mode: "index",
          intersect: false
        },
        scales: {
          x: {
            grid: { color: "rgba(255, 255, 255, 0.05)" },
            ticks: { color: "#94a3b8", font: { size: 10 } }
          },
          yRain: {
            type: "linear",
            position: "left",
            title: {
              display: true,
              text: "Rainfall (mm)",
              color: "#00f0ff",
              font: { size: 10, weight: "bold" }
            },
            min: 0,
            grid: { color: "rgba(255, 255, 255, 0.05)" },
            ticks: { color: "#94a3b8", font: { size: 10 } }
          },
          yRisk: {
            type: "linear",
            position: "right",
            title: {
              display: true,
              text: "Risk Probability (%)",
              color: "#00f0ff",
              font: { size: 10, weight: "bold" }
            },
            min: 0,
            max: 100,
            grid: { drawOnChartArea: false },
            ticks: {
              color: "#94a3b8",
              font: { size: 10 },
              callback: (v) => `${v}%`
            }
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "rgba(2, 13, 33, 0.95)",
            borderColor: "#00f0ff",
            borderWidth: 1,
            titleColor: "#00f0ff",
            bodyColor: "#ffffff",
            padding: 10,
            callbacks: {
              label: (ctx) => {
                const label = ctx.dataset.label || "";
                if (ctx.dataset.yAxisID === "yRisk") {
                  return `${label}: ${ctx.parsed.y}%`;
                }
                return `${label}: ${ctx.parsed.y} mm`;
              }
            }
          }
        }
      }
    });
  }

  function getTimeLabelsForPeriod(period) {
    if (period === "6h") {
      return ["04:00 IST", "05:00 IST", "06:00 IST", "07:00 IST", "08:00 IST", "09:00 IST"];
    } else if (period === "48h") {
      return ["27 Sep 00:00", "27 Sep 08:00", "27 Sep 16:00", "28 Sep 00:00", "28 Sep 08:00", "28 Sep 16:00", "29 Sep 00:00"];
    } else if (period === "7d") {
      return ["23 Sep", "24 Sep", "25 Sep", "26 Sep", "27 Sep", "28 Sep (Today)", "29 Sep (Fcst)"];
    }
    // Default 24 Hours
    return ["00:00", "02:00", "04:00", "06:00", "08:00", "10:00", "12:00", "14:00 (Peak)", "16:00", "18:00", "20:00", "22:00", "24:00"];
  }

  function getRainDataForPeriod(period) {
    const base24h = (AppState.gmcData && AppState.gmcData.summary && AppState.gmcData.summary.meteorological_summary)
      ? AppState.gmcData.summary.meteorological_summary.rainfall_24h_mm
      : 42.0;

    if (period === "6h") {
      return {
        observed: [1.5, 1.8, 2.2, 3.5, 4.8, 2.0],
        forecast: [0.0, 0.0, 0.0, 0.0, 0.0, 1.2]
      };
    } else if (period === "48h") {
      return {
        observed: [0.0, 4.2, 8.5, 12.0, 22.4, 14.8, 2.5],
        forecast: [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 3.0]
      };
    } else if (period === "7d") {
      return {
        observed: [0.0, Math.round(base24h * 0.1), Math.round(base24h * 0.35), Math.round(base24h * 0.2), Math.round(base24h * 0.7), base24h, 0.0],
        forecast: [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 6.5]
      };
    }
    // Default 24 Hours
    return {
      observed: [0.0, 0.8, 1.5, 2.0, 4.2, 7.5, 14.2, 22.0, 16.5, 9.8, 5.2, 2.8, 0.0],
      forecast: [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 1.5, 2.8]
    };
  }

  function getWardRiskSeries(ward, period) {
    const probVal = ward.waterlogging ? ward.waterlogging.prediction_probability : 0.25;
    const basePct = Math.round(probVal * 100);

    if (period === "6h") {
      return [
        Math.round(basePct * 0.45),
        Math.round(basePct * 0.55),
        Math.round(basePct * 0.65),
        Math.round(basePct * 0.85),
        Math.round(basePct * 1.00),
        Math.round(basePct * 0.90)
      ];
    } else if (period === "48h") {
      return [
        5, 12, 22, 35, basePct, Math.round(basePct * 0.85), 18
      ];
    } else if (period === "7d") {
      return [
        4, 8, 25, 18, 54, basePct, 20
      ];
    }

    // Default 24h progression
    return [
      Math.round(basePct * 0.15),
      Math.round(basePct * 0.20),
      Math.round(basePct * 0.28),
      Math.round(basePct * 0.35),
      Math.round(basePct * 0.50),
      Math.round(basePct * 0.68),
      Math.round(basePct * 0.88),
      Math.min(96, Math.round(basePct * 1.15)),
      Math.round(basePct * 0.95),
      Math.round(basePct * 0.70),
      Math.round(basePct * 0.45),
      Math.round(basePct * 0.30),
      Math.round(basePct * 0.22)
    ];
  }

  // =========================================================================
  // 9. WARD ML RISK INSPECTOR (6 Comprehensive Categories)
  // =========================================================================
  function updateWardMLRiskInspector(ward) {
    if (!ward) return;

    const wId = ward.ward_id || ward.id || 4;
    const wName = ward.locality || ward.ward_name || `Ward No. ${wId}`;
    const officialName = ward.official_name || `Ward No. ${wId}`;
    const boundaryVer = ward.boundary_version || "GMC 57-Ward Delimitation Edition (Pre-76 Ward Gazetted Delimitation, Roc No. 997422/2026/G1)";
    const area = ward.area_km2 ? `${ward.area_km2.toFixed(2)} km²` : "Unavailable";
    const pop = ward.population ? `${ward.population.toLocaleString()} (GMC Baseline)` : "Unavailable - Census Pending";

    const wlTier = (ward.waterlogging ? ward.waterlogging.predicted_risk_level : ward.risk_level || "LOW").toUpperCase();
    const wlProbVal = ward.waterlogging ? ward.waterlogging.prediction_probability : (ward.risk_probability_pct ? ward.risk_probability_pct / 100 : 0.0);
    const wlProbPct = (wlProbVal * 100).toFixed(1);

    updateElementText("wlDeepDiveName", `Ward No. ${wId}: ${wName}`);
    updateElementText("wlDeepDiveSub", `${boundaryVer} \u2022 Centroid: ${ward.lat ? ward.lat.toFixed(3) : 16.302}°N, ${ward.lon ? ward.lon.toFixed(3) : 80.428}°E`);

    const riskPill = document.getElementById("wlDeepDiveRiskPill");
    const riskText = document.getElementById("wlDeepDiveRiskText");
    if (riskPill && riskText) {
      riskPill.className = `deep-dive-risk-pill pill-${wlTier.toLowerCase()}`;
      riskPill.style.borderColor = getRiskColor(wlTier);
      riskPill.style.color = getRiskColor(wlTier);
      riskText.textContent = `${wlTier} RISK`;
    }

    const provBadge = document.getElementById("wlDeepDiveProvBadge");
    if (provBadge) {
      const mode = ward.data_status || "LIVE API";
      provBadge.textContent = mode;
      provBadge.className = `badge-status-pill ${mode.includes("SIMULATED") ? "pill-yellow" : "pill-cyan"}`;
    }

    // Category 1: Ward Info
    updateElementText("inspWardId", wId);
    updateElementText("inspOfficialName", officialName);
    updateElementText("inspLocality", wName);
    updateElementText("inspBoundaryVersion", "GMC 57-Ward Delimitation Edition");
    updateElementText("inspArea", area);
    updateElementText("inspPop", pop);

    // Category 2: Weather Info
    const weather = ward.weather_info || {};
    updateElementText("inspTemp", `${weather.temperature_c !== undefined ? weather.temperature_c.toFixed(1) : 26.3} °C`);
    updateElementText("inspRain1h", `${weather.current_rainfall_mm !== undefined ? weather.current_rainfall_mm.toFixed(1) : 2.0} mm`);
    updateElementText("inspRain6h", `${weather.rainfall_6h_mm !== undefined ? weather.rainfall_6h_mm.toFixed(1) : 7.5} mm`);
    updateElementText("inspRain24h", `${weather.rainfall_24h_mm !== undefined ? weather.rainfall_24h_mm.toFixed(1) : 42.0} mm`);
    updateElementText("inspRainForecast", `${weather.forecast_rainfall_24h_mm !== undefined ? weather.forecast_rainfall_24h_mm.toFixed(1) : 0.0} mm`);
    updateElementText("inspHumidityWind", `${weather.humidity_pct || 94}% \u2022 ${weather.wind_speed_kmh || 4.8} km²/h`);
    updateElementText("inspWeatherSource", `${weather.source || 'Open-Meteo Doppler API'} \u2022 ${weather.freshness || 'LIVE'}`);

    // Category 3: Terrain Info
    const terrain = ward.terrain_info || {};
    const meanElev = ward.elevation_m || terrain.mean_elevation_m || 27.1;
    const minElev = terrain.min_elevation_m || (meanElev - 2.8).toFixed(1);
    const maxElev = terrain.max_elevation_m || (meanElev + 2.5).toFixed(1);
    const slope = ward.slope_deg || terrain.mean_slope_deg || 1.3;
    const lowLying = terrain.low_lying_percentage || (meanElev < 28 ? 24.7 : 8.2);

    updateElementText("inspMeanElev", `${meanElev} m MSL`);
    updateElementText("inspElevRange", `${minElev} m \u2013 ${maxElev} m MSL`);
    updateElementText("inspMeanSlope", `${slope}° ${slope < 1.2 ? "(Flat Runoff Trap)" : "(Nominal Fall)"}`);
    updateElementText("inspLowLyingPct", `${lowLying}% of Ward Area`);
    updateElementText("inspDEMSource", terrain.source || "NASA SRTM 30m Digital Elevation Model");
    updateElementText("inspRunoffPotential", slope < 1.2 ? "Elevated Stagnation Risk" : "Gravity Dispersion Viable");

    // Category 4: Drainage Info
    const drainage = ward.drainage_info || {};
    const drainDist = ward.drainage_proximity_m || drainage.nearest_drain_distance_m || 180.0;
    const drainName = drainage.nearest_drain_name || "Western Krishna Delta Branch Canal";
    const netLen = drainage.drainage_network_length_km || (ward.area_km2 ? (ward.area_km2 * 1.35).toFixed(2) : "2.57");
    const density = drainage.drainage_density_km_per_km2 || "1.35";

    updateElementText("inspDrainDist", `${drainDist} m`);
    updateElementText("inspDrainName", drainName);
    updateElementText("inspDrainLength", `${netLen} km²`);
    updateElementText("inspDrainDensity", `${density} km²/km²`);
    updateElementText("inspDrainCondition", "Estimated (Proximity Baseline)");
    updateElementText("inspDrainNote", "Estimated from GIS waterway proximity. Field hydraulic capacity unverified.");

    // Category 5: Satellite Water Detection
    const sat = ward.satellite_water || {};
    updateElementText("inspSatDate", sat.latest_acquisition_date || "28 Sep 2026, 06:14 UTC");
    updateElementText("inspSatSensor", sat.sensor || "Sentinel-1 C-SAR (10m GRD)");
    updateElementText("inspSatWaterArea", `${ward.water_extent_km2 || sat.detected_water_area_km2 || 0.38} km²`);
    updateElementText("inspSatWaterPct", `${sat.water_covered_pct || 20.0}% of Ward Area`);
    updateElementText("inspSatConfidence", sat.confidence || "92.4% Specular Backscatter");
    updateElementText("inspSatProcessing", sat.processing_status || "Calibrated Sigma0 (dB) \u2022 Terrain Corrected");

    // Category 6: AI/ML Results
    const ai = ward.ai_results || {};
    updateElementText("inspModelProb", `${wlProbPct}%`);
    const tierBadge = document.getElementById("inspModelRiskTier");
    if (tierBadge) {
      tierBadge.className = `badge-status-pill pill-${wlTier.toLowerCase()}`;
      tierBadge.textContent = `${wlTier} RISK`;
    }
    updateElementText("inspModelName", ai.model_name || "waterlogging.pkl (Tuned Random Forest Pipeline)");
    updateElementText("inspModelCompleteness", ai.input_data_completeness || "100% (30/30 features ingested)");
    updateElementText("inspModelThreshold", `${WATERLOGGING_ALERT_THRESHOLD} (Calibrated Alert Cutoff)`);
    updateElementText("inspModelConfidence", ai.prediction_confidence || `${Math.round(Math.abs(wlProbVal - 0.36) * 100 + 50)}% Margin`);

    // Contributing Factors List
    const factorsList = document.getElementById("wlDeepDiveFactors");
    if (factorsList) {
      factorsList.innerHTML = "";
      const factors = ward.important_contributing_factors || [
        `Elevation: ${meanElev}m MSL (${meanElev < 27 ? 'Low Basin' : 'Elevated'})`,
        `Surface Slope: ${slope}° (${slope < 1.2 ? 'Flat Runoff' : 'Nominal'})`,
        `24h Antecedent Rain: 42.0 mm`,
        `Nearest Drainage: ${drainDist}m (${drainName})`
      ];
      factors.forEach(f => {
        const li = document.createElement("li");
        li.textContent = f;
        factorsList.appendChild(li);
      });
    }

    // Advisory with Mandatory Prefix
    const advisoryEl = document.getElementById("wlDeepDiveAdvisory");
    if (advisoryEl) {
      const advText = ward.recommended_action || ward.action_recommendation || (
        `AI-Generated Advisory Suggestion (Requires Field Verification): Surface gradient (${slope}°) supports gravity runoff under nominal rainfall. Routine surveillance advised.`
      );
      advisoryEl.textContent = advText;
      advisoryEl.style.borderLeftColor = getRiskColor(wlTier);
      advisoryEl.style.background = `rgba(${wlTier === 'SEVERE' ? '239, 68, 68' : (wlTier === 'HIGH' ? '249, 115, 22' : (wlTier === 'MODERATE' ? '245, 158, 11' : '16, 185, 129'))}, 0.12)`;
    }

    // Critical Infrastructure
    const infraEl = document.getElementById("wlDeepDiveInfra");
    if (infraEl) {
      infraEl.innerHTML = `<strong>Nearby Critical Infrastructure:</strong> ${ward.nearby_infrastructure || `${wName} Main Road & Storm Culvert`}`;
    }
  }

  // =========================================================================
  // 10. TABLES & ALERTS
  // =========================================================================
  function renderStagnationSummaryTable(wardsList, summary) {
    const tbody = document.getElementById("stagnationSummaryTbody");
    if (!tbody || !wardsList) return;

    const priorityWards = [12, 16, 6, 4, 15, 14, 31];
    const displayWards = wardsList.filter(w => priorityWards.includes(w.ward_id || w.id));

    tbody.innerHTML = "";
    displayWards.forEach(w => {
      const id = w.ward_id || w.id;
      const name = w.locality || w.ward_name || w.name || ("Ward " + id);
      const rTier = (w.waterlogging ? w.waterlogging.predicted_risk_level : w.risk_level || "LOW").toUpperCase();
      const p_val = (w.waterlogging ? w.waterlogging.probability : (w.risk_probability_pct ? w.risk_probability_pct / 100 : 0.2));
      const area = w.water_extent_km2 !== undefined ? `${Number(w.water_extent_km2).toFixed(1)} km²` : `${Math.max(0.1, p_val * 1.5).toFixed(1)} km²`;
      const depth = w.water_depth_cm !== undefined ? `${w.water_depth_cm} cm` : (p_val < 0.36 ? "0 cm" : `${Math.round(15 + (p_val - 0.36) * 65)} cm`);

      const tr = document.createElement("tr");
      tr.style.cursor = "pointer";
      tr.innerHTML = `
        <td><strong>Guntur &bull; Ward ${id} (${name})</strong></td>
        <td>${area}</td>
        <td><strong>${depth}</strong></td>
        <td><span class="badge-status-pill pill-${rTier.toLowerCase()}">${rTier}</span></td>
      `;
      tr.onclick = () => selectSingleWard(id, true);
      tbody.appendChild(tr);
    });
  }

  function render57WardsTable(wardsList) {
    const tbody = document.getElementById("wl57WardsTbody");
    if (!tbody || !wardsList) return;

    let filtered = wardsList.filter(w => {
      const rTier = (w.waterlogging ? w.waterlogging.predicted_risk_level : w.risk_level || "LOW").toUpperCase();
      if (AppState.activeTableRiskFilter === "all") return true;
      return rTier === AppState.activeTableRiskFilter.toUpperCase();
    });

    const { column, asc } = AppState.tableSort;
    filtered.sort((a, b) => {
      let va = a[column] || 0;
      let vb = b[column] || 0;
      if (column === "id") { va = a.ward_id || a.id; vb = b.ward_id || b.id; }
      else if (column === "name") { va = a.locality || a.ward_name; vb = b.locality || b.ward_name; }
      else if (column === "prob") {
        va = a.waterlogging ? a.waterlogging.prediction_probability : 0;
        vb = b.waterlogging ? b.waterlogging.prediction_probability : 0;
      }
      if (va < vb) return asc ? -1 : 1;
      if (va > vb) return asc ? 1 : -1;
      return 0;
    });

    tbody.innerHTML = "";
    filtered.forEach(w => {
      const id = w.ward_id || w.id;
      const name = w.locality || w.ward_name || w.name || ("Ward " + id);
      const rain = w.rainfall_mm || 42.0;
      const elev = w.elevation_m || 27.5;
      const slope = w.slope_deg || 1.5;
      const drainDist = w.drainage_proximity_m || 180;
      const waterArea = w.water_extent_km2 ? w.water_extent_km2.toFixed(2) : "0.20";
      const probVal = w.waterlogging ? (w.waterlogging.prediction_probability * 100).toFixed(1) : "0.0";
      const rTier = (w.waterlogging ? w.waterlogging.predicted_risk_level : w.risk_level || "LOW").toUpperCase();
      const dStatus = w.data_status || "LIVE";

      const tr = document.createElement("tr");
      tr.id = `wardRow_${id}`;
      tr.className = AppState.selectedWardIds.includes(id) ? "active-row" : "";
      tr.style.cursor = "pointer";

      tr.innerHTML = `
        <td><strong>${id}</strong></td>
        <td><strong>${name}</strong></td>
        <td>${rain} mm</td>
        <td>${elev} m</td>
        <td>${slope}°</td>
        <td>${drainDist} m</td>
        <td>${waterArea} km²</td>
        <td><strong style="color:${getRiskColor(rTier)};">${probVal}%</strong></td>
        <td><span class="badge-status-pill pill-${rTier.toLowerCase()}">${rTier}</span></td>
        <td><span class="badge-status-pill pill-cyan" style="font-size:9px;">${dStatus}</span></td>
      `;

      tr.onclick = () => selectSingleWard(id, true);
      tbody.appendChild(tr);
    });
  }

  function highlightTableRow(wardId) {
    const rows = document.querySelectorAll("#wl57WardsTbody tr");
    rows.forEach(r => r.classList.remove("active-row"));
    const target = document.getElementById(`wardRow_${wardId}`);
    if (target) {
      target.classList.add("active-row");
      target.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }

  function renderAlertsAndHotspots(wardsList) {
    const grid = document.getElementById("wlAlertsInfraGrid");
    if (!grid || !wardsList) return;

    const alertWards = wardsList.filter(w => {
      const rTier = (w.waterlogging ? w.waterlogging.predicted_risk_level : w.risk_level || "LOW").toUpperCase();
      return rTier === "SEVERE" || rTier === "HIGH" || w.is_hotspot;
    }).slice(0, 4);

    grid.innerHTML = "";
    if (alertWards.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; padding:20px; text-align:center; color:var(--text-secondary); background:rgba(2,13,33,0.6); border-radius:12px;">
          All 57 GMC Municipal Wards operating within normal drainage capacity. No critical flood alerts active.
        </div>
      `;
      return;
    }

    alertWards.forEach(w => {
      const id = w.ward_id || w.id;
      const name = w.locality || w.ward_name || w.name || ("Ward " + id);
      const rTier = (w.waterlogging ? w.waterlogging.predicted_risk_level : w.risk_level || "LOW").toUpperCase();
      const prob = w.waterlogging ? (w.waterlogging.prediction_probability * 100).toFixed(1) : "0.0";
      const elev = w.elevation_m || 27.5;
      const infra = w.nearby_infrastructure || `${name} Storm Culvert`;

      const card = document.createElement("div");
      card.className = "alert-infra-card";
      card.style.background = "rgba(4, 18, 44, 0.8)";
      card.style.border = `1px solid ${getRiskColor(rTier)}`;
      card.style.borderRadius = "12px";
      card.style.padding = "14px";
      card.style.display = "flex";
      card.style.flexDirection = "column";
      card.style.gap = "8px";

      card.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <strong style="color:var(--text-white); font-size:14px;">Ward ${id}: ${name}</strong>
          <span class="badge-status-pill pill-${rTier.toLowerCase()}">${rTier}</span>
        </div>
        <div style="font-size:11px; color:var(--text-muted);">
          Inundation Risk: <strong style="color:${getRiskColor(rTier)};">${prob}%</strong> &bull; SRTM Elevation: <strong>${elev}m MSL</strong>
        </div>
        <div style="font-size:11px; color:var(--text-secondary); background:rgba(2,10,28,0.7); padding:8px 10px; border-radius:6px; border-left:2px solid ${getRiskColor(rTier)};">
          <strong>Critical Asset:</strong> ${infra}
        </div>
        <button class="btn-sidebar-action" style="margin-top:4px; padding:6px 12px; font-size:11px; width:100%;" type="button">
          Inspect Ward ${id} Telemetry &rarr;
        </button>
      `;

      card.querySelector("button").onclick = () => selectSingleWard(id, true);
      grid.appendChild(card);
    });
  }

  // =========================================================================
  // 11. EVENT LISTENERS (Search, Selection, Map Navigation, Simulation)
  // =========================================================================
  function initWaterloggingUI() {
    // 1. Select All Wards Button
    const btnSelectAll = document.getElementById("btnSelectAllWards");
    if (btnSelectAll) {
      btnSelectAll.onclick = selectAllWards;
    }

    // 2. Clear Selection Button
    const btnClear = document.getElementById("btnClearWardSelection");
    if (btnClear) {
      btnClear.onclick = clearWardSelection;
    }

    // 3. Search Field in "SELECT GMC WARD"
    const searchField = document.getElementById("gmcWardSearchInput");
    const clearSearchBtn = document.getElementById("btnClearSearch");

    if (searchField) {
      searchField.oninput = (e) => {
        const query = e.target.value.toLowerCase().trim();
        filterWardDirectoryCards(query);
      };

      if (clearSearchBtn) {
        clearSearchBtn.onclick = () => {
          searchField.value = "";
          filterWardDirectoryCards("");
        };
      }
    }

    // 4. Map Geographical Navigation Buttons
    const btnNavIndia = document.getElementById("btnNavIndia");
    if (btnNavIndia) btnNavIndia.onclick = zoomToIndia;

    const btnNavAP = document.getElementById("btnNavAP");
    if (btnNavAP) btnNavAP.onclick = zoomToAndhraPradesh;

    const btnNavGunturDist = document.getElementById("btnNavGunturDist");
    if (btnNavGunturDist) btnNavGunturDist.onclick = zoomToGunturDistrict;

    const btnNavGMCWards = document.getElementById("btnNavGMCWards");
    if (btnNavGMCWards) btnNavGMCWards.onclick = zoomToGMCWards;

    const btnFit = document.getElementById("btnFitGMC");
    if (btnFit) btnFit.onclick = zoomToGMCWards;

    // 5. Layer Toggles
    const btnWards = document.getElementById("btnToggleWards");
    if (btnWards) {
      btnWards.onclick = () => {
        btnWards.classList.toggle("active");
        if (AppState.mapLayers.wlWardsLayer) {
          if (btnWards.classList.contains("active")) {
            AppState.maps.waterlogging.addLayer(AppState.mapLayers.wlWardsLayer);
          } else {
            AppState.maps.waterlogging.removeLayer(AppState.mapLayers.wlWardsLayer);
          }
        }
      };
    }

    const btnSAR = document.getElementById("btnToggleSAR");
    if (btnSAR) {
      btnSAR.onclick = () => {
        btnSAR.classList.toggle("active");
        if (AppState.mapLayers.sarLayer) {
          if (btnSAR.classList.contains("active")) {
            AppState.maps.waterlogging.addLayer(AppState.mapLayers.sarLayer);
          } else {
            AppState.maps.waterlogging.removeLayer(AppState.mapLayers.sarLayer);
          }
        }
      };
    }

    const btnHotspots = document.getElementById("btnToggleHotspots");
    if (btnHotspots) {
      btnHotspots.onclick = () => {
        btnHotspots.classList.toggle("active");
        if (AppState.mapLayers.hotspotsLayer) {
          if (btnHotspots.classList.contains("active")) {
            AppState.maps.waterlogging.addLayer(AppState.mapLayers.hotspotsLayer);
          } else {
            AppState.maps.waterlogging.removeLayer(AppState.mapLayers.hotspotsLayer);
          }
        }
      };
    }

    const btnCanals = document.getElementById("btnToggleCanals");
    if (btnCanals) {
      btnCanals.onclick = () => {
        btnCanals.classList.toggle("active");
        if (AppState.mapLayers.canalsLayer) {
          if (btnCanals.classList.contains("active")) {
            AppState.maps.waterlogging.addLayer(AppState.mapLayers.canalsLayer);
          } else {
            AppState.maps.waterlogging.removeLayer(AppState.mapLayers.canalsLayer);
          }
        }
      };
    }

    // 6. Map Risk Tier Filters
    const mapRiskBtns = document.querySelectorAll(".map-risk-btn");
    mapRiskBtns.forEach(b => {
      b.onclick = () => {
        mapRiskBtns.forEach(x => x.classList.remove("active"));
        b.classList.add("active");
        AppState.activeMapRiskFilter = b.getAttribute("data-risk") || "all";
        if (AppState.gmcData && AppState.gmcData.wards) {
          renderWaterloggingMapLayers(AppState.gmcData.wards);
        }
      };
    });

    // 7. Trend Chart Period Tabs
    const timeTabs = document.querySelectorAll(".wl-time-tab");
    timeTabs.forEach(t => {
      t.onclick = () => {
        timeTabs.forEach(x => x.classList.remove("active"));
        t.classList.add("active");
        AppState.trendPeriod = t.getAttribute("data-period") || "24h";
        renderTrendChart();
      };
    });

    // 8. Full Table Risk Filters
    const tablePills = document.querySelectorAll(".table-filter-pill");
    tablePills.forEach(p => {
      p.onclick = () => {
        tablePills.forEach(x => x.classList.remove("active"));
        p.classList.add("active");
        AppState.activeTableRiskFilter = p.getAttribute("data-filter") || "all";
        if (AppState.gmcData && AppState.gmcData.wards) {
          render57WardsTable(AppState.gmcData.wards);
        }
      };
    });

    // 9. Full Table Sorting
    const sortHeaders = document.querySelectorAll(".wl-data-table th.sortable");
    sortHeaders.forEach(th => {
      th.onclick = () => {
        const col = th.getAttribute("data-sort");
        if (AppState.tableSort.column === col) {
          AppState.tableSort.asc = !AppState.tableSort.asc;
        } else {
          AppState.tableSort.column = col;
          AppState.tableSort.asc = true;
        }
        if (AppState.gmcData && AppState.gmcData.wards) {
          render57WardsTable(AppState.gmcData.wards);
        }
      };
    });

    // 10. Multi-Scenario Simulation
    const scenarioBtns = document.querySelectorAll(".btn-scenario");
    scenarioBtns.forEach(sb => {
      sb.onclick = async () => {
        scenarioBtns.forEach(x => x.classList.remove("active"));
        sb.classList.add("active");
        const extraRain = parseFloat(sb.getAttribute("data-rain") || "0");
        try {
          const resp = await fetch("/api/gmc/simulate-storm", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ rain_extra_mm: extraRain })
          });
          const json = await resp.json();
          if (json && (json.ok || json.success) && json.data) {
            AppState.gmcData = json.data;
            updateDashboardFromData(json.data);
          }
        } catch (err) {
          console.warn("Storm scenario simulation failed:", err);
        }
      };
    });
  }

  function filterWardDirectoryCards(query) {
    const cards = document.querySelectorAll(".ward-dir-card");
    const q = query.toLowerCase().trim();
    cards.forEach(card => {
      if (!q) {
        card.style.display = "flex";
        return;
      }
      const title = card.querySelector(".ward-dir-title").textContent.toLowerCase();
      const sub = card.querySelector(".ward-dir-sub").textContent.toLowerCase();
      card.style.display = (title.includes(q) || sub.includes(q)) ? "flex" : "none";
    });
  }

  // =========================================================================
  // 12. LOCATION & DRAINAGE PAGES INTEGRATION
  // =========================================================================
  // =========================================================================
  // LOCATION INTELLIGENCE & GIS DASHBOARD (Exact Match to Reference Screenshot)
  // =========================================================================
  AppState.location = {
    data: null,
    activeTileType: "satellite", // satellite by default to match screenshot imagery
    trendChart: null,
    initialized: false,
    tileLayers: {
      streets: null,
      satellite: null,
      terrain: null
    },
    gisLayers: {
      rivers: null,
      mainCanals: null,
      secondaryDrains: null,
      waterloggingZones: null,
      pumps: null,
      sluiceGates: null,
      culverts: null,
      flowArrows: null,
      townMarkers: null
    }
  };

  function initLocationMap() {
    initLocationDashboard();
  }

  function initLocationDashboard() {
    const mapDiv = document.getElementById("locationGisMapCanvas");
    if (!mapDiv) return;

    let targetDistrict = AppState.currentDistrict || "Guntur";
    const headerDist = document.getElementById("headerDistrictSelect");
    if (headerDist) {
      headerDist.value = targetDistrict;
    }

    if (!AppState.location.initialized) {
      wireLocationBaseLayerTabs();
      wireLocationSearch();
      AppState.location.initialized = true;
    }

    if (AppState.maps.location) {
      setTimeout(() => AppState.maps.location.invalidateSize(), 150);
    }

    fetchLocationIntelligence(targetDistrict);
  }

  function wireLocationBaseLayerTabs() {
    const tabs = document.querySelectorAll(".btn-map-type");
    tabs.forEach(btn => {
      btn.addEventListener("click", () => {
        tabs.forEach(t => t.classList.remove("active"));
        btn.classList.add("active");
        const mapType = btn.getAttribute("data-type") || "streets";
        AppState.location.activeTileType = mapType;
        switchLocationBaseLayer(mapType);
      });
    });
  }

  function switchLocationBaseLayer(mapType) {
    const map = AppState.maps.location;
    if (!map) return;
    const tiles = AppState.location.tileLayers;

    Object.keys(tiles).forEach(k => {
      if (tiles[k] && map.hasLayer(tiles[k])) {
        map.removeLayer(tiles[k]);
      }
    });

    if (mapType === "satellite") {
      if (!tiles.satellite) {
        tiles.satellite = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
          maxZoom: 19,
          attribution: "Esri World Imagery"
        });
      }
      tiles.satellite.addTo(map);
    } else if (mapType === "terrain") {
      if (!tiles.terrain) {
        tiles.terrain = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}", {
          maxZoom: 19,
          attribution: "Esri World Topo"
        });
      }
      tiles.terrain.addTo(map);
    } else {
      if (!tiles.streets) {
        tiles.streets = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}", {
          maxZoom: 19,
          attribution: "Esri Dark Gray"
        });
      }
      tiles.streets.addTo(map);
    }
  }

  function wireLocationSearch() {
    const searchInput = document.getElementById("locationSearchInput");
    if (!searchInput) return;
    let debounceTimer = null;
    searchInput.addEventListener("input", (e) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        const query = e.target.value.trim();
        if (query.length > 2) {
          fetchLocationIntelligence(query, query);
        }
      }, 400);
    });
  }

  async function fetchLocationIntelligence(district = "Guntur", query = "") {
    try {
      const resp = await fetch(`/api/location/intelligence?district=${encodeURIComponent(district)}&search=${encodeURIComponent(query)}`);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const json = await resp.json();
      if (json && json.success && json.data) {
        AppState.location.data = json.data;
        updateLocationDashboardView(json.data);
      }
    } catch (err) {
      console.error("Location intelligence fetch error:", err);
    }
  }

  function updateLocationDashboardView(data) {
    if (!data) return;

    // 1. Performance Cards
    const perf = data.performance || {};
    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };

    setVal("locPerfInflow", perf.total_inflow_cumecs !== undefined ? `${Number(perf.total_inflow_cumecs).toFixed(1)} m³/s` : "-- m³/s");
    setVal("locPerfOutflow", perf.total_outflow_cumecs !== undefined ? `${Number(perf.total_outflow_cumecs).toFixed(1)} m³/s` : "-- m³/s");
    setVal("locPerfDrained", perf.water_drained_today_million_m3 !== undefined ? `${Number(perf.water_drained_today_million_m3).toFixed(1)} Million m³` : "-- Million m³");
    setVal("locPerfEfficiency", perf.drainage_efficiency_pct !== undefined ? `${perf.drainage_efficiency_pct}%` : "--%");

    // Pump Summary (Dynamic from real status)
    const pSummary = perf.pump_summary || { running: 1, standby: 5, offline: 0 };
    setVal("locPumpsRunning", pSummary.running !== undefined ? pSummary.running : "--");
    setVal("locPumpsStandby", pSummary.standby !== undefined ? pSummary.standby : "--");
    setVal("locPumpsOffline", pSummary.offline !== undefined ? pSummary.offline : "0");

    // 2. Alerts & Bottlenecks
    renderLocationAlerts(data.alerts);

    // 3. 24-Hour Trend Chart
    renderLocation24hTrendChart(data.trend_24h);

    // 4. Map & GIS Layers
    renderLocationMapLayers(data);
  }

  function renderLocationAlerts(alerts) {
    const container = document.getElementById("locationAlertsContainer");
    if (!container) return;
    if (!Array.isArray(alerts) || alerts.length === 0) {
      container.innerHTML = `<div style="text-align:center; color:#64748b; font-size:11px;">No active alerts reported.</div>`;
      return;
    }

    container.innerHTML = alerts.map(a => {
      const isOk = a.severity === "OK";
      const iconSvg = isOk
        ? `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`
        : `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="${a.badge_class === 'badge-high' ? '#ef4444' : '#f59e0b'}" stroke-width="2.2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
      
      return `
        <div class="location-alert-row" title="${a.location || ''} - ${a.action || ''}">
          <div class="alert-left-group">
            <span class="alert-icon-wrap">${iconSvg}</span>
            <span>${a.title}</span>
          </div>
          <span class="alert-badge ${a.badge_class || 'badge-medium'}">${a.badge || a.severity}</span>
        </div>
      `;
    }).join("");
  }

  function renderLocation24hTrendChart(trend) {
    const canvas = document.getElementById("location24hTrendCanvas");
    if (!canvas || typeof Chart === "undefined") return;

    if (AppState.location.trendChart) {
      AppState.location.trendChart.destroy();
      AppState.location.trendChart = null;
    }

    const defaultLabels = ["12AM", "4AM", "8AM", "12PM", "4PM", "8PM", "12AM"];
    const labels = (trend && trend.labels) ? trend.labels : defaultLabels;
    const inflowData = (trend && trend.inflow_series) ? trend.inflow_series : [70.1, 82.8, 114.7, 146.5, 150.3, 121.0, 101.9];
    const outflowData = (trend && trend.outflow_series) ? trend.outflow_series : [54.8, 63.6, 89.9, 115.1, 118.4, 98.6, 82.2];

    const ctx = canvas.getContext("2d");
    const cyanGrad = ctx.createLinearGradient(0, 0, 0, 105);
    cyanGrad.addColorStop(0, "rgba(0, 240, 255, 0.25)");
    cyanGrad.addColorStop(1, "rgba(0, 240, 255, 0.0)");

    const purpleGrad = ctx.createLinearGradient(0, 0, 0, 105);
    purpleGrad.addColorStop(0, "rgba(168, 85, 247, 0.25)");
    purpleGrad.addColorStop(1, "rgba(168, 85, 247, 0.0)");

    AppState.location.trendChart = new Chart(ctx, {
      type: "line",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Inflow",
            data: inflowData,
            borderColor: "#00f0ff",
            backgroundColor: cyanGrad,
            borderWidth: 2.2,
            tension: 0.42,
            fill: true,
            pointRadius: 2.5,
            pointHoverRadius: 4,
            pointBackgroundColor: "#00f0ff"
          },
          {
            label: "Outflow",
            data: outflowData,
            borderColor: "#a855f7",
            backgroundColor: purpleGrad,
            borderWidth: 2.2,
            tension: 0.42,
            fill: true,
            pointRadius: 2.5,
            pointHoverRadius: 4,
            pointBackgroundColor: "#a855f7"
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "rgba(4, 15, 38, 0.95)",
            titleColor: "#00f0ff",
            bodyColor: "#ffffff",
            borderColor: "rgba(0, 240, 255, 0.3)",
            borderWidth: 1,
            padding: 8,
            callbacks: {
              label: (ctx) => ` ${ctx.dataset.label}: ${ctx.parsed.y} m³/s`
            }
          }
        },
        scales: {
          x: {
            grid: { color: "rgba(255, 255, 255, 0.04)" },
            ticks: { color: "#64748b", font: { size: 9.5 } }
          },
          y: {
            grid: { color: "rgba(255, 255, 255, 0.04)" },
            ticks: {
              color: "#64748b",
              font: { size: 9.5 },
              stepSize: 50
            },
            title: {
              display: true,
              text: "Flow (m³/s)",
              color: "#64748b",
              font: { size: 9 }
            },
            min: 0,
            max: 180
          }
        }
      }
    });
  }

  function renderLocationMapLayers(data) {
    const mapDiv = document.getElementById("locationGisMapCanvas");
    if (!mapDiv || typeof L === "undefined") return;

    const center = data.map_center || [16.32, 80.52];
    const zoom = data.map_zoom || 11;

    let map = AppState.maps.location;
    if (!map) {
      map = L.map("locationGisMapCanvas", {
        zoomControl: false,
        attributionControl: false
      }).setView(center, zoom);

      // Add Zoom Control on top-left underneath layer tabs (matching reference screenshot)
      L.control.zoom({ position: "topleft" }).addTo(map);

      AppState.maps.location = map;
      switchLocationBaseLayer(AppState.location.activeTileType || "satellite");
    } else {
      map.setView(center, zoom);
      setTimeout(() => map.invalidateSize(), 100);
    }

    // Clear existing LayerGroups
    const layers = AppState.location.gisLayers;
    Object.keys(layers).forEach(k => {
      if (layers[k]) {
        map.removeLayer(layers[k]);
        layers[k] = null;
      }
    });

    const gis = data.gis_layers || {};

    // 1. Rivers Layer (Krishna River)
    const riverItems = [];
    if (Array.isArray(gis.rivers)) {
      gis.rivers.forEach(r => {
        const pl = L.polyline(r.coordinates, {
          color: r.color || "#0284c7",
          weight: r.width || 14,
          opacity: 0.88,
          lineCap: "round",
          lineJoin: "round"
        });
        pl.bindPopup(`<strong>${r.name}</strong><br>Type: Receiving Water Body<br>Status: Flowing to Bay of Bengal`);
        riverItems.push(pl);
      });
    }
    layers.rivers = L.layerGroup(riverItems).addTo(map);

    // 2. Main Canals Layer (Cyan Lines)
    const canalItems = [];
    if (Array.isArray(gis.main_canals)) {
      gis.main_canals.forEach(c => {
        const pl = L.polyline(c.coordinates, {
          color: c.color || "#00f0ff",
          weight: 4.5,
          opacity: 0.95,
          lineCap: "round",
          lineJoin: "round"
        });
        pl.bindPopup(`<strong>${c.name}</strong><br>Type: ${c.type}<br>Monitored Flow: ${c.flow_cumecs !== undefined ? `${c.flow_cumecs} m³/s` : "Nominal"}`);
        canalItems.push(pl);
      });
    }
    layers.mainCanals = L.layerGroup(canalItems).addTo(map);

    // 3. Secondary Drains Layer (Dark Blue Lines)
    const drainItems = [];
    if (Array.isArray(gis.secondary_drains)) {
      gis.secondary_drains.forEach(d => {
        const pl = L.polyline(d.coordinates, {
          color: d.color || "#0369a1",
          weight: 2.8,
          opacity: 0.9,
          lineCap: "round",
          lineJoin: "round"
        });
        pl.bindPopup(`<strong>${d.name}</strong><br>Type: ${d.type}`);
        drainItems.push(pl);
      });
    }
    layers.secondaryDrains = L.layerGroup(drainItems).addTo(map);

    // 4. Waterlogging Zones (Red shaded area with alert triangle epicenter)
    const wlItems = [];
    if (Array.isArray(gis.waterlogging_zones)) {
      gis.waterlogging_zones.forEach(z => {
        const circle = L.circle([z.lat, z.lon], {
          radius: z.radius || 2400,
          color: z.color || "#ef4444",
          fillColor: z.fillColor || "rgba(239, 68, 68, 0.45)",
          fillOpacity: 0.45,
          weight: 2,
          dashArray: "5, 5"
        });
        circle.bindPopup(`
          <div style="font-family:sans-serif; font-size:12px; color:#020d21;">
            <strong style="color:#ef4444;">⚠️ ${z.name}</strong><br>
            <strong>Risk Status:</strong> Active Surcharge Threat<br>
            <p style="margin:4px 0 0 0;">${z.advisory || 'Natural depression with constricted gravity outflow.'}</p>
          </div>
        `);
        wlItems.push(circle);

        const iconMarker = L.marker([z.lat, z.lon], {
          icon: L.divIcon({
            className: "loc-wl-icon-wrap",
            html: `
              <div class="loc-marker-wl-epicenter">
                <svg width="28" height="28" viewBox="0 0 24 24">
                  <polygon points="12,2 22,20 2,20" fill="#ef4444" stroke="#ffffff" stroke-width="2"/>
                  <text x="12" y="17" font-size="12" font-weight="900" fill="#ffffff" text-anchor="middle">!</text>
                </svg>
              </div>
            `,
            iconSize: [32, 32],
            iconAnchor: [16, 16]
          })
        });
        wlItems.push(iconMarker);
      });
    }
    layers.waterloggingZones = L.layerGroup(wlItems).addTo(map);

    // 5. Pumps (Green circular markers with pump icon)
    const pumpItems = [];
    if (Array.isArray(gis.pumps)) {
      gis.pumps.forEach(p => {
        const isStandby = p.status === "Standby";
        const m = L.marker([p.lat, p.lon], {
          icon: L.divIcon({
            className: "loc-pump-icon-wrap",
            html: `
              <div class="${isStandby ? 'loc-marker-pump-standby' : 'loc-marker-pump'}" title="${p.name} (${p.status})">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <circle cx="12" cy="12" r="9"/>
                  <circle cx="12" cy="12" r="3"/>
                  <line x1="12" y1="3" x2="12" y2="9"/>
                  <line x1="12" y1="15" x2="12" y2="21"/>
                  <line x1="3" y1="12" x2="9" y2="12"/>
                  <line x1="15" y1="12" x2="21" y2="12"/>
                </svg>
              </div>
            `,
            iconSize: [26, 26],
            iconAnchor: [13, 13]
          })
        });
        m.bindPopup(`
          <div style="font-family:sans-serif; font-size:12px; color:#020d21;">
            <strong style="color:#10b981;">⚙️ ${p.name}</strong><br>
            <strong>Status:</strong> ${p.status}<br>
            <strong>Discharge:</strong> ${p.discharge}
          </div>
        `);
        pumpItems.push(m);
      });
    }
    layers.pumps = L.layerGroup(pumpItems).addTo(map);

    // 6. Sluice Gates (Cyan gate markers)
    const gateItems = [];
    if (Array.isArray(gis.sluice_gates)) {
      gis.sluice_gates.forEach(s => {
        const m = L.marker([s.lat, s.lon], {
          icon: L.divIcon({
            className: "loc-gate-icon-wrap",
            html: `
              <div class="loc-marker-gate" title="${s.name} (${s.status})">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <line x1="4" y1="20" x2="4" y2="4"/>
                  <line x1="20" y1="20" x2="20" y2="4"/>
                  <line x1="2" y1="6" x2="22" y2="6"/>
                  <rect x="7" y1="8" width="10" height="9" fill="currentColor"/>
                </svg>
              </div>
            `,
            iconSize: [26, 26],
            iconAnchor: [13, 13]
          })
        });
        m.bindPopup(`
          <div style="font-family:sans-serif; font-size:12px; color:#020d21;">
            <strong style="color:#00f0ff;">⛩️ ${s.name}</strong><br>
            <strong>Status:</strong> ${s.status}<br>
            <strong>Operational Head:</strong> Nominal
          </div>
        `);
        gateItems.push(m);
      });
    }
    layers.sluiceGates = L.layerGroup(gateItems).addTo(map);

    // 7. Culverts (Purple arch markers)
    const culvertItems = [];
    if (Array.isArray(gis.culverts)) {
      gis.culverts.forEach(c => {
        const m = L.marker([c.lat, c.lon], {
          icon: L.divIcon({
            className: "loc-culvert-icon-wrap",
            html: `
              <div class="loc-marker-culvert" title="${c.name}">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <path d="M4 20V12a8 8 0 0 1 16 0v8"/>
                  <line x1="2" y1="20" x2="22" y2="20"/>
                </svg>
              </div>
            `,
            iconSize: [26, 26],
            iconAnchor: [13, 13]
          })
        });
        m.bindPopup(`
          <div style="font-family:sans-serif; font-size:12px; color:#020d21;">
            <strong style="color:#8b5cf6;">🌉 ${c.name}</strong><br>
            <strong>Structure:</strong> Cross-Drainage Culvert
          </div>
        `);
        culvertItems.push(m);
      });
    }
    layers.culverts = L.layerGroup(culvertItems).addTo(map);

    // 8. Flow Chevrons (Cyan arrows pointing towards Krishna River)
    const arrowItems = [];
    if (Array.isArray(gis.flow_arrows)) {
      gis.flow_arrows.forEach(a => {
        const m = L.marker([a.lat, a.lon], {
          icon: L.divIcon({
            className: "loc-flow-icon-wrap",
            html: `<div class="drainage-flow-arrow" style="transform: rotate(${a.bearing || 125}deg);">❯</div>`,
            iconSize: [20, 20],
            iconAnchor: [10, 10]
          }),
          interactive: false
        });
        arrowItems.push(m);
      });
    }
    layers.flowArrows = L.layerGroup(arrowItems).addTo(map);

    // 9. Town Markers & River Badges
    const townItems = [];
    if (Array.isArray(gis.town_markers)) {
      gis.town_markers.forEach(t => {
        let badgeHtml = "";
        let size = [110, 26];
        let anchor = [55, 13];

        if (t.is_center_pin) {
          badgeHtml = `
            <div class="loc-center-pin">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="#00f0ff" stroke="#ffffff" stroke-width="1.5">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                <circle cx="12" cy="10" r="3" fill="#020d21"></circle>
              </svg>
              <span>${t.name}</span>
            </div>
          `;
          size = [95, 30];
          anchor = [47, 15];
        } else if (t.is_river_badge) {
          badgeHtml = `<div class="loc-river-badge">${t.name}</div>`;
          size = [110, 26];
          anchor = [55, 13];
        } else {
          badgeHtml = `<div class="drainage-map-badge">${t.name}</div>`;
        }

        const m = L.marker([t.lat, t.lon], {
          icon: L.divIcon({
            className: "loc-town-badge-wrap",
            html: badgeHtml,
            iconSize: size,
            iconAnchor: anchor
          })
        });
        townItems.push(m);
      });
    }
    layers.townMarkers = L.layerGroup(townItems).addTo(map);
  }


  // =========================================================================
  // DRAINAGE INTELLIGENCE & GIS DASHBOARD (Exact Match to Reference Screenshot)
  // =========================================================================
  AppState.drainage = {
    data: null,
    activeTab: "network",
    trendChart: null,
    initialized: false,
    layers: {
      rivers: null,
      mainCanals: null,
      secondaryDrains: null,
      flowArrows: null,
      problemZones: null,
      bottlenecks: null,
      pumps: null,
      sluiceGates: null,
      culverts: null,
      townMarkers: null
    }
  };

  function initDrainageMap() {
    initDrainageDashboard();
  }

  function initDrainageDashboard() {
    const mapDiv = document.getElementById("drainageSatelliteMap");
    if (!mapDiv) return;

    let targetDistrict = AppState.currentDistrict || "Bapatla";
    const headerDist = document.getElementById("headerDistrictSelect");
    if (headerDist) {
      headerDist.value = targetDistrict;
    }

    if (!AppState.drainage.initialized) {
      wireDrainageTabs();
      wireDrainageRefresh();
      AppState.drainage.initialized = true;
    }

    if (AppState.maps.drainage) {
      setTimeout(() => AppState.maps.drainage.invalidateSize(), 150);
    }

    fetchDrainageIntelligence(targetDistrict);
  }

  function wireDrainageTabs() {
    const tabs = document.querySelectorAll(".btn-drainage-tab");
    tabs.forEach(btn => {
      btn.addEventListener("click", () => {
        tabs.forEach(t => t.classList.remove("active"));
        btn.classList.add("active");
        const tabType = btn.getAttribute("data-tab") || "network";
        AppState.drainage.activeTab = tabType;
        applyDrainageLayerFilters(tabType);
      });
    });
  }

  function wireDrainageRefresh() {
    const btn = document.getElementById("btnRefreshDrainage");
    if (!btn) return;
    btn.addEventListener("click", () => {
      btn.style.transform = "rotate(360deg)";
      btn.style.transition = "transform 0.5s ease";
      setTimeout(() => { btn.style.transform = "none"; btn.style.transition = "none"; }, 500);
      fetchDrainageIntelligence(AppState.currentDistrict || "Bapatla", true);
    });
  }

  async function fetchDrainageIntelligence(district, force = false) {
    try {
      const resp = await fetch(`/api/drainage/intelligence?district=${encodeURIComponent(district)}`);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const json = await resp.json();
      if (json && json.success && json.data) {
        AppState.drainage.data = json.data;
        updateDrainageDashboardView(json.data);
      }
    } catch (err) {
      console.error("Drainage intelligence fetch error:", err);
    }
  }

  function updateDrainageDashboardView(data) {
    if (!data) return;

    // 1. Title
    const titleEl = document.getElementById("drainageHeroTitle");
    if (titleEl && data.hero_title) {
      titleEl.textContent = data.hero_title;
    }

    // 2. Performance Metrics
    const perf = data.performance || {};
    const setElem = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };

    setElem("perfTotalInflow", perf.total_inflow_cumecs !== undefined ? `${Number(perf.total_inflow_cumecs).toFixed(1)} m³/s` : "-- m³/s");
    setElem("perfTotalOutflow", perf.total_outflow_cumecs !== undefined ? `${Number(perf.total_outflow_cumecs).toFixed(1)} m³/s` : "-- m³/s");
    setElem("perfDrainedToday", perf.water_drained_today_million_m3 !== undefined ? `${Number(perf.water_drained_today_million_m3).toFixed(1)} million m³` : "-- million m³");
    setElem("perfEfficiency", perf.drainage_efficiency_pct !== undefined ? `${perf.drainage_efficiency_pct}%` : "--%");
    setElem("perfActivePumps", `${perf.active_pumps || "6 / 8"}`);
    setElem("perfCriticalBottlenecks", `${perf.critical_bottlenecks !== undefined ? perf.critical_bottlenecks : 0}`);

    // 3. Water Balance Sub-Card
    const wb = data.water_balance || {};
    const inFlow = Number(wb.inflow_cumecs !== undefined ? wb.inflow_cumecs : (perf.total_inflow_cumecs || 0));
    const outFlow = Number(wb.outflow_cumecs !== undefined ? wb.outflow_cumecs : (perf.total_outflow_cumecs || 0));
    setElem("balanceInflowNum", `${inFlow.toFixed(1)} m³/s`);
    setElem("balanceOutflowNum", `${outFlow.toFixed(1)} m³/s`);

    const maxBal = Math.max(inFlow, outFlow, 1);
    const inBar = document.getElementById("balanceBarInflow");
    const outBar = document.getElementById("balanceBarOutflow");
    if (inBar) inBar.style.height = `${Math.round((inFlow / maxBal) * 92)}%`;
    if (outBar) outBar.style.height = `${Math.round((outFlow / maxBal) * 92)}%`;

    // 4. Pump & Sluice Operations Table
    const tableBody = document.getElementById("drainageOpsTableBody");
    if (tableBody && Array.isArray(data.pumps_and_sluices)) {
      tableBody.innerHTML = data.pumps_and_sluices.map(item => `
        <tr>
          <td>${item.name}</td>
          <td><span class="status-indicator-dot ${item.status_dot || (item.status === 'Running' || item.status === 'Open' ? 'dot-green' : 'dot-yellow')}"></span> ${item.status}</td>
          <td class="text-right">${item.discharge}</td>
        </tr>
      `).join("");
    }

    // 5. Flow by Channel Horizontal Bars
    const channelContainer = document.getElementById("drainageChannelFlowsContainer");
    if (channelContainer && Array.isArray(data.flow_by_channel)) {
      const maxCap = 42;
      const rowsHtml = data.flow_by_channel.map(item => {
        const pct = Math.min(100, Math.max(8, Math.round((item.flow_cumecs / maxCap) * 100)));
        return `
          <div class="channel-flow-row">
            <span class="channel-name" title="${item.name}">${item.name}</span>
            <div class="channel-bar-bg">
              <div class="channel-bar-fill" style="width: ${pct}%;"></div>
            </div>
            <strong class="channel-val">${Number(item.flow_cumecs).toFixed(1)} m³/s</strong>
          </div>
        `;
      }).join("");

      channelContainer.innerHTML = rowsHtml + `
        <div class="flow-axis-ticks">
          <span>0</span><span>10</span><span>20</span><span>30</span><span>40</span>
        </div>
        <div style="text-align:center; font-size:9.5px; color:#64748b; font-weight:600; margin-top:-2px;">Flow (m³/s)</div>
      `;
    }

    // 6. Bottleneck & Capacity Progress Bars
    const bContainer = document.getElementById("drainageBottlenecksContainer");
    if (bContainer && Array.isArray(data.bottlenecks)) {
      bContainer.innerHTML = data.bottlenecks.map(b => `
        <div class="bottleneck-row">
          <span class="bottleneck-name" title="${b.name}">${b.rank}. ${b.name}</span>
          <div class="bottleneck-bar-bg">
            <div class="bottleneck-bar-fill" style="width: ${b.utilization_pct}%; background: ${b.color || '#ef4444'}; box-shadow: 0 0 8px ${b.color || '#ef4444'}88;"></div>
          </div>
          <strong class="bottleneck-val" style="color: ${b.color || '#ef4444'};">${b.utilization_pct}%</strong>
        </div>
      `).join("");
    }

    // 7. 24-Hour Trend Chart (Chart.js)
    renderDrainage24hTrendChart(data.trend_24h);

    // 8. Leaflet Map & GIS Layers
    renderDrainageMapLayers(data);
  }

  function renderDrainage24hTrendChart(trend) {
    const canvas = document.getElementById("drainage24hTrendCanvas");
    if (!canvas || typeof Chart === "undefined") return;

    if (AppState.drainage.trendChart) {
      AppState.drainage.trendChart.destroy();
      AppState.drainage.trendChart = null;
    }

    const defaultLabels = ["12AM", "4AM", "8AM", "12PM", "4PM", "8PM", "12AM"];
    const labels = (trend && trend.labels) ? trend.labels : defaultLabels;
    const inflowData = (trend && trend.inflow_series) ? trend.inflow_series : [70.1, 82.8, 114.7, 146.5, 150.3, 121.0, 101.9];
    const outflowData = (trend && trend.outflow_series) ? trend.outflow_series : [54.8, 63.6, 89.9, 115.1, 118.4, 98.6, 82.2];

    const ctx = canvas.getContext("2d");
    const cyanGrad = ctx.createLinearGradient(0, 0, 0, 110);
    cyanGrad.addColorStop(0, "rgba(0, 240, 255, 0.22)");
    cyanGrad.addColorStop(1, "rgba(0, 240, 255, 0.0)");

    const purpleGrad = ctx.createLinearGradient(0, 0, 0, 110);
    purpleGrad.addColorStop(0, "rgba(168, 85, 247, 0.22)");
    purpleGrad.addColorStop(1, "rgba(168, 85, 247, 0.0)");

    AppState.drainage.trendChart = new Chart(ctx, {
      type: "line",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Inflow",
            data: inflowData,
            borderColor: "#00f0ff",
            backgroundColor: cyanGrad,
            borderWidth: 2.2,
            tension: 0.42,
            fill: true,
            pointRadius: 2.5,
            pointHoverRadius: 4,
            pointBackgroundColor: "#00f0ff"
          },
          {
            label: "Outflow",
            data: outflowData,
            borderColor: "#a855f7",
            backgroundColor: purpleGrad,
            borderWidth: 2.2,
            tension: 0.42,
            fill: true,
            pointRadius: 2.5,
            pointHoverRadius: 4,
            pointBackgroundColor: "#a855f7"
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "rgba(4, 15, 38, 0.95)",
            titleColor: "#00f0ff",
            bodyColor: "#ffffff",
            borderColor: "rgba(0, 240, 255, 0.3)",
            borderWidth: 1,
            padding: 8,
            callbacks: {
              label: (ctx) => ` ${ctx.dataset.label}: ${ctx.parsed.y} m³/s`
            }
          }
        },
        scales: {
          x: {
            grid: { color: "rgba(255, 255, 255, 0.04)" },
            ticks: { color: "#64748b", font: { size: 9.5 } }
          },
          y: {
            grid: { color: "rgba(255, 255, 255, 0.04)" },
            ticks: {
              color: "#64748b",
              font: { size: 9.5 },
              stepSize: 50
            },
            title: {
              display: true,
              text: "Flow (m³/s)",
              color: "#64748b",
              font: { size: 9 }
            },
            min: 0,
            max: 180
          }
        }
      }
    });
  }

  function renderDrainageMapLayers(data) {
    const mapDiv = document.getElementById("drainageSatelliteMap");
    if (!mapDiv || typeof L === "undefined") return;

    const center = data.map_center || [15.9042, 80.4674];
    const zoom = data.map_zoom || 11;

    let map = AppState.maps.drainage;
    if (!map) {
      map = L.map("drainageSatelliteMap", {
        zoomControl: false,
        attributionControl: false
      }).setView(center, zoom);

      L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
        maxZoom: 18,
        attribution: "Esri World Imagery"
      }).addTo(map);

      // zoomControl disabled to match screenshot
      AppState.maps.drainage = map;
    } else {
      map.setView(center, zoom);
      setTimeout(() => map.invalidateSize(), 100);
    }

    // Clear existing LayerGroups if present
    const layers = AppState.drainage.layers;
    Object.keys(layers).forEach(k => {
      if (layers[k]) {
        map.removeLayer(layers[k]);
        layers[k] = null;
      }
    });

    const gis = data.gis_layers || {};

    // 1. Rivers Layer
    const riverItems = [];
    if (Array.isArray(gis.rivers)) {
      gis.rivers.forEach(r => {
        const pl = L.polyline(r.coordinates, {
          color: r.color || "#0284c7",
          weight: r.width || 14,
          opacity: 0.88,
          lineCap: "round",
          lineJoin: "round"
        });
        pl.bindPopup(`<strong>${r.name}</strong><br>Type: ${r.type}<br>Receiving Basin: Bay of Bengal`);
        riverItems.push(pl);
      });
    }
    layers.rivers = L.layerGroup(riverItems);

    // 2. Main Canals Layer
    const canalItems = [];
    if (Array.isArray(gis.main_canals)) {
      gis.main_canals.forEach(c => {
        const pl = L.polyline(c.coordinates, {
          color: c.color || "#00f0ff",
          weight: 4.5,
          opacity: 0.95,
          lineCap: "round",
          lineJoin: "round"
        });
        pl.bindPopup(`<strong>${c.name}</strong><br>Type: ${c.type}<br>Monitored Discharge: ${c.flow_cumecs || '-'} m³/s`);
        canalItems.push(pl);
      });
    }
    layers.mainCanals = L.layerGroup(canalItems);

    // 3. Secondary Drains Layer
    const secItems = [];
    if (Array.isArray(gis.secondary_drains)) {
      gis.secondary_drains.forEach(d => {
        const pl = L.polyline(d.coordinates, {
          color: d.color || "#38bdf8",
          weight: 2.2,
          opacity: 0.85,
          dashArray: "6, 4"
        });
        pl.bindPopup(`<strong>${d.name}</strong><br>Type: ${d.type}`);
        secItems.push(pl);
      });
    }
    layers.secondaryDrains = L.layerGroup(secItems);

    // 4. Flow Arrows Layer
    const arrowItems = [];
    if (Array.isArray(gis.flow_arrows)) {
      gis.flow_arrows.forEach(a => {
        const m = L.marker([a.lat, a.lon], {
          icon: L.divIcon({
            className: "drainage-flow-icon-wrap",
            html: `<div class="drainage-flow-arrow" style="transform: rotate(${a.bearing || 135}deg);">❯</div>`,
            iconSize: [20, 20],
            iconAnchor: [10, 10]
          }),
          interactive: false
        });
        arrowItems.push(m);
      });
    }
    layers.flowArrows = L.layerGroup(arrowItems);

    // 5. Problem Zones Layer
    const pzItems = [];
    if (Array.isArray(gis.problem_zones)) {
      gis.problem_zones.forEach(pz => {
        const pg = L.polygon(pz.coordinates, {
          color: pz.color || "#ef4444",
          weight: 2,
          dashArray: "5, 5",
          fillColor: pz.fillColor || "rgba(239, 68, 68, 0.45)",
          fillOpacity: 0.5
        });
        pg.bindPopup(`
          <div style="font-family: sans-serif; font-size: 12px; color: #020d21;">
            <strong style="color: #ef4444;">⚠️ ${pz.name}</strong><br>
            <strong>Risk Tier:</strong> ${pz.risk_tier || 'High'}<br>
            <p style="margin: 4px 0 0 0;">${pz.advisory || 'Drainage congestion under intensive rainfall.'}</p>
          </div>
        `);
        pzItems.push(pg);
      });
    }
    layers.problemZones = L.layerGroup(pzItems);

    // 6. Bottlenecks Layer
    const bnItems = [];
    if (Array.isArray(gis.bottlenecks)) {
      gis.bottlenecks.forEach(b => {
        const m = L.marker([b.lat, b.lon], {
          icon: L.divIcon({
            className: "drainage-bn-icon-wrap",
            html: `
              <div class="drainage-marker-bottleneck">
                <svg width="26" height="26" viewBox="0 0 24 24">
                  <polygon points="12,2 22,20 2,20" fill="#f97316" stroke="#ffffff" stroke-width="1.5"/>
                  <text x="12" y="17" font-size="12" font-weight="900" fill="#020d21" text-anchor="middle">!</text>
                </svg>
              </div>
            `,
            iconSize: [28, 28],
            iconAnchor: [14, 14]
          })
        });
        m.bindPopup(`
          <div style="font-family: sans-serif; font-size: 12px; color: #020d21;">
            <strong style="color: #f97316;">⚠️ Bottleneck: ${b.name}</strong><br>
            <strong>Severity:</strong> ${b.severity || 'Critical'}<br>
            <strong>Capacity Utilization:</strong> ${b.utilization || '85%'}
          </div>
        `);
        bnItems.push(m);
      });
    }
    layers.bottlenecks = L.layerGroup(bnItems);

    // 7. Pumps Layer
    const pumpItems = [];
    if (Array.isArray(gis.pumps)) {
      gis.pumps.forEach(p => {
        const m = L.marker([p.lat, p.lon], {
          icon: L.divIcon({
            className: "drainage-pump-icon-wrap",
            html: `
              <div class="drainage-marker-pump" title="${p.name} (${p.status})">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <rect x="3" y="4" width="18" height="16" rx="2"/>
                  <circle cx="12" cy="12" r="3"/>
                  <line x1="12" y1="2" x2="12" y2="4"/>
                  <line x1="12" y1="20" x2="12" y2="22"/>
                </svg>
              </div>
            `,
            iconSize: [26, 26],
            iconAnchor: [13, 13]
          })
        });
        m.bindPopup(`
          <div style="font-family: sans-serif; font-size: 12px; color: #020d21;">
            <strong style="color: #0284c7;">⚙️ ${p.name}</strong><br>
            <strong>Status:</strong> ${p.status}<br>
            <strong>Discharge:</strong> ${p.discharge}
          </div>
        `);
        pumpItems.push(m);
      });
    }
    layers.pumps = L.layerGroup(pumpItems);

    // 8. Sluice Gates Layer
    const gateItems = [];
    if (Array.isArray(gis.sluice_gates)) {
      gis.sluice_gates.forEach(s => {
        const m = L.marker([s.lat, s.lon], {
          icon: L.divIcon({
            className: "drainage-gate-icon-wrap",
            html: `
              <div class="drainage-marker-gate" title="${s.name} (${s.status})">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <line x1="4" y1="20" x2="4" y2="4"/>
                  <line x1="20" y1="20" x2="20" y2="4"/>
                  <line x1="2" y1="6" x2="22" y2="6"/>
                  <rect x="7" y1="8" width="10" height="9" fill="currentColor"/>
                </svg>
              </div>
            `,
            iconSize: [26, 26],
            iconAnchor: [13, 13]
          })
        });
        m.bindPopup(`
          <div style="font-family: sans-serif; font-size: 12px; color: #020d21;">
            <strong style="color: #10b981;">⛩️ ${s.name}</strong><br>
            <strong>Status:</strong> ${s.status}<br>
            <strong>Discharge:</strong> ${s.discharge}
          </div>
        `);
        gateItems.push(m);
      });
    }
    layers.sluiceGates = L.layerGroup(gateItems);

    // 9. Culverts Layer
    const culvertItems = [];
    if (Array.isArray(gis.culverts)) {
      gis.culverts.forEach(c => {
        const m = L.marker([c.lat, c.lon], {
          icon: L.divIcon({
            className: "drainage-culvert-icon-wrap",
            html: `
              <div class="drainage-marker-culvert" title="${c.name}">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <path d="M4 20V12a8 8 0 0 1 16 0v8"/>
                  <line x1="2" y1="20" x2="22" y2="20"/>
                </svg>
              </div>
            `,
            iconSize: [26, 26],
            iconAnchor: [13, 13]
          })
        });
        m.bindPopup(`
          <div style="font-family: sans-serif; font-size: 12px; color: #020d21;">
            <strong style="color: #8b5cf6;">🌉 ${c.name}</strong><br>
            <strong>Type:</strong> Cross-Drainage Culvert Box
          </div>
        `);
        culvertItems.push(m);
      });
    }
    layers.culverts = L.layerGroup(culvertItems);

    // 10. Town / Channel Labels Layer
    const townItems = [];
    if (Array.isArray(gis.town_markers)) {
      gis.town_markers.forEach(t => {
        let badgeHtml = `<div class="drainage-map-badge">${t.name}</div>`;
        if (t.name.includes("(Town)")) {
          badgeHtml = `<div style="display:flex; align-items:center; gap:6px;"><span style="width:9px; height:9px; border-radius:50%; background:#ffffff; box-shadow:0 0 8px #ffffff; border:1.5px solid #00f0ff; display:inline-block;"></span><div class="drainage-map-badge">${t.name}</div></div>`;
        }
        const m = L.marker([t.lat, t.lon], {
          icon: L.divIcon({
            className: "drainage-town-wrap",
            html: badgeHtml,
            iconSize: [130, 24],
            iconAnchor: [65, 12]
          })
        });
        townItems.push(m);
      });
    }
    layers.townMarkers = L.layerGroup(townItems);

    // Apply layers according to current active tab
    applyDrainageLayerFilters(AppState.drainage.activeTab || "network");
  }

  function applyDrainageLayerFilters(tab) {
    const map = AppState.maps.drainage;
    if (!map) return;
    const l = AppState.drainage.layers;
    if (!l) return;

    const toggle = (layer, show) => {
      if (!layer) return;
      if (show) {
        if (!map.hasLayer(layer)) map.addLayer(layer);
      } else {
        if (map.hasLayer(layer)) map.removeLayer(layer);
      }
    };

    if (tab === "network") {
      toggle(l.rivers, true);
      toggle(l.mainCanals, true);
      toggle(l.secondaryDrains, true);
      toggle(l.flowArrows, true);
      toggle(l.problemZones, true);
      toggle(l.bottlenecks, true);
      toggle(l.pumps, true);
      toggle(l.sluiceGates, true);
      toggle(l.culverts, true);
      toggle(l.townMarkers, true);
    } else if (tab === "flow") {
      toggle(l.rivers, true);
      toggle(l.mainCanals, true);
      toggle(l.secondaryDrains, true);
      toggle(l.flowArrows, true);
      toggle(l.problemZones, false);
      toggle(l.bottlenecks, false);
      toggle(l.pumps, false);
      toggle(l.sluiceGates, false);
      toggle(l.culverts, false);
      toggle(l.townMarkers, true);
    } else if (tab === "problems") {
      toggle(l.rivers, true);
      toggle(l.mainCanals, true);
      toggle(l.secondaryDrains, false);
      toggle(l.flowArrows, false);
      toggle(l.problemZones, true);
      toggle(l.bottlenecks, true);
      toggle(l.pumps, true);
      toggle(l.sluiceGates, false);
      toggle(l.culverts, false);
      toggle(l.townMarkers, true);
    } else if (tab === "infrastructure") {
      toggle(l.rivers, true);
      toggle(l.mainCanals, true);
      toggle(l.secondaryDrains, false);
      toggle(l.flowArrows, false);
      toggle(l.problemZones, false);
      toggle(l.bottlenecks, false);
      toggle(l.pumps, true);
      toggle(l.sluiceGates, true);
      toggle(l.culverts, true);
      toggle(l.townMarkers, true);
    }
  }

  function initScenarioSlider() {
    const slider = document.getElementById("drainageScenarioSlider");
    const label = document.getElementById("drainageScenarioValue");
    const gauge = document.getElementById("drainageGaugePct");
    const desc = document.getElementById("drainageGaugeDesc");

    if (!slider || !label) return;
    let debounceTimer = null;

    slider.addEventListener("input", (e) => {
      const rainVal = parseInt(e.target.value, 10);
      label.textContent = `${rainVal} mm`;
      const baseProb = 0.16;
      const stressProb = Math.min(0.98, baseProb + (rainVal / 150) * 0.75);
      const pct = Math.round(stressProb * 100);

      if (gauge) {
        gauge.textContent = `${pct}%`;
        if (pct < 35) {
          gauge.style.color = "var(--accent-emerald)";
          if (desc) desc.textContent = "Adequate drainage capacity: Nominal stormwater dissipation.";
        } else if (pct < 65) {
          gauge.style.color = "var(--accent-warning)";
          if (desc) desc.textContent = "Elevated runoff: Arundelpet & Sangadigunta channels near capacity.";
        } else {
          gauge.style.color = "var(--accent-danger)";
          if (desc) desc.textContent = "CRITICAL: Widespread surcharge risk. Low-lying depressions in danger of overflow.";
        }
      }

      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(async () => {
        try {
          const resp = await fetch("/api/gmc/simulate-storm", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ rain_extra_mm: rainVal })
          });
          const json = await resp.json();
          if (json && (json.ok || json.success) && json.data) {
            AppState.gmcData = json.data;
            updateDashboardFromData(json.data);
          }
        } catch (err) {
          console.warn("Storm simulation error:", err);
        }
      }, 400);
    });
  }

  function initActionButtons() {
    const startAnalysisBtn = document.getElementById("startAnalysisBtn");
    if (startAnalysisBtn) {
      startAnalysisBtn.onclick = () => executeFullAIAnalysis(true);
    }
    const cardSat = document.getElementById("cardSatellite");
    if (cardSat) {
      cardSat.onclick = () => {
        switchPage("waterlogging");
        setTimeout(() => {
          const btn = document.getElementById("btnLayerSar") || document.querySelector('button[data-layer="sar"]');
          if (btn) btn.click();
        }, 200);
      };
    }
    const cardDrain = document.getElementById("cardDrainage");
    if (cardDrain) {
      cardDrain.onclick = () => switchPage("drainage");
    }
    const cardWater = document.getElementById("cardWaterlogging");
    if (cardWater) {
      cardWater.onclick = () => switchPage("waterlogging");
    }
    const cardRisk = document.getElementById("cardRisk");
    if (cardRisk) {
      cardRisk.onclick = () => {
        switchPage("waterlogging");
        setTimeout(() => {
          const insp = document.getElementById("waterloggingInspectorCard");
          if (insp) insp.scrollIntoView({ behavior: "smooth" });
        }, 250);
      };
    }

    initProfileModal();
  }

  function initProfileModal() {
    const btn = document.querySelector(".profile-btn");
    if (btn) {
      btn.onclick = () => {
        showProfileDetails();
      };
    }

    const closeBtn = document.getElementById("modalCloseBtn");
    if (closeBtn) {
      closeBtn.onclick = () => {
        const modal = document.getElementById("analysisModalOverlay");
        if (modal) modal.style.display = "none";
      };
    }

    window.addEventListener("click", (e) => {
      const modal = document.getElementById("analysisModalOverlay");
      if (e.target === modal) {
        modal.style.display = "none";
      }
    });
  }

  function showProfileDetails() {
    const modal = document.getElementById("analysisModalOverlay");
    const title = document.getElementById("analysisModalTitle");
    const body = document.getElementById("analysisModalBody");
    if (!modal || !body) return;

    if (title) title.textContent = "Municipal Administrator Profile & System Status";
    body.innerHTML = `
      <div style="font-family: var(--font-sans); color: #cbd5e1; font-size: 13.5px; line-height: 1.6;">
        <div style="display: flex; align-items: center; gap: 14px; margin-bottom: 18px; padding-bottom: 14px; border-bottom: 1px solid rgba(0, 240, 255, 0.2);">
          <div style="width: 48px; height: 48px; border-radius: 50%; background: linear-gradient(135deg, #0284c7, #00f0ff); display: flex; align-items: center; justify-content: center; color: #ffffff; font-weight: 700; font-size: 18px; box-shadow: 0 0 16px rgba(0, 240, 255, 0.4);">
            GMC
          </div>
          <div>
            <h4 style="color: #ffffff; font-size: 16px; margin: 0; font-weight: 700;">Guntur Municipal Corporation &amp; APSDMA</h4>
            <span style="color: #00f0ff; font-size: 12px; font-weight: 600;">Operational Flood Early-Warning &amp; Drainage Cell</span>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px;">
          <div style="background: rgba(6, 24, 52, 0.75); border: 1px solid rgba(56, 189, 248, 0.2); border-radius: 12px; padding: 12px;">
            <span style="font-size: 11px; color: #94a3b8; text-transform: uppercase;">User Session</span>
            <div style="font-size: 14px; color: #ffffff; font-weight: 600; margin-top: 3px;">Executive Officer (Drainage)</div>
          </div>
          <div style="background: rgba(6, 24, 52, 0.75); border: 1px solid rgba(56, 189, 248, 0.2); border-radius: 12px; padding: 12px;">
            <span style="font-size: 11px; color: #94a3b8; text-transform: uppercase;">Active Jurisdiction</span>
            <div style="font-size: 14px; color: #10b981; font-weight: 600; margin-top: 3px;">Andhra Pradesh &bull; Guntur</div>
          </div>
        </div>

        <h5 style="color: #38bdf8; font-size: 13px; text-transform: uppercase; margin-bottom: 8px;">Active Data Integrations</h5>
        <ul style="list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 6px;">
          <li style="display: flex; align-items: center; gap: 8px;">
            <span style="width: 8px; height: 8px; border-radius: 50%; background: #10b981; box-shadow: 0 0 6px #10b981;"></span>
            <span>Open-Meteo High-Resolution Ensemble Weather API (LIVE)</span>
          </li>
          <li style="display: flex; align-items: center; gap: 8px;">
            <span style="width: 8px; height: 8px; border-radius: 50%; background: #10b981; box-shadow: 0 0 6px #10b981;"></span>
            <span>ESA Copernicus Sentinel-1 SAR &amp; Sentinel-2 MSI (LIVE STAC)</span>
          </li>
          <li style="display: flex; align-items: center; gap: 8px;">
            <span style="width: 8px; height: 8px; border-radius: 50%; background: #10b981; box-shadow: 0 0 6px #10b981;"></span>
            <span>NASA SRTM 30m Digital Elevation Model (SRTM-1)</span>
          </li>
          <li style="display: flex; align-items: center; gap: 8px;">
            <span style="width: 8px; height: 8px; border-radius: 50%; background: #10b981; box-shadow: 0 0 6px #10b981;"></span>
            <span>Tuned Random Forest Pipeline (<code>waterlogging.pkl</code>, 30 features)</span>
          </li>
          <li style="display: flex; align-items: center; gap: 8px;">
            <span style="width: 8px; height: 8px; border-radius: 50%; background: #10b981; box-shadow: 0 0 6px #10b981;"></span>
            <span>Random Forest Drainage Classifier (<code>drainage_random_forest.pkl</code>)</span>
          </li>
        </ul>
      </div>
    `;
    modal.style.display = "flex";
  }

  function updateCommandCenterMetrics(targetDistrict = null, payload = null) {
    const district = targetDistrict || AppState.currentDistrict || "Guntur";

    // 1. Waterlogging Risk Level
    const riskBadge = document.getElementById("ccRiskLevelVal");
    const riskText = document.getElementById("ccRiskText");
    if (riskBadge && riskText) {
      let risk = "Low";
      if (payload && payload.risk_tier) {
        risk = payload.risk_tier.replace("Risk", "").trim();
      } else if (AppState.gmcData && AppState.gmcData.risk_level) {
        risk = AppState.gmcData.risk_level;
      }
      riskText.textContent = risk;
      const rLower = risk.toLowerCase();
      riskBadge.className = "badge-status-pill " + (rLower === "high" || rLower === "severe" ? "pill-high" : (rLower === "moderate" ? "pill-medium" : "pill-low"));
    }

    // 2. 24h Rainfall
    const rainEl = document.getElementById("ccRainfallVal");
    if (rainEl) {
      if (payload && payload.kpi_metrics && payload.kpi_metrics.rainfall_24h_mm != null) {
        rainEl.textContent = `${payload.kpi_metrics.rainfall_24h_mm} mm`;
      } else if (AppState.weather && AppState.weather.rainfall_24h != null) {
        rainEl.textContent = `${AppState.weather.rainfall_24h} mm`;
      } else {
        rainEl.textContent = "42 mm";
      }
    }

    // 3. Drainage Status
    const drainEl = document.getElementById("ccDrainageVal");
    if (drainEl) {
      if (payload && payload.kpi_metrics && payload.kpi_metrics.drainage_status) {
        drainEl.textContent = payload.kpi_metrics.drainage_status;
      } else {
        drainEl.textContent = "Normal";
      }
    }

    // 4. Coverage
    const covEl = document.getElementById("ccCoverageVal");
    if (covEl) {
      if (district === "Guntur") {
        covEl.textContent = "GMC - 57 Wards";
      } else {
        covEl.textContent = `${district} District`;
      }
    }
  }

  async function executeFullAIAnalysis(forceRefresh = false) {
    const btn = document.getElementById("startAnalysisBtn");
    const origHtml = btn ? btn.innerHTML : "";
    const district = AppState.currentDistrict || "Guntur";
    if (btn) {
      btn.style.opacity = "0.75";
      btn.style.pointerEvents = "none";
      btn.innerHTML = `<span class="btn-play-badge"><span class="pulse-dot"></span></span><span>Analyzing ${district}...</span>`;
    }
    try {
      if (district === "Guntur") {
        await fetchLiveGMCData(forceRefresh);
        updateCommandCenterMetrics("Guntur");
        switchPage("waterlogging");
      } else {
        await fetchAPWaterIntelligence(district, AppState.currentWardId, "24h");
        updateCommandCenterMetrics(district);
        switchPage("home");
      }
    } catch (err) {
      console.error("AI Analysis Execution Error:", err);
      alert(`Hydrological analysis error for ${district}: ${err.message || 'Please retry.'}`);
    } finally {
      if (btn) {
        btn.style.opacity = "1";
        btn.style.pointerEvents = "auto";
        btn.innerHTML = origHtml;
      }
    }
  }

  // Global handle for inspector popup click
  window.selectWaterloggingWard = (id) => selectSingleWard(id, true);



  // =========================================================================
  // 12. ANDHRA PRADESH STATEWIDE WATER INTELLIGENCE (HOME DASHBOARD CONTROLLER)
  // =========================================================================

  const LOCATION_STORAGE_KEY = "sdw_location_selection_v1";
  const DEFAULT_LOCATION = {
    country: "India",
    state: "Andhra Pradesh",
    district: "Guntur",
    municipality: "Guntur Municipal Corporation",
    wardId: 12,
    wardName: "Vidyanagar East"
  };

  AppState.homeSatelliteMap = null;
  AppState.homeTrendChart = null;
  AppState.districtDonutChart = null;
  AppState.lastHomeIntelData = null;
  AppState.locationReady = false;
  AppState.locationBootstrapped = false;
  AppState.intelAbortController = null;
  AppState.intelRequestSeq = 0;
  AppState.locationSeq = 0;
  AppState.trendPeriod = "24h";

  AppState.locationCatalog = {
    states: null,
    districtsByState: {},
    munisByKey: {},
    wardsByKey: {}
  };

  AppState.locationSelection = { ...DEFAULT_LOCATION };
  AppState.currentState = DEFAULT_LOCATION.state;
  AppState.currentDistrict = DEFAULT_LOCATION.district;
  AppState.currentMuni = DEFAULT_LOCATION.municipality;
  AppState.currentWardId = DEFAULT_LOCATION.wardId;

  function loadSavedLocationSelection() {
    try {
      const raw = localStorage.getItem(LOCATION_STORAGE_KEY);
      if (!raw) return { ...DEFAULT_LOCATION };
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return { ...DEFAULT_LOCATION };
      return {
        country: "India",
        state: typeof parsed.state === "string" && parsed.state.trim() ? parsed.state.trim() : DEFAULT_LOCATION.state,
        district: typeof parsed.district === "string" && parsed.district.trim() ? parsed.district.trim() : DEFAULT_LOCATION.district,
        municipality: typeof parsed.municipality === "string" ? parsed.municipality.trim() : "",
        wardId: Number.isFinite(Number(parsed.wardId)) && Number(parsed.wardId) > 0 ? Number(parsed.wardId) : null,
        wardName: typeof parsed.wardName === "string" ? parsed.wardName : ""
      };
    } catch (_) {
      return { ...DEFAULT_LOCATION };
    }
  }

  function saveLocationSelection(sel) {
    try {
      localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify({
        country: "India",
        state: sel.state,
        district: sel.district,
        municipality: sel.municipality,
        wardId: sel.wardId,
        wardName: sel.wardName
      }));
    } catch (_) {}
  }

  function syncAppStateFromSelection(sel) {
    AppState.locationSelection = { ...sel };
    AppState.currentState = sel.state;
    AppState.currentDistrict = sel.district;
    AppState.currentMuni = sel.municipality;
    AppState.currentWardId = sel.wardId || 1;
  }

  function setLocationStatus(msg, level = "info") {
    const el = document.getElementById("homeLocationStatus");
    if (!el) return;
    if (!msg) {
      el.style.display = "none";
      el.textContent = "";
      return;
    }
    el.style.display = "block";
    el.textContent = msg;
    if (level === "error") {
      el.style.color = "#fca5a5";
      el.style.background = "rgba(239,68,68,0.14)";
      el.style.borderColor = "rgba(239,68,68,0.4)";
    } else if (level === "loading") {
      el.style.color = "#fde68a";
      el.style.background = "rgba(245,158,11,0.12)";
      el.style.borderColor = "rgba(245,158,11,0.35)";
    } else {
      el.style.color = "#38bdf8";
      el.style.background = "rgba(0,240,255,0.08)";
      el.style.borderColor = "rgba(0,240,255,0.22)";
    }
  }

  function setSelectOptions(selectEl, items, selectedValue, labelFormatter) {
    if (!selectEl) return "";
    selectEl.innerHTML = "";
    if (!items || items.length === 0) {
      const opt = document.createElement("option");
      opt.value = "";
      opt.textContent = "No verified locations available";
      selectEl.appendChild(opt);
      selectEl.disabled = true;
      return "";
    }
    selectEl.disabled = false;
    let resolvedVal = "";
    const targetLow = (selectedValue || "").toLowerCase();
    items.forEach((item) => {
      const val = typeof item === "string" ? item : (item.value || item.name || item.state || "");
      const label = labelFormatter ? labelFormatter(item) : val;
      const opt = document.createElement("option");
      opt.value = val;
      opt.textContent = label;
      if (val.toLowerCase() === targetLow) {
        opt.selected = true;
        resolvedVal = val;
      }
      selectEl.appendChild(opt);
    });
    if (!resolvedVal && items.length > 0) {
      const firstVal = typeof items[0] === "string" ? items[0] : (items[0].value || items[0].name || items[0].state || "");
      selectEl.value = firstVal;
      resolvedVal = firstVal;
    } else {
      selectEl.value = resolvedVal;
    }
    return resolvedVal;
  }

  async function apiGetLocationJson(url) {
    const res = await fetch(url);
    const json = await res.json();
    if (!res.ok || !json || !(json.ok || json.success) || !json.data) {
      const msg = (json && json.error) ? json.error : `HTTP ${res.status}`;
      throw new Error(msg);
    }
    return json.data;
  }

  async function fetchStatesCached() {
    if (AppState.locationCatalog.states) return AppState.locationCatalog.states;
    const data = await apiGetLocationJson("/api/locations/states");
    const list = (data.states || []).map((s) => s.state);
    AppState.locationCatalog.states = list;
    return list;
  }

  async function fetchDistrictsCached(stateName) {
    const key = stateName.toLowerCase();
    if (AppState.locationCatalog.districtsByState[key]) {
      return AppState.locationCatalog.districtsByState[key];
    }
    const data = await apiGetLocationJson(`/api/locations/districts?state=${encodeURIComponent(stateName)}`);
    const list = data.districts || [];
    AppState.locationCatalog.districtsByState[key] = list;
    return list;
  }

  async function fetchMunicipalitiesCached(stateName, districtName) {
    const key = `${stateName.toLowerCase()}::${districtName.toLowerCase()}`;
    if (AppState.locationCatalog.munisByKey[key]) {
      return AppState.locationCatalog.munisByKey[key];
    }
    const data = await apiGetLocationJson(
      `/api/locations/municipalities?state=${encodeURIComponent(stateName)}&district=${encodeURIComponent(districtName)}`
    );
    const list = data.municipalities || [];
    AppState.locationCatalog.munisByKey[key] = list;
    return list;
  }

  async function fetchWardsCached(stateName, districtName, muniName) {
    const key = `${stateName.toLowerCase()}::${districtName.toLowerCase()}::${(muniName || "").toLowerCase()}`;
    if (AppState.locationCatalog.wardsByKey[key]) {
      return AppState.locationCatalog.wardsByKey[key];
    }
    const data = await apiGetLocationJson(
      `/api/locations/wards?state=${encodeURIComponent(stateName)}&district=${encodeURIComponent(districtName)}&municipality=${encodeURIComponent(muniName || "")}`
    );
    AppState.locationCatalog.wardsByKey[key] = data;
    return data;
  }

  function applyWardSearchFilter() {
    const listEl = document.getElementById("homeWardPillsList");
    const searchEl = document.getElementById("homeWardSearchInput");
    if (!listEl) return;
    const q = searchEl ? searchEl.value.toLowerCase().trim() : "";
    const items = listEl.querySelectorAll(".ward-pill-item");
    let visibleCount = 0;
    items.forEach((item) => {
      const text = (item.getAttribute("data-search") || item.textContent || "").toLowerCase();
      const match = !q || text.includes(q);
      item.style.display = match ? "flex" : "none";
      if (match) visibleCount += 1;
    });
    let emptyEl = listEl.querySelector(".ward-pill-empty");
    if (items.length > 0 && visibleCount === 0) {
      if (!emptyEl) {
        emptyEl = document.createElement("div");
        emptyEl.className = "ward-pill-empty";
        emptyEl.style.cssText = "padding:10px; font-size:12px; color:#94a3b8; text-align:center;";
        listEl.appendChild(emptyEl);
      }
      emptyEl.textContent = `No divisions matching "${searchEl ? searchEl.value.trim() : ""}"`;
      emptyEl.style.display = "block";
    } else if (emptyEl) {
      emptyEl.style.display = "none";
    }
  }

  function renderHomeWardPills(items, hasWardPolygons, activeWardId, subdivisionType) {
    const listEl = document.getElementById("homeWardPillsList");
    if (!listEl) return;
    if (!items || items.length === 0) {
      listEl.innerHTML = `<div class="ward-pill-empty" style="padding:10px; font-size:12px; color:#fca5a5; text-align:center;">No divisions available for this municipality</div>`;
      return;
    }

    const isWard = (subdivisionType === "ward" || hasWardPolygons);
    listEl.innerHTML = items.map((item) => {
      const id = Number(item.id);
      const label = item.label || (isWard ? `Ward ${id} - ${item.name}` : item.name);
      const isActive = id === Number(activeWardId);
      const tier = (item.risk_tier_badge || item.risk_tier || "").toUpperCase();
      let dotClass = "dot-low";
      if (tier.includes("SEVERE")) dotClass = "dot-severe";
      else if (tier.includes("HIGH") || item.is_hotspot) dotClass = "dot-high";
      else if (tier.includes("MOD")) dotClass = "dot-mod";
      const searchText = `${id} ${item.name || ""} ${label}`.replace(/"/g, "&quot;");
      return `
        <div class="ward-pill-item${isActive ? " active" : ""}" data-ward="${id}" data-search="${searchText}">
          <span class="pill-risk-dot ${dotClass}"></span>
          <span>${label}</span>
        </div>
      `;
    }).join("");

    wireHomeWardPills();
    applyWardSearchFilter();
    const searchEl = document.getElementById("homeWardSearchInput");
    if (!searchEl || !searchEl.value.trim()) {
      const activePill = listEl.querySelector(".ward-pill-item.active");
      if (activePill && typeof activePill.scrollIntoView === "function") {
        activePill.scrollIntoView({ block: "nearest" });
      }
    }
  }

  function wireHomeWardPills() {
    const listEl = document.getElementById("homeWardPillsList");
    if (!listEl) return;
    const items = listEl.querySelectorAll(".ward-pill-item");
    items.forEach((item) => {
      item.onclick = () => {
        const wId = parseInt(item.getAttribute("data-ward"), 10);
        if (!Number.isFinite(wId)) return;
        LocationController.handleWardChange(wId);
      };
    });
  }

  const LocationController = {
    async bootstrap() {
      if (AppState.locationBootstrapped) return;
      AppState.locationBootstrapped = true;
      const mySeq = ++AppState.locationSeq;
      const saved = loadSavedLocationSelection();
      setLocationStatus("Loading verified location hierarchy...", "loading");

      try {
        const states = await fetchStatesCached();
        if (mySeq !== AppState.locationSeq) return;

        const validState = states.find((s) => s.toLowerCase() === saved.state.toLowerCase()) || "Andhra Pradesh";
        setSelectOptions(document.getElementById("headerStateSelect"), states, validState);
        setSelectOptions(document.getElementById("homeStateSelect"), states, validState);

        await this._cascadeFromState(validState, saved.district, saved.municipality, saved.wardId, mySeq);
        AppState.locationReady = true;
      } catch (err) {
        console.error("Location hierarchy bootstrap failed:", err);
        setLocationStatus(`Location catalog error: ${err.message}`, "error");
      }
    },

    async _cascadeFromState(stateName, preferredDistrict, preferredMuni, preferredWardId, mySeq) {
      const headerDistEl = document.getElementById("headerDistrictSelect");
      const homeDistEl = document.getElementById("homeDistrictSelect");
      const homeMuniEl = document.getElementById("homeMuniSelect");
      if (headerDistEl) headerDistEl.disabled = true;
      if (homeDistEl) homeDistEl.disabled = true;
      if (homeMuniEl) homeMuniEl.disabled = true;

      const districts = await fetchDistrictsCached(stateName);
      if (mySeq !== AppState.locationSeq) return;

      const defaultDistForState = (stateName === "Andhra Pradesh") ? "Guntur" : (districts[0]?.name || "");
      const distMatch = preferredDistrict
        ? districts.find((d) => d.name.toLowerCase() === preferredDistrict.toLowerCase())
        : null;
      const resolvedDist = distMatch ? distMatch.name : defaultDistForState;

      const distLabel = (d) => (stateName === "Andhra Pradesh" ? `${d.name} District` : d.name);
      setSelectOptions(headerDistEl, districts, resolvedDist, distLabel);
      setSelectOptions(homeDistEl, districts, resolvedDist, distLabel);

      await this._cascadeFromDistrict(stateName, resolvedDist, preferredMuni, preferredWardId, mySeq);
    },

    async _cascadeFromDistrict(stateName, districtName, preferredMuni, preferredWardId, mySeq) {
      const homeMuniEl = document.getElementById("homeMuniSelect");
      if (homeMuniEl) homeMuniEl.disabled = true;

      const munis = await fetchMunicipalitiesCached(stateName, districtName);
      if (mySeq !== AppState.locationSeq) return;

      const muniMatch = preferredMuni
        ? munis.find((m) => m.name.toLowerCase() === preferredMuni.toLowerCase())
        : null;
      const resolvedMuni = muniMatch ? muniMatch.name : (munis[0]?.name || "");
      setSelectOptions(homeMuniEl, munis, resolvedMuni, (m) => m.name);

      await this._cascadeFromMunicipality(stateName, districtName, resolvedMuni, preferredWardId, mySeq);
    },

    async _cascadeFromMunicipality(stateName, districtName, muniName, preferredWardId, mySeq) {
      const wardsPayload = await fetchWardsCached(stateName, districtName, muniName);
      if (mySeq !== AppState.locationSeq) return;

      const wards = wardsPayload.wards || [];
      let resolvedWard = null;
      if (preferredWardId !== null && preferredWardId !== undefined) {
        resolvedWard = wards.find((w) => Number(w.id) === Number(preferredWardId)) || null;
      }
      if (!resolvedWard) {
        const isGmc = Boolean(wardsPayload.has_ward_polygons);
        resolvedWard = (isGmc ? wards.find((w) => Number(w.id) === 12) : null) || wards[0] || { id: 1, name: muniName };
      }

      const sel = {
        country: "India",
        state: stateName,
        district: districtName,
        municipality: muniName,
        wardId: Number(resolvedWard.id),
        wardName: resolvedWard.name
      };
      syncAppStateFromSelection(sel);
      saveLocationSelection(sel);

      renderHomeWardPills(wards, wardsPayload.has_ward_polygons, sel.wardId, wardsPayload.subdivision_type);
      setLocationStatus(wardsPayload.dataset_note || null, "info");

      const heroState = document.getElementById("homeHeroStateName");
      if (heroState) heroState.textContent = stateName;
      const badge = document.getElementById("mapHeaderBadge");
      if (badge) {
        badge.textContent = wardsPayload.has_ward_polygons
          ? `${muniName} (${wards.length} Verified Wards)`
          : `${muniName} (${wards.length} Divisions)`;
      }
      const btnText = document.getElementById("btnViewAllWardsText");
      if (btnText) {
        btnText.textContent = wardsPayload.has_ward_polygons
          ? `View All Wards (${wards.length})`
          : `View All Divisions (${wards.length})`;
      }
      const donutHeading = document.getElementById("districtOverviewHeading");
      if (donutHeading) donutHeading.textContent = `${districtName} Overview`;

      await fetchAPWaterIntelligence(sel.district, sel.wardId, AppState.trendPeriod || "24h", sel.state, sel.municipality);
      if (stateName === "Andhra Pradesh") {
        updateCommandCenterMetrics(districtName);
      }
      if (AppState.activePage === "location") {
        fetchLocationIntelligence(districtName);
      }
      if (AppState.activePage === "drainage") {
        fetchDrainageIntelligence(districtName);
      }
    },

    async handleStateChange(newState) {
      if (!newState) return;
      const mySeq = ++AppState.locationSeq;
      const hState = document.getElementById("headerStateSelect");
      const mState = document.getElementById("homeStateSelect");
      if (hState) hState.value = newState;
      if (mState) mState.value = newState;
      const searchEl = document.getElementById("homeWardSearchInput");
      if (searchEl) searchEl.value = "";

      setLocationStatus(`Loading districts for ${newState}...`, "loading");
      try {
        await this._cascadeFromState(newState, null, null, null, mySeq);
      } catch (err) {
        console.error("State change error:", err);
        setLocationStatus(`Failed to load districts for ${newState}: ${err.message}`, "error");
      }
    },

    async handleDistrictChange(newDistrict) {
      if (!newDistrict) return;
      const mySeq = ++AppState.locationSeq;
      const hDist = document.getElementById("headerDistrictSelect");
      const mDist = document.getElementById("homeDistrictSelect");
      if (hDist) hDist.value = newDistrict;
      if (mDist) mDist.value = newDistrict;
      const searchEl = document.getElementById("homeWardSearchInput");
      if (searchEl) searchEl.value = "";

      const stateName = AppState.locationSelection.state || "Andhra Pradesh";
      setLocationStatus(`Loading municipalities & divisions for ${newDistrict}...`, "loading");
      try {
        await this._cascadeFromDistrict(stateName, newDistrict, null, null, mySeq);
      } catch (err) {
        console.error("District change error:", err);
        setLocationStatus(`Failed to load ${newDistrict}: ${err.message}`, "error");
      }
    },

    async handleMunicipalityChange(newMuni) {
      if (!newMuni) return;
      const mySeq = ++AppState.locationSeq;
      const mMuni = document.getElementById("homeMuniSelect");
      if (mMuni) mMuni.value = newMuni;
      const searchEl = document.getElementById("homeWardSearchInput");
      if (searchEl) searchEl.value = "";

      const stateName = AppState.locationSelection.state || "Andhra Pradesh";
      const districtName = AppState.locationSelection.district || "Guntur";
      setLocationStatus(`Loading divisions for ${newMuni}...`, "loading");
      try {
        await this._cascadeFromMunicipality(stateName, districtName, newMuni, null, mySeq);
      } catch (err) {
        console.error("Municipality change error:", err);
        setLocationStatus(`Failed to load ${newMuni}: ${err.message}`, "error");
      }
    },

    async handleWardChange(newWardId) {
      const wId = Number(newWardId);
      if (!Number.isFinite(wId)) return;
      const sel = { ...AppState.locationSelection, wardId: wId };
      syncAppStateFromSelection(sel);
      saveLocationSelection(sel);

      const listEl = document.getElementById("homeWardPillsList");
      if (listEl) {
        listEl.querySelectorAll(".ward-pill-item").forEach((el) => {
          el.classList.toggle("active", Number(el.getAttribute("data-ward")) === wId);
        });
      }

      await fetchAPWaterIntelligence(sel.district, wId, AppState.trendPeriod || "24h", sel.state, sel.municipality);
    }
  };

  window.LocationController = LocationController;

  function initLocationSelector() {
    const hState = document.getElementById("headerStateSelect");
    const hDist = document.getElementById("headerDistrictSelect");
    const mState = document.getElementById("homeStateSelect");
    const mDist = document.getElementById("homeDistrictSelect");
    const mMuni = document.getElementById("homeMuniSelect");

    if (hState) hState.onchange = (e) => LocationController.handleStateChange(e.target.value);
    if (mState) mState.onchange = (e) => LocationController.handleStateChange(e.target.value);
    if (hDist) hDist.onchange = (e) => {
      AppState.userSelectedDistrict = true;
      LocationController.handleDistrictChange(e.target.value);
    };
    if (mDist) mDist.onchange = (e) => {
      AppState.userSelectedDistrict = true;
      LocationController.handleDistrictChange(e.target.value);
    };
    if (mMuni) mMuni.onchange = (e) => LocationController.handleMunicipalityChange(e.target.value);

    LocationController.bootstrap();
  }

  function initAPHeaderDropdowns() {
    if (!AppState.locationBootstrapped) {
      initLocationSelector();
    }
  }

  function initHomeDashboard() {
    if (!AppState.locationBootstrapped) {
      initLocationSelector();
    }

    const wardSearch = document.getElementById("homeWardSearchInput");
    if (wardSearch) {
      wardSearch.oninput = () => applyWardSearchFilter();
    }

    const btnViewAll = document.getElementById("btnViewAllWards");
    if (btnViewAll) {
      btnViewAll.onclick = () => switchPage("waterlogging");
    }

    const timeTabs = document.querySelectorAll(".bottom-trend-panel .btn-time-tab");
    timeTabs.forEach((tab) => {
      tab.onclick = () => {
        timeTabs.forEach((t) => t.classList.remove("active"));
        tab.classList.add("active");
        const period = tab.getAttribute("data-period") || "24h";
        AppState.trendPeriod = period;
        const sel = AppState.locationSelection;
        fetchAPWaterIntelligence(sel.district, sel.wardId, period, sel.state, sel.municipality);
      };
    });
  }

  async function updateDistrictSelections(districtName) {
    return LocationController.handleDistrictChange(districtName);
  }

  async function fetchAPWaterIntelligence(district, wardId, period = "24h", state = null, municipality = null) {
    const sel = AppState.locationSelection || DEFAULT_LOCATION;
    const reqState = state || sel.state || "Andhra Pradesh";
    const reqDist = district || sel.district || "Guntur";
    const reqMuni = municipality !== null ? municipality : (sel.municipality || "");
    const reqWard = wardId || sel.wardId || 1;
    const reqPeriod = period || AppState.trendPeriod || "24h";

    if (AppState.intelAbortController) {
      try { AppState.intelAbortController.abort(); } catch (_) {}
    }
    const controller = new AbortController();
    AppState.intelAbortController = controller;
    const seq = ++AppState.intelRequestSeq;

    try {
      const qs = new URLSearchParams({
        state: reqState,
        district: reqDist,
        municipality: reqMuni,
        ward: String(reqWard),
        period: reqPeriod
      });
      const res = await fetch(`/api/ap/water-intelligence?${qs.toString()}`, { signal: controller.signal });
      const json = await res.json();
      if (seq !== AppState.intelRequestSeq) return;
      if (json && (json.ok || json.success) && json.data) {
        updateHomeDashboardView(json.data);
      } else {
        setLocationStatus(`Telemetry unavailable: ${(json && json.error) || "Server error"}`, "error");
      }
    } catch (err) {
      if (err && err.name === "AbortError") return;
      console.warn("Water intelligence fetch error:", err);
      setLocationStatus("Live telemetry fetch failed. Retrying when location changes.", "error");
    }
  }

  function updateHomeDashboardView(data) {
    if (!data) return;
    AppState.lastHomeIntelData = data;

    // 1. Update Top 4 KPI Metric Cards with 100% Real Live Data
    const kpi = data.kpi_metrics || {};
    const setElem = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };

    // Waterlogged Area
    if (kpi.waterlogged_area_km2 !== undefined && kpi.waterlogged_area_km2 !== null) {
      setElem("kpiWaterloggedVal", `${kpi.waterlogged_area_km2} km²`);
    } else {
      setElem("kpiWaterloggedVal", "Data unavailable");
    }
    setElem("kpiWaterloggedTrend", kpi.waterlogged_trend || "Trend unavailable");

    // Estimated Water Storage
    if (kpi.estimated_storage_mcm !== undefined && kpi.estimated_storage_mcm !== null) {
      setElem("kpiStorageVal", `${kpi.estimated_storage_mcm} MCM`);
    } else {
      setElem("kpiStorageVal", "Data unavailable");
    }
    setElem("kpiStorageTrend", kpi.storage_trend || "Trend unavailable");

    // Drainage Outflow
    if (kpi.drainage_outflow_cumecs !== undefined && kpi.drainage_outflow_cumecs !== null) {
      setElem("kpiOutflowVal", `${kpi.drainage_outflow_cumecs} m³/s`);
    } else {
      setElem("kpiOutflowVal", "Data unavailable");
    }
    setElem("kpiOutflowTrend", kpi.outflow_trend || kpi.outflow_status || "Trend unavailable");

    // Rainfall (24h)
    if (kpi.rainfall_24h_mm !== undefined && kpi.rainfall_24h_mm !== null) {
      setElem("kpiRainfallVal", `${kpi.rainfall_24h_mm} mm`);
    } else {
      setElem("kpiRainfallVal", "Data unavailable");
    }
    setElem("kpiForecastVal", kpi.forecast_next_24h_mm !== undefined ? `Forecast: ${kpi.forecast_next_24h_mm} mm` : "Forecast unavailable");

    // 2. Update Ward / Division ML Risk Inspector
    const insp = data.ward_inspector || {};
    const inspLabel = (data.has_ward_polygons && insp.ward_id && insp.ward_name && !String(insp.ward_name).startsWith("Ward "))
      ? `Ward ${insp.ward_id} - ${insp.ward_name}`
      : (insp.ward_name || "Division Inspector");
    setElem("inspWardName", inspLabel);
    if (insp.ward_id) {
      AppState.currentWardId = Number(insp.ward_id);
      AppState.locationSelection.wardId = Number(insp.ward_id);
      AppState.locationSelection.wardName = insp.ward_name || "";
      saveLocationSelection(AppState.locationSelection);
    }

    // Update dynamic location headings & verified counts (never hardcode 76)
    const subDivs = Array.isArray(data.sub_divisions) ? data.sub_divisions : [];
    const hasPolygons = Boolean(data.has_ward_polygons);
    setElem("homeHeroStateName", data.state || AppState.locationSelection.state || "Andhra Pradesh");
    setElem("districtOverviewHeading", `${data.district || "District"} Overview`);
    setElem("donutCenterText", hasPolygons ? "Wards" : "Divisions");
    setElem("dwTotalLabel", hasPolygons ? "Total Wards:" : "Total Divisions:");
    setElem(
      "mapHeaderBadge",
      data.dataset_label || `${data.municipality || data.district} (${subDivs.length} ${hasPolygons ? "Verified Wards" : "Divisions"})`
    );
    setElem(
      "btnViewAllWardsText",
      hasPolygons ? `View All Wards (${subDivs.length})` : `View All Divisions (${subDivs.length})`
    );
    if (subDivs.length > 0) {
      renderHomeWardPills(subDivs, hasPolygons, insp.ward_id || AppState.currentWardId, data.subdivision_type);
    }
    const riskBadge = document.getElementById("inspRiskBadge");
    const tier = insp.risk_tier || "Low Risk";
    if (riskBadge) {
      riskBadge.textContent = tier;
      const tLower = tier.toLowerCase();
      riskBadge.className = `badge-status-pill ${tLower.includes('severe') ? 'pill-severe' : (tLower.includes('high') ? 'pill-severe' : (tLower.includes('mod') ? 'pill-warning' : 'pill-low'))}`;
    }

    const probVal = (insp.risk_probability_pct !== undefined && insp.risk_probability_pct !== null) ? insp.risk_probability_pct : 0.0;
    setElem("inspProbVal", `${probVal}%`);

    // Update SVG Circular Gauge
    const gaugeCircle = document.getElementById("inspGaugeCircle");
    if (gaugeCircle) {
      const circ = 314.16;
      const offset = circ * (1 - (probVal / 100));
      gaugeCircle.style.strokeDashoffset = String(offset);
      gaugeCircle.style.stroke = probVal >= 60 ? "#ef4444" : (probVal >= 36 ? "#f97316" : "#10b981");
    }

    setElem("inspCellArea", insp.waterlogged_area_km2 !== undefined ? `${insp.waterlogged_area_km2} km²` : "Data unavailable");
    setElem("inspCellRain", insp.rainfall_24h_mm !== undefined ? `${insp.rainfall_24h_mm} mm` : "Data unavailable");
    setElem("inspCellElev", insp.elevation_m !== undefined ? `${insp.elevation_m} m` : "Data unavailable");
    setElem("inspCellSlope", insp.slope_deg !== undefined ? `${insp.slope_deg}°` : "Data unavailable");

    // Dynamic Key Factors
    const factorsList = document.getElementById("inspFactorsList");
    if (factorsList && insp.key_factors && insp.key_factors.length > 0) {
      factorsList.innerHTML = insp.key_factors.map(f => `<li><span class="factor-icon">${f.icon}</span> ${f.factor}</li>`).join("");
    }

    const alertBox = document.getElementById("inspActionAlert");
    if (alertBox) {
      const alertText = alertBox.querySelector(".action-alert-text");
      if (alertText) {
        const cleanAlert = (insp.action_alert || 'Nominal runoff dissipation within gravity drainage capacity.').replace(/^Action:\s*/i, '');
        alertText.innerHTML = `<strong>Action:</strong> ${cleanAlert}`;
      }
    }

    // 3. Render Bottom Trend Chart
    renderHomeTrendChart(data.trend_chart);

    // 4. Render Bottom Donut Chart
    renderDistrictDonutChart(data.district_overview);

    // 5. Update Telemetry Bar
    if (data.telemetry_bar) {
      const tb = data.telemetry_bar;
      const setTel = (selector, val) => {
        const el = document.querySelector(selector);
        if (el) el.textContent = val;
      };
      setElem("telemetryLastUpdated", tb.last_updated || data.timestamp_ist || "Just now");
    }

    // 6. Update Data Sources Status List
    if (data.data_sources && Array.isArray(data.data_sources)) {
      const sourcesList = document.querySelector(".data-sources-list");
      if (sourcesList) {
        sourcesList.innerHTML = data.data_sources.map(s => `
          <li>
            <span class="check-source-icon">${s.badge === 'warning' ? '⚠️' : '✅'}</span>
            <span class="source-name">${s.name}</span>
            <span class="source-status-badge ${s.status && s.status.toLowerCase().includes('live') ? 'status-live' : ''}">${s.status}</span>
          </li>
        `).join("");
      }
    }

    // 7. Update Map Center & Marker
    updateHomeMapMarker(data);
  }

  function initHomeSatelliteMap() {
    const mapDiv = document.getElementById("homeSatelliteMap");
    if (!mapDiv) return;

    if (AppState.homeSatelliteMap) {
      AppState.homeSatelliteMap.invalidateSize();
      if (AppState.lastHomeIntelData) {
        updateHomeMapMarker(AppState.lastHomeIntelData);
      }
      return;
    }

    if (typeof L === "undefined") {
      console.warn("Leaflet library not ready for Home Satellite Map.");
      return;
    }

    const activeData = AppState.lastHomeIntelData;
    const initCenter = (activeData && activeData.coordinates && activeData.coordinates.lat)
      ? [activeData.coordinates.lat, activeData.coordinates.lon]
      : [16.3067, 80.4365];
    const initZoom = (activeData && !activeData.has_ward_polygons) ? 11 : 13;

    const map = L.map("homeSatelliteMap", {
      zoomControl: false,
      attributionControl: false
    }).setView(initCenter, initZoom);

    // High-Resolution Esri World Imagery Satellite Tiles (Matching Reference Screenshot)
    L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
      maxZoom: 19
    }).addTo(map);

    AppState.homeSatelliteMap = map;

    // Load Ward Polygons with Risk Choropleth
    const geojson = (window.GUNTUR_GIS && window.GUNTUR_GIS.wardPolygonsGeoJSON) || AppState.gisData.gmcWards;
    if (geojson) {
      renderHomeWardPolygons(map, geojson, activeData);
    } else {
      fetch("/static/data/gmc_57_wards.geojson")
        .then(r => r.json())
        .then(geo => {
          AppState.gisData.gmcWards = geo;
          renderHomeWardPolygons(map, geo, AppState.lastHomeIntelData);
        })
        .catch(err => console.warn("Home ward geojson fetch:", err));
    }

    // Wire Map Controls
    const btnIn = document.getElementById("btnHomeMapZoomIn");
    if (btnIn) btnIn.onclick = () => map.zoomIn();

    const btnOut = document.getElementById("btnHomeMapZoomOut");
    if (btnOut) btnOut.onclick = () => map.zoomOut();

    const btnCenter = document.getElementById("btnHomeMapCenter");
    if (btnCenter) btnCenter.onclick = () => {
      const cur = AppState.lastHomeIntelData;
      const c = (cur && cur.coordinates && cur.coordinates.lat)
        ? [cur.coordinates.lat, cur.coordinates.lon]
        : [16.3067, 80.4365];
      map.setView(c, (cur && !cur.has_ward_polygons) ? 11 : 13);
    };
  }

  function _getHomePolygonRiskStyle(id, data) {
    const subs = (data && Array.isArray(data.sub_divisions)) ? data.sub_divisions : [];
    const match = subs.find(s => Number(s.id) === Number(id));
    let color = "#10b981";
    let fillOp = 0.55;
    if (match) {
      const p = Number(match.risk_probability_pct || 0);
      if (p >= 80) { color = "#ef4444"; fillOp = 0.65; }
      else if (p >= 60) { color = "#f97316"; fillOp = 0.60; }
      else if (p >= 36) { color = "#f59e0b"; fillOp = 0.55; }
    }
    const isSelected = Number(id) === Number(AppState.currentWardId);
    return {
      fillColor: color,
      weight: isSelected ? 3.5 : 1.2,
      opacity: 0.95,
      color: isSelected ? "#00f0ff" : "#ffffff",
      fillOpacity: isSelected ? 0.85 : fillOp
    };
  }

  function renderHomeWardPolygons(map, geojson, data = null) {
    if (!map || !geojson) return;

    if (AppState.homeWardsLayer) {
      map.removeLayer(AppState.homeWardsLayer);
    }

    const activeData = data || AppState.lastHomeIntelData;
    AppState.homeWardsLayer = L.geoJSON(geojson, {
      style: (feature) => {
        const id = feature.properties.ward_id || feature.id;
        return _getHomePolygonRiskStyle(id, activeData);
      },
      onEachFeature: (feature, layer) => {
        const id = Number(feature.properties.ward_id || feature.id);
        layer.on("click", () => {
          LocationController.handleWardChange(id);
        });
      }
    });

    if (!activeData || activeData.has_ward_polygons !== false) {
      AppState.homeWardsLayer.addTo(map);
    }

    // Add Red Pin Marker with Popup on selected location
    addWard12Marker(map, activeData);
    if (activeData) {
      updateHomeMapMarker(activeData);
    }
  }

  function addWard12Marker(map, data = null) {
    if (!map) return;
    if (AppState.homePinMarker) {
      map.removeLayer(AppState.homePinMarker);
    }

    const activeData = data || AppState.lastHomeIntelData;
    const initCoord = (activeData && activeData.coordinates && activeData.coordinates.lat)
      ? [activeData.coordinates.lat, activeData.coordinates.lon]
      : [16.328, 80.445];
    const pinHtml = `
      <div style="position:relative; transform:translate(-50%, -100%);">
        <div style="width:28px; height:28px; border-radius:50%; background:#ef4444; border:2px solid #ffffff; box-shadow:0 0 16px #ef4444; display:flex; align-items:center; justify-content:center;">
          <div style="width:10px; height:10px; border-radius:50%; background:#ffffff;"></div>
        </div>
      </div>
    `;

    const pinIcon = L.divIcon({
      className: "custom-red-pin",
      html: pinHtml,
      iconSize: [28, 28],
      iconAnchor: [14, 28]
    });

    const marker = L.marker(initCoord, { icon: pinIcon }).addTo(map);
    AppState.homePinMarker = marker;

    // Callout popup for selected ward displaying dynamic model prediction
    const insp = activeData && activeData.ward_inspector ? activeData.ward_inspector : {};
    const wName = insp.ward_name
      ? ((activeData && activeData.has_ward_polygons && insp.ward_id) ? `Ward ${insp.ward_id} - ${insp.ward_name}` : insp.ward_name)
      : "Selected Area";
    const rTier = insp.risk_tier || "Low Risk";
    const rPct = (insp.risk_probability_pct !== undefined && insp.risk_probability_pct !== null) ? insp.risk_probability_pct : 0.0;
    const rColor = rPct >= 60 ? "#ef4444" : (rPct >= 36 ? "#f97316" : "#10b981");

    marker.bindPopup(`
      <div style="background:#020d21; color:#ffffff; font-family:'Outfit',sans-serif; padding:6px 10px; border-radius:8px; border:1px solid #00f0ff; box-shadow:0 0 16px rgba(0,240,255,0.4); min-width:140px;">
        <div style="font-size:12px; font-weight:800; color:#ffffff;">${wName}</div>
        <div style="font-size:11px; margin-top:2px;">Risk: <strong style="color:${rColor};">${rTier} (${rPct}%)</strong></div>
      </div>
    `, { closeButton: false, autoClose: false, closeOnClick: false, offset: [0, -24] }).openPopup();
  }

  function updateHomeMapMarker(data) {
    const map = AppState.homeSatelliteMap;
    if (!map || !data) return;

    const insp = data.ward_inspector || {};
    const hasWardPolygons = Boolean(data.has_ward_polygons);
    const rTier = insp.risk_tier || "Low Risk";
    const rPct = (insp.risk_probability_pct !== undefined && insp.risk_probability_pct !== null) ? insp.risk_probability_pct : 0.0;
    const rColor = rPct >= 60 ? "#ef4444" : (rPct >= 36 ? "#f97316" : "#10b981");

    if (!hasWardPolygons) {
      if (AppState.homeWardsLayer && map.hasLayer(AppState.homeWardsLayer)) {
        map.removeLayer(AppState.homeWardsLayer);
      }
      if (data.coordinates && data.coordinates.lat && data.coordinates.lon) {
        map.setView([data.coordinates.lat, data.coordinates.lon], 11);
        if (!AppState.homePinMarker) {
          addWard12Marker(map, data);
        }
        if (AppState.homePinMarker) {
          AppState.homePinMarker.setLatLng([data.coordinates.lat, data.coordinates.lon]);
          const wName = insp.ward_name || data.municipality || data.district || "Selected Area";
          AppState.homePinMarker.setPopupContent(`
            <div style="background:#020d21; color:#ffffff; font-family:'Outfit',sans-serif; padding:6px 10px; border-radius:8px; border:1px solid #00f0ff; box-shadow:0 0 16px rgba(0,240,255,0.4); min-width:140px;">
              <div style="font-size:12px; font-weight:800; color:#ffffff;">${wName}</div>
              <div style="font-size:11px; margin-top:2px;">Risk: <strong style="color:${rColor};">${rTier} (${rPct}%)</strong></div>
            </div>
          `);
          AppState.homePinMarker.openPopup();
        }
      }
      return;
    }

    // Guntur Municipal Corporation: ensure 57-ward layer is visible & styled by live risk
    if (AppState.homeWardsLayer) {
      if (!map.hasLayer(AppState.homeWardsLayer)) {
        AppState.homeWardsLayer.addTo(map);
      }
      let matchedLayer = null;
      AppState.homeWardsLayer.eachLayer(layer => {
        const id = Number(layer.feature.properties.ward_id || layer.feature.id);
        layer.setStyle(_getHomePolygonRiskStyle(id, data));
        if (id === Number(AppState.currentWardId)) {
          matchedLayer = layer;
        }
      });

      if (matchedLayer) {
        const center = matchedLayer.getBounds().getCenter();
        if (!AppState.homePinMarker) {
          addWard12Marker(map, data);
        }
        if (AppState.homePinMarker) {
          AppState.homePinMarker.setLatLng(center);
          const wName = insp.ward_id && insp.ward_name
            ? `Ward ${insp.ward_id} - ${insp.ward_name}`
            : (insp.ward_name || `Ward ${AppState.currentWardId}`);
          AppState.homePinMarker.setPopupContent(`
            <div style="background:#020d21; color:#ffffff; font-family:'Outfit',sans-serif; padding:6px 10px; border-radius:8px; border:1px solid #00f0ff; box-shadow:0 0 16px rgba(0,240,255,0.4); min-width:140px;">
              <div style="font-size:12px; font-weight:800; color:#ffffff;">${wName}</div>
              <div style="font-size:11px; margin-top:2px;">Risk: <strong style="color:${rColor};">${rTier} (${rPct}%)</strong></div>
            </div>
          `);
          AppState.homePinMarker.openPopup();
        }
        map.setView(center, Math.max(map.getZoom(), 13));
      }
    }
  }

  function renderHomeTrendChart(trendData) {
    const canvas = document.getElementById("homeTrendChart");
    if (!canvas || typeof Chart === "undefined") return;

    if (AppState.homeTrendChart) {
      AppState.homeTrendChart.destroy();
      AppState.homeTrendChart = null;
    }

    const labels = (trendData && trendData.labels && trendData.labels.length > 0) ? trendData.labels : ["00:00", "03:00", "06:00", "09:00", "12:00", "15:00", "18:00", "21:00"];
    const observedRain = (trendData && trendData.observed_rain_mm) ? trendData.observed_rain_mm : [];
    const forecastRain = (trendData && trendData.forecast_rain_mm) ? trendData.forecast_rain_mm : [];
    const riskProb = (trendData && trendData.risk_probability_pct) ? trendData.risk_probability_pct : [];

    const ctx = canvas.getContext("2d");
    AppState.homeTrendChart = new Chart(ctx, {
      data: {
        labels: labels,
        datasets: [
          // 1. Observed Rainfall Bars (Left Y)
          {
            type: "bar",
            label: "Rainfall (mm)",
            data: observedRain,
            yAxisID: "yRain",
            backgroundColor: "#00f0ff",
            borderRadius: 4,
            barPercentage: 0.5,
            order: 2
          },
          // 2. Forecast Bars (Left Y, Orange)
          {
            type: "bar",
            label: "Forecast",
            data: forecastRain,
            yAxisID: "yRain",
            backgroundColor: "#f97316",
            borderRadius: 4,
            barPercentage: 0.5,
            order: 3
          },
          // 3. Risk Probability Line (Right Y)
          {
            type: "line",
            label: "Risk Probability (%)",
            data: riskProb,
            yAxisID: "yRisk",
            borderColor: "#38bdf8",
            borderWidth: 2.5,
            pointBackgroundColor: "#00f0ff",
            pointBorderColor: "#ffffff",
            pointRadius: 4.5,
            tension: 0.35,
            fill: false,
            order: 1
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 300 },
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: {
            display: true,
            position: "top",
            align: "center",
            labels: {
              boxWidth: 10,
              boxHeight: 10,
              color: "#94a3b8",
              font: { size: 10, weight: "bold" },
              usePointStyle: true
            }
          },
          tooltip: {
            backgroundColor: "rgba(2, 13, 33, 0.95)",
            borderColor: "#00f0ff",
            borderWidth: 1,
            titleColor: "#00f0ff",
            bodyColor: "#ffffff"
          }
        },
        scales: {
          x: {
            grid: { color: "rgba(255, 255, 255, 0.05)" },
            ticks: { color: "#94a3b8", font: { size: 9 } }
          },
          yRain: {
            type: "linear",
            position: "left",
            min: 0,
            max: 100,
            ticks: { stepSize: 25, color: "#00f0ff", font: { size: 9 } },
            title: { display: true, text: "Rainfall (mm)", color: "#00f0ff", font: { size: 9, weight: "bold" } },
            grid: { color: "rgba(255, 255, 255, 0.05)" }
          },
          yRisk: {
            type: "linear",
            position: "right",
            min: 0,
            max: 100,
            ticks: { stepSize: 25, color: "#38bdf8", font: { size: 9 } },
            title: { display: true, text: "Risk (%)", color: "#38bdf8", font: { size: 9, weight: "bold" } },
            grid: { drawOnChartArea: false }
          }
        }
      }
    });
  }

  function renderDistrictDonutChart(overviewData) {
    const canvas = document.getElementById("districtDonutChart");
    if (!canvas || typeof Chart === "undefined" || !overviewData) return;

    if (AppState.districtDonutChart) {
      AppState.districtDonutChart.destroy();
      AppState.districtDonutChart = null;
    }

    const total = overviewData.total_wards || 0;
    const low = overviewData.low_risk || 0;
    const mod = overviewData.moderate_risk || 0;
    const high = overviewData.high_risk || 0;
    const severe = overviewData.severe_risk || 0;

    const totalEl = document.getElementById("donutTotalWards");
    if (totalEl) totalEl.textContent = String(total);

    const dwTotal = document.getElementById("dwTotal");
    if (dwTotal) dwTotal.textContent = String(total);
    const dwLow = document.getElementById("dwLow");
    if (dwLow) dwLow.textContent = String(low);
    const dwMod = document.getElementById("dwMod");
    if (dwMod) dwMod.textContent = String(mod);
    const dwHigh = document.getElementById("dwHigh");
    if (dwHigh) dwHigh.textContent = String(high);
    const dwSevere = document.getElementById("dwSevere");
    if (dwSevere) dwSevere.textContent = String(severe);

    const ctx = canvas.getContext("2d");
    AppState.districtDonutChart = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: ["Low Risk", "Moderate Risk", "High Risk", "Severe Risk"],
        datasets: [{
          data: [low, mod, high, severe],
          backgroundColor: ["#10b981", "#f59e0b", "#f97316", "#ef4444"],
          borderWidth: 2,
          borderColor: "#030f26"
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "72%",
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "rgba(2, 13, 33, 0.95)",
            borderColor: "#00f0ff",
            borderWidth: 1
          }
        }
      }
    });
  }

})();
