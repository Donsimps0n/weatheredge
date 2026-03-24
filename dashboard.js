/* ===== WeatherEdge v2 Dashboard Logic ===== */
/* Change this URL when v2 API is deployed */
const API = 'https://weatheredge-bot-v2-production.up.railway.app';

/* ---- Sidebar Navigation ---- */
window._st = function(tab, btn) {
  document.querySelectorAll('[id^="tab-"]').forEach(function(el){ el.style.display='none'; });
  var t = document.getElementById('tab-' + tab);
  if (t) t.style.display = 'block';
  var nav = document.querySelectorAll('[onclick*="_st"]');
  nav.forEach(function(b){ b.style.opacity='0.5'; });
  if (btn) btn.style.opacity = '1';
};

/* ---- Activity Log ---- */
function addLog(msg) {
  var log = document.getElementById('activity-log');
  if (!log) return;
  if (log.textContent.indexOf('Waiting') !== -1) log.innerHTML = '';
  var ts = new Date().toLocaleTimeString();
  log.innerHTML += '<div style="padding:2px 0;color:#94a3b8;font-family:monospace;font-size:13px">' + ts + '  ' + msg + '</div>';
  log.scrollTop = log.scrollHeight;
}

/* ---- Scan Markets ---- */
function scanMarkets() {
  var btn = document.querySelector('[onclick="scanMarkets()"]');
  if (btn) btn.innerHTML = '&#9202; Scanning...';
  addLog('Scanning Polymarket weather markets...');
  fetch(API + '/api/scan', {method: 'POST'})
    .then(function(r){ return r.json(); })
    .then(function(data){
      var edges = data.edges || [];
      var liveEdges = edges.filter(function(e){ return Math.abs(e.best_edge) >= 0.02; });
      var em = document.getElementById('stat-markets');
      if (em) em.textContent = data.count || data.cache_size || 0;
      var ee = document.getElementById('stat-edge');
      if (ee) ee.textContent = edges.length;
      var el = document.getElementById('stat-live');
      if (el) el.textContent = liveEdges.length;
      /* Update theo EV stat if present */
      var tevEl = document.getElementById('stat-theo-ev');
      if (tevEl && edges.length > 0) {
        var maxEv = Math.max.apply(null, edges.map(function(e){ return e.theoretical_full_ev || e.best_edge || 0; }));
        tevEl.textContent = (maxEv * 100).toFixed(1) + '%';
      }
      /* Markets tab counters */
      var mt = document.getElementById('markets-total');
      if (mt) mt.textContent = data.cache_size || data.count || 0;
      var mp = document.getElementById('m-parsed');
      if (mp) mp.textContent = data.cache_size || 0;
      var mf = document.getElementById('m-forecasted');
      if (mf) mf.textContent = data.count || 0;
      var me = document.getElementById('m-edge');
      if (me) me.textContent = edges.length;
      /* Show edges in analysis panel */
  var ao = document.getElementById('analysis-output');
  if(ao && edges.length) {
    ao.innerHTML = edges.slice(0,15).map(function(e) {
      var tp = _getTokenPrices(e);
      var yesP = tp.yes ? (tp.yes * 100).toFixed(1) : '-';
      var noP = tp.no ? (tp.no * 100).toFixed(1) : '-';
      var title = _parseSlug(e.slug) || e.question || e.city || 'Market';
      var city = e.city || '';
      var cat = e.category || e.regime || '';
      var catLabel = cat === 'high_temp' ? 'HIGH TEMP' : cat === 'low_temp' ? 'LOW TEMP' : cat.toUpperCase();
      var catColor = cat === 'high_temp' ? '#ef4444' : cat === 'low_temp' ? '#3b82f6' : '#f59e0b';
      var side = (tp.yes < 0.5) ? 'YES' : 'NO';
      var sideColor = side === 'YES' ? '#10b981' : '#ef4444';
      var edge = Math.abs(0.5 - tp.yes) * 100;
      var edgePct = edge.toFixed(1);
      var endDate = _fmtDate(e.end_date_iso || e.end_date);
      return '<div style="padding:10px 14px;border-bottom:1px solid #1e293b;display:grid;grid-template-columns:1fr auto;align-items:center;gap:8px">' +
        '<div>' +
          '<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">' +
            '<b style="color:#e2e8f0;font-size:14px">' + city + '</b>' +
            '<span style="background:' + catColor + ';color:#fff;font-size:10px;padding:2px 6px;border-radius:4px;font-weight:600">' + catLabel + '</span>' +
            (endDate ? '<span style="color:#64748b;font-size:11px">' + endDate + '</span>' : '') +
          '</div>' +
          '<div style="color:#94a3b8;font-size:12px">' + title + '</div>' +
        '</div>' +
        '<div style="text-align:right;white-space:nowrap">' +
          '<span style="color:#94a3b8;font-size:10px">YES</span> ' +
          '<span style="color:#10b981;font-size:15px;font-weight:600">' + yesP + '\u00A2</span>' +
          '<span style="color:#334155;margin:0 4px">|</span>' +
          '<span style="color:#94a3b8;font-size:10px">NO</span> ' +
          '<span style="color:#ef4444;font-size:15px;font-weight:600">' + noP + '\u00A2</span>' +
          '<div style="font-size:10px;color:' + sideColor + '">' + side + ' ' + edgePct + '% edge</div>' +
        '</div>' +
      '</div>';
    }).join('');
  } else if(ao) {
    ao.innerHTML = '<div style="color:#6b7b8d;padding:16px">No edges found in current scan</div>';
  }
      /* Markets list */
      var ml = document.getElementById('market-list');
      if (ml && edges.length > 0) {
        ml.innerHTML = edges.map(function(e){
          var ev = e.theoretical_full_ev || e.best_edge || 0;
          return '<tr><td style="padding:6px;color:#e2e8f0">' + (e.question || e.city) + '</td>'
            + '<td style="padding:6px;color:#22c55e">' + (ev*100).toFixed(1) + '%</td>'
            + '<td style="padding:6px">' + (e.best_side||'-') + '</td>'
            + '<td style="padding:6px">' + (e.yes_price||'-') + '</td></tr>';
        }).join('');
      }
      addLog('Scan complete: ' + (data.cache_size||data.count||0) + ' markets, ' + edges.length + ' edges, ' + liveEdges.length + ' live');
    })
    .catch(function(err){
      addLog('Scan error: ' + err.message);
      var ao = document.getElementById('analysis-output');
      if (ao) ao.innerHTML = '<div style="color:#ef4444;padding:12px">Scan failed: ' + err.message + '</div>';
    })
    .finally(function(){
      var btn = document.querySelector('[onclick="scanMarkets()"]');
      if (btn) btn.innerHTML = '&#128269; Scan Markets';
    });
}

/* ---- Toggle Bot ---- */
var _botOn = false;
function toggleBot(){
  var tx=document.getElementById('btn-start-text');
  var bt=document.getElementById('btn-start');
  if(tx.textContent.trim()==='Start Bot'){
    tx.textContent='Stop Bot';
    bt.style.background='linear-gradient(135deg,#ef4444,#dc2626)';
    addLog('Bot started - scanning every 60s');
    scanMarkets();
    window._botInterval=setInterval(function(){ scanMarkets(); },60000);
  } else {
    tx.textContent='Start Bot';
    bt.style.background='linear-gradient(135deg,#22c55e,#16a34a)';
    if(window._botInterval){clearInterval(window._botInterval);window._botInterval=null;}
    addLog('Bot stopped');
  }
}

/* ---- Set Trading Mode ---- */
function setMode(btn, mode) {
  var all = btn.parentElement.querySelectorAll('button');
  all.forEach(function(b){ b.style.background='transparent'; b.style.borderColor='#374151'; b.style.color='#94a3b8'; });
  btn.style.borderColor = '#22c55e';
  btn.style.color = '#22c55e';
  addLog('Mode: ' + mode);
}

/* ---- Analyze Top 15 ---- */
function analyzeTop15() { scanMarkets(); }

/* ---- Load initial data ---- */
function _boot(){
  // Trading Status
  fetch(API+'/api/trading/status').then(function(r){return r.json();}).then(function(data){
    var sm=document.getElementById('stat-markets');
    if(sm) sm.textContent=data.trading_enabled?'LIVE':'OFF';
    var se=document.getElementById('stat-edge');
    if(se) se.textContent=data.credentials_active?'Active':'Inactive';
    var sl=document.getElementById('stat-live');
    if(sl) sl.textContent=data.recent_trades||0;
    var mb=document.getElementById('model-badges');
    if(mb) mb.innerHTML='<span class="badge">v2</span>';
    addLog('API connected - trading '+(data.trading_enabled?'enabled':'disabled'));
  }).catch(function(e){addLog('API connection failed: '+e.message);});

  // Signals (positions)
  fetch(API+'/api/signals').then(function(r){return r.json();}).then(function(data){
    var pc=document.getElementById('pos-count');
    if(pc) pc.textContent=data.count||0;
    var op=document.getElementById('open-positions');
    if(op){
      if(!data.signals||data.signals.length===0){
        op.innerHTML='<div class="empty">No active signals</div>';
      } else {
        op.innerHTML=data.signals.map(function(s){
          return '<div class="pos-row"><span>'+s.question+'</span><span>'+((s.edge*100).toFixed(1))+'%</span></div>';
        }).join('');
      }
    }
  }).catch(function(e){addLog('Signals fetch failed: '+e.message);});

  // Trade Log (history)
  fetch(API+'/api/trading/log').then(function(r){return r.json();}).then(function(data){
    var th=document.getElementById('trade-history');
    if(th){
      if(!data.trades||data.trades.length===0){
        th.innerHTML='<div class="empty">No trades yet</div>';
      } else {
        th.innerHTML=data.trades.slice(-20).reverse().map(function(t){
          return '<div class="trade-row"><span>'+(t.question||t.market||'Trade')+'</span><span>$'+(t.amount||0)+'</span><span>'+new Date(t.ts*1000).toLocaleString()+'</span></div>';
        }).join('');
      }
    }
  }).catch(function(e){addLog('Trade log fetch failed: '+e.message);});

  // Leaderboard placeholder
  var lb=document.getElementById('lb-body');
  if(lb) lb.innerHTML='<tr><td colspan="4">Leaderboard not available in v2</td></tr>';
}
_boot();


// ============================================================
// Live Signals - Real API Data
// ============================================================


/* Global helpers shared by scanMarkets edge display and populateSignals */
function _parseSlug(slug) {
  if(!slug) return '';
  var s = slug.replace(/-/g, ' ');
  s = s.replace(/\b\w/g, function(c) { return c.toUpperCase(); });
  s = s.replace(/Highest Temperature In /i, 'High Temp ');
  s = s.replace(/Lowest Temperature In /i, 'Low Temp ');
  s = s.replace(/ On /, ' \u00B7 ');
  s = s.replace(/(\d+)forabove/i, '\u2265$1\u00B0F');
  s = s.replace(/(\d+)forbelow/i, '\u2264$1\u00B0F');
  s = s.replace(/(\d+)corhigher/i, '\u2265$1\u00B0C');
  s = s.replace(/(\d+)corbelow/i, '\u2264$1\u00B0C');
  s = s.replace(/(\d+)c(?:\s|$)/i, '$1\u00B0C ');
  s = s.replace(/(\d+)f(?:\s|$)/i, '$1\u00B0F ');
  return s;
}
function _getTokenPrices(m) {
  var yes = 0, no = 0;
  if(m.tokens && m.tokens.length) {
    m.tokens.forEach(function(t) {
      var p = parseFloat(t.price) || 0;
      if(t.outcome === 'Yes') yes = p;
      if(t.outcome === 'No') no = p;
    });
  }
  return {yes: yes, no: no};
}
function _fmtDate(d) {
  if(!d) return '';
  try {
    var dt = new Date(d);
    var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return months[dt.getMonth()] + ' ' + dt.getDate();
  } catch(e) { return ''; }
}

function populateSignals(markets) {
  var sigCount = document.getElementById("sig-count");
  var sigAvg = document.getElementById("sig-avg-ev");
  var sigHigh = document.getElementById("sig-high");
  var sigMkts = document.getElementById("sig-markets");
  var sigList = document.getElementById("signals-list");
  var badge = document.getElementById("signals-scan-badge");

  if (sigCount) sigCount.textContent = markets.length;
  if (sigMkts) sigMkts.textContent = markets.length;
  if (badge) { badge.textContent = "LIVE"; badge.style.background = "#10b981"; }

  function parseSlug(slug) {
    if (!slug) return "";
    var s = slug.replace(/-/g, " ");
    s = s.replace(/\b\w/g, function(c){ return c.toUpperCase(); });
    s = s.replace(/Highest Temperature In /i, "High Temp ");
    s = s.replace(/Lowest Temperature In /i, "Low Temp ");
    s = s.replace(/ On /, " \u00B7 ");
        s = s.replace(/(\d+)forabove$/i, "\u2265$1\u00B0F");
    s = s.replace(/(\d+)forbelow$/i, "\u2264$1\u00B0F");
    s = s.replace(/(\d+)corhigher$/i, "\u2265$1\u00B0C");
    s = s.replace(/(\d+)corbelow$/i, "\u2264$1\u00B0C");
    s = s.replace(/ (\d+)c$/i, " $1\u00B0C");
    s = s.replace(/ (\d+)f$/i, " $1\u00B0F");
    return s;
  }

  function getTokenPrices(m) {
    var yes = 0, no = 0;
    if (m.tokens && m.tokens.length >= 2) {
      m.tokens.forEach(function(t) {
        var p = parseFloat(t.price) || 0;
        if (t.outcome === "Yes") yes = p;
        if (t.outcome === "No") no = p;
      });
    }
    return { yes: yes, no: no };
  }

  function fmtDate(d) {
    if (!d) return "";
    try {
      var dt = new Date(d);
      var months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      return months[dt.getMonth()] + " " + dt.getDate();
    } catch(e) { return ""; }
  }

  var totalEdge = 0, bestEdge = 0;
  markets.forEach(function(m) {
    var tp = getTokenPrices(m);
    var edge = Math.abs(tp.yes - 0.5);
    totalEdge += edge;
    if (edge > bestEdge) bestEdge = edge;
  });
  var avgEdge = markets.length > 0 ? (totalEdge / markets.length * 100).toFixed(1) : "0";
  if (sigAvg) sigAvg.textContent = avgEdge + "%";
  if (sigHigh) sigHigh.textContent = (bestEdge * 100).toFixed(1) + "%";

  if (!sigList) return;
  if (markets.length === 0) {
    sigList.innerHTML = '<div style="text-align:center;padding:2rem;color:#94a3b8">No signals found. Run a scan first.</div>';
    return;
  }

  var html = "";
  markets.slice(0, 50).forEach(function(m) {
    var city = m.city || "?";
    var station = m.station || "";
    var cat = m.category || "";
    var catLabel = cat === "high_temp" ? "HIGH TEMP" : cat === "low_temp" ? "LOW TEMP" : cat.toUpperCase();
    var catColor = cat === "high_temp" ? "#ef4444" : cat === "low_temp" ? "#3b82f6" : "#f59e0b";
    var catBg = cat === "high_temp" ? "rgba(239,68,68,0.15)" : cat === "low_temp" ? "rgba(59,130,246,0.15)" : "rgba(245,158,11,0.15)";
    var tp = getTokenPrices(m);
    var yesPrice = tp.yes > 0 ? (tp.yes * 100).toFixed(1) + "\u00A2" : "--";
    var noPrice = tp.no > 0 ? (tp.no * 100).toFixed(1) + "\u00A2" : "--";
    var title = parseSlug(m.slug);
    var endDate = fmtDate(m.end_date);
    var conf = m.confidence || 0;
    var confBar = Math.min(conf, 5);
    var confDots = "";
    for (var i = 0; i < 5; i++) {
      confDots += '<span style="display:inline-block;width:7px;height:7px;border-radius:50%;margin:0 1px;background:' + (i < confBar ? "#10b981" : "#334155") + '"></span>';
    }
    var side = tp.yes < 0.5 ? "YES" : "NO";
    var sideColor = side === "YES" ? "#10b981" : "#ef4444";
    var edge = Math.abs(tp.yes - 0.5);
    var edgePct = (edge * 100).toFixed(1);

    html += '<div class="signal-card" data-side="' + side + '" data-conf="' + conf + '" style="background:linear-gradient(135deg,#1e293b 0%,#0f172a 100%);border:1px solid #334155;border-left:3px solid ' + catColor + ';border-radius:12px;padding:0.85rem 1rem;margin-bottom:0.6rem;display:grid;grid-template-columns:1fr auto auto;gap:0.75rem;align-items:center">';
    html += '<div style="min-width:0">';
    html += '<div style="display:flex;align-items:center;gap:6px;margin-bottom:3px">';
    html += '<span style="font-weight:700;color:#f1f5f9;font-size:0.95rem">' + city + '</span>';
    html += '<span style="background:' + catBg + ';color:' + catColor + ';font-size:0.65rem;padding:2px 6px;border-radius:4px;font-weight:600">' + catLabel + '</span>';
    if (endDate) html += '<span style="color:#64748b;font-size:0.7rem">' + endDate + '</span>';
    html += '</div>';
    html += '<div style="color:#94a3b8;font-size:0.75rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="' + (m.slug || "") + '">' + (title || station) + '</div>';
    html += '</div>';

    html += '<div style="text-align:center;min-width:90px">';
    html += '<div style="display:flex;gap:8px;justify-content:center">';
    html += '<div><div style="color:#64748b;font-size:0.6rem;text-transform:uppercase;letter-spacing:0.5px">Yes</div><div style="color:#10b981;font-weight:700;font-size:1rem">' + yesPrice + '</div></div>';
    html += '<div style="width:1px;background:#334155"></div>';
    html += '<div><div style="color:#64748b;font-size:0.6rem;text-transform:uppercase;letter-spacing:0.5px">No</div><div style="color:#ef4444;font-weight:700;font-size:1rem">' + noPrice + '</div></div>';
    html += '</div>';
    html += '<div style="color:' + sideColor + ';font-size:0.65rem;font-weight:600;margin-top:2px">' + side + " " + edgePct + '% edge</div>';
    html += '</div>';

    html += '<div style="text-align:right;min-width:60px">';
    html += '<div style="margin-bottom:3px">' + confDots + '</div>';
    html += '<div style="color:#64748b;font-size:0.65rem">' + conf + '/5 conf</div>';
    html += '</div>';
    html += '</div>';
  });

  sigList.innerHTML = html;
  window._signalMarkets = markets;
}


// Auto-fetch signals when page loads and after each scan
// Auto-scan on page load - populates Live Signals with real API data
(function() {
  // Wrap scanMarkets button to also populate signals
  var _origScan = window.scanMarkets;
  window.scanMarkets = function() {
    if (_origScan) _origScan();
    setTimeout(function() {
      fetch(API + "/api/scan", {method: "POST"})
        .then(function(r) { return r.json(); })
        .then(function(data) {
          if (data.markets && data.markets.length > 0) populateSignals(data.markets);
        })
        .catch(function(e) { console.log("[WE] Scan populate error:", e); });
    }, 500);
  };

  function autoScan() {
    console.log("[WE] Auto-scan starting...");
    var badge = document.getElementById("signals-scan-badge");
    if (badge) { badge.textContent = "SCANNING..."; badge.style.background = "#64748b"; }
    fetch(API + "/api/scan", {method: "POST"})
      .then(function(r) { return r.json(); })
      .then(function(data) {
        console.log("[WE] Auto-scan got " + (data.markets ? data.markets.length : 0) + " markets");
        if (data.markets && data.markets.length > 0) {
          populateSignals(data.markets);
        } else {
          if (badge) { badge.textContent = "NO DATA"; badge.style.background = "#ef4444"; }
        }
      })
      .catch(function(e) {
        console.log("[WE] Auto-scan failed:", e);
        if (badge) { badge.textContent = "ERROR"; badge.style.background = "#ef4444"; }
      });
  }

  // Use window.onload to ensure all scripts are ready
  if (document.readyState === "complete") {
    setTimeout(autoScan, 1500);
  } else {
    window.addEventListener("load", function() { setTimeout(autoScan, 1500); });
  }
})();
