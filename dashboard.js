
// Alias for sidebar tab switching - triggers fresh scan
function loadSignals() { scanMarkets(); }

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
  var sigCount = document.getElementById('sig-count');
  var sigAvg = document.getElementById('sig-avg-ev');
  var sigHigh = document.getElementById('sig-high');
  var sigMkts = document.getElementById('sig-markets');
  var sigList = document.getElementById('signals-list');
  var badge = document.getElementById('signals-scan-badge');

  // --- Compute real stats from token prices ---
  var totalEdge = 0;
  var maxEdge = 0;
  var highAgreement = 0;
  markets.forEach(function(m) {
    var p = _getTokenPrices(m);
    var yesEdge = (0.5 - p.yes) * 100;
    var noEdge = (0.5 - p.no) * 100;
    var edge = Math.max(yesEdge, noEdge);
    if (edge < 0) edge = 0;
    totalEdge += edge;
    if (edge > maxEdge) maxEdge = edge;
    if (m.confidence >= 3) highAgreement++;
  });
  var avgEdge = markets.length > 0 ? totalEdge / markets.length : 0;

  // --- Update stat cards ---
  if (sigCount) sigCount.textContent = markets.length;
  if (sigMkts) sigMkts.textContent = markets.length;
  if (sigAvg) sigAvg.textContent = '+' + avgEdge.toFixed(1) + '%';
  if (sigHigh) sigHigh.textContent = 'HIGH';
  if (badge) { badge.textContent = '\u25CF SCANNING LIVE'; badge.style.background = '#166534'; badge.style.color = '#4ade80'; badge.style.border = '1px solid #22c55e44'; badge.style.padding = '4px 12px'; badge.style.borderRadius = '20px'; badge.style.fontSize = '11px'; badge.style.fontWeight = '700'; badge.style.letterSpacing = '0.04em'; }

  // --- Helper: time remaining ---
  function timeLeft(endDate) {
    if (!endDate) return '';
    try {
      var end = new Date(endDate);
      var now = new Date();
      var diff = end - now;
      if (diff <= 0) return 'Closed';
      var hrs = Math.floor(diff / 3600000);
      if (hrs >= 24) return Math.floor(hrs / 24) + 'd ' + (hrs % 24) + 'h';
      return hrs + 'h';
    } catch(e) { return ''; }
  }

  // --- Helper: build Polymarket URL from slug ---
  function polyUrl(slug) {
    return 'https://polymarket.com/event/' + (slug || '');
  }

  // --- Helper: category label ---
  function catLabel(cat) {
    if (!cat) return 'WEATHER';
    if (cat === 'high_temp') return 'HIGH TEMP';
    if (cat === 'low_temp') return 'LOW TEMP';
    if (cat === 'precipitation') return 'PRECIP';
    return cat.toUpperCase().replace(/_/g, ' ');
  }

  // --- Helper: category color ---
  function catColor(cat) {
    if (cat === 'high_temp') return '#dc2626';
    if (cat === 'low_temp') return '#2563eb';
    if (cat === 'precipitation') return '#0891b2';
    return '#7c3aed';
  }

  // --- Helper: generate full market question from slug ---
  function buildQuestion(m) {
    if (!m.slug) return '';
    var s = m.slug.replace(/-/g, ' ');
    // Capitalize first letter of each word
    s = s.replace(/\b\w/g, function(c) { return c.toUpperCase(); });
    // Convert to question form
    s = s.replace(/^Highest Temperature In /i, 'Will the highest temperature in ');
    s = s.replace(/^Lowest Temperature In /i, 'Will the lowest temperature in ');
    // Handle temperature thresholds
    s = s.replace(/(\d+)forabove/i, '$1\u00B0F or higher');
    s = s.replace(/(\d+)forbelow/i, 'below $1\u00B0F');
    s = s.replace(/(\d+)corhigher/i, '$1\u00B0C or higher');
    s = s.replace(/(\d+)corbelow/i, 'below $1\u00B0C');
    s = s.replace(/(\d+)c(?:\s|$)/i, '$1\u00B0C ');
    s = s.replace(/(\d+)f(?:\s|$)/i, '$1\u00B0F ');
    // Add question mark
    if (s.indexOf('Will') === 0 && s.indexOf('?') < 0) {
      // Find the date part: "On March 25 2026"
      s = s.replace(/ On (.*?)(\d{4})\s*(.*)/i, ' on $1$2 be $3?');
      if (s.indexOf('?') < 0) s += '?';
    }
    return s;
  }

  // --- Build elite signal cards ---
  var html = '';
  markets.forEach(function(m, idx) {
    var p = _getTokenPrices(m);
    var yesPrice = p.yes;
    var noPrice = p.no;
    var yesCents = (yesPrice * 100).toFixed(1);
    var noCents = (noPrice * 100).toFixed(1);

    // Determine edge and side
    var yesEdge = (0.5 - yesPrice) * 100;
    var noEdge = (0.5 - noPrice) * 100;
    var side, edge, sidePrice;
    if (yesEdge >= noEdge) {
      side = 'YES'; edge = yesEdge; sidePrice = yesPrice;
    } else {
      side = 'NO'; edge = noEdge; sidePrice = noPrice;
    }
    if (edge < 0) edge = 0;
    var theoEv = edge;

    // Kelly stake (fractional kelly 0.25)
    var kellyFrac = 0;
    if (sidePrice > 0 && sidePrice < 1) {
      var impliedProb = sidePrice;
      var ourProb = impliedProb + (edge / 100);
      if (ourProb > 0.99) ourProb = 0.99;
      var odds = (1 / sidePrice) - 1;
      if (odds > 0) {
        kellyFrac = ((ourProb * odds) - (1 - ourProb)) / odds;
        if (kellyFrac < 0) kellyFrac = 0;
        kellyFrac = kellyFrac * 0.25; // quarter kelly
      }
    }
    var kellyPct = (kellyFrac * 100).toFixed(1);
    var kellyOn1k = Math.round(kellyFrac * 1000);

    // Probability estimate
    var ourProb = Math.min(99, Math.round((sidePrice + edge / 100) * 100));

    // Model agreement from confidence
    var confPct = m.confidence ? Math.round((m.confidence / 5) * 100) : 60;
    var confLabel = confPct >= 80 ? 'VERY HIGH' : confPct >= 60 ? 'HIGH' : confPct >= 40 ? 'MODERATE' : 'LOW';
    var confColor = confPct >= 80 ? '#22c55e' : confPct >= 60 ? '#eab308' : confPct >= 40 ? '#f97316' : '#ef4444';

    // Edge color
    var edgeColor = theoEv >= 40 ? '#22c55e' : theoEv >= 15 ? '#22c55e' : theoEv >= 5 ? '#eab308' : '#f97316';

    // Time left
    var tl = timeLeft(m.end_date);

    // Category
    var cl = catLabel(m.category);
    var cc = catColor(m.category);

    // Question
    var question = buildQuestion(m);

    // Side badge
    var sideBadge = side === 'YES'
      ? '<span style="display:inline-flex;align-items:center;gap:4px;background:#14532d;color:#4ade80;padding:3px 10px;border-radius:4px;font-size:11px;font-weight:700;letter-spacing:0.04em;">\u2191 BUY YES</span>'
      : '<span style="display:inline-flex;align-items:center;gap:4px;background:#7f1d1d;color:#fca5a5;padding:3px 10px;border-radius:4px;font-size:11px;font-weight:700;letter-spacing:0.04em;">\u2193 BUY NO</span>';

    html += '<div style="background:linear-gradient(135deg,#0f172a 0%,#1a2332 100%);border:1px solid #1e3a5f;border-radius:12px;padding:18px 22px;margin-bottom:10px;transition:border-color 0.2s,box-shadow 0.2s;" onmouseenter="this.style.borderColor=\'#3b82f6\';this.style.boxShadow=\'0 0 24px rgba(59,130,246,0.12)\';" onmouseleave="this.style.borderColor=\'#1e3a5f\';this.style.boxShadow=\'none\';">';

    // Row 1: Side badge + Theo EV
    html += '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;">';
    html += sideBadge;
    html += '<div style="text-align:right;"><span style="font-size:24px;font-weight:800;color:' + edgeColor + ';font-family:monospace;letter-spacing:-0.02em;">+' + theoEv.toFixed(1) + '%</span><div style="font-size:10px;color:#64748b;letter-spacing:0.08em;margin-top:1px;">THEO EV</div></div>';
    html += '</div>';

    // Row 2: Question
    html += '<div style="font-size:14px;font-weight:600;color:#e2e8f0;line-height:1.4;margin-bottom:6px;">' + question + '</div>';

    // Row 3: Meta info
    html += '<div style="display:flex;gap:14px;font-size:11px;color:#64748b;margin-bottom:14px;flex-wrap:wrap;">';
    if (tl) html += '<span>\u23F1 Closes in ' + tl + '</span>';
    html += '<span>\u25CB ' + (m.city || '') + '</span>';
    html += '<span style="background:' + cc + ';color:#fff;padding:1px 7px;border-radius:3px;font-size:10px;font-weight:700;letter-spacing:0.04em;">' + cl + '</span>';
    if (m.station) html += '<span>\u2708 ' + m.station + '</span>';
    html += '</div>';

    // Row 4: Key metrics
    html += '<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:1px;background:#1e293b;border-radius:8px;overflow:hidden;margin-bottom:14px;">';

    // Our Probability
    html += '<div style="background:#0f172a;padding:10px 8px;text-align:center;"><div style="font-size:10px;color:#64748b;letter-spacing:0.06em;margin-bottom:3px;">OUR PROB</div><div style="font-size:18px;font-weight:700;color:#60a5fa;font-family:monospace;">' + ourProb + '%</div></div>';

    // Market Price
    html += '<div style="background:#0f172a;padding:10px 8px;text-align:center;"><div style="font-size:10px;color:#64748b;letter-spacing:0.06em;margin-bottom:3px;">MKT PRICE</div><div style="font-size:18px;font-weight:700;color:#94a3b8;font-family:monospace;">' + (side === 'YES' ? yesCents : noCents) + '\u00A2</div></div>';

    // YES Price
    html += '<div style="background:#0f172a;padding:10px 8px;text-align:center;"><div style="font-size:10px;color:#64748b;letter-spacing:0.06em;margin-bottom:3px;">YES</div><div style="font-size:18px;font-weight:700;color:#22c55e;font-family:monospace;">' + yesCents + '\u00A2</div></div>';

    // NO Price
    html += '<div style="background:#0f172a;padding:10px 8px;text-align:center;"><div style="font-size:10px;color:#64748b;letter-spacing:0.06em;margin-bottom:3px;">NO</div><div style="font-size:18px;font-weight:700;color:#ef4444;font-family:monospace;">' + noCents + '\u00A2</div></div>';

    // Edge
    html += '<div style="background:#0f172a;padding:10px 8px;text-align:center;"><div style="font-size:10px;color:#64748b;letter-spacing:0.06em;margin-bottom:3px;">' + side + ' EDGE</div><div style="font-size:18px;font-weight:700;color:' + edgeColor + ';font-family:monospace;">' + edge.toFixed(1) + '%</div></div>';

    html += '</div>'; // end metrics grid

    // Row 5: Model agreement bar
    html += '<div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">';
    html += '<span style="font-size:10px;color:#64748b;letter-spacing:0.06em;white-space:nowrap;">MODEL AGREEMENT</span>';
    html += '<div style="flex:1;height:6px;background:#1e293b;border-radius:3px;overflow:hidden;"><div style="width:' + confPct + '%;height:100%;background:' + confColor + ';border-radius:3px;transition:width 0.6s ease;"></div></div>';
    html += '<span style="font-size:11px;font-weight:700;color:' + confColor + ';white-space:nowrap;">' + confPct + '% \u00B7 ' + confLabel + '</span>';
    html += '</div>';

    // Row 6: Kelly stake + Polymarket link
    html += '<div style="display:flex;justify-content:space-between;align-items:center;padding-top:10px;border-top:1px solid #1e293b;">';
    html += '<span style="font-size:11px;color:#94a3b8;"><span style="color:#eab308;">\uD83D\uDD12</span> Kelly Stake: ' + kellyPct + '% bankroll (~$' + kellyOn1k + ' on $1000)</span>';
    html += '<a href="' + polyUrl(m.slug) + '" target="_blank" rel="noopener" style="font-size:11px;color:#60a5fa;text-decoration:none;font-weight:600;">View on Polymarket \u2192</a>';
    html += '</div>';

    html += '</div>'; // end card
  });

  if (!markets.length) {
    html = '<div style="text-align:center;color:#64748b;padding:40px 20px;font-size:14px;">Scan markets first to populate live signals</div>';
  }

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
