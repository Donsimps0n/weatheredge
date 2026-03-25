
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

  // --- SVG icons ---
  var svgClock = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="opacity:0.6"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>';
  var svgPin = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="opacity:0.6"><path d="M12 2a10 10 0 100 20A10 10 0 0012 2z"/></svg>';
  var svgCat = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="opacity:0.6"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>';
  var svgUp = '<svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4l8 8H4z"/></svg>';
  var svgDown = '<svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 20L4 12h16z"/></svg>';

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
    if (cat === 'high_temp') return 'Temperature \u00B7 Max Daily';
    if (cat === 'low_temp') return 'Temperature \u00B7 Min Daily';
    if (cat === 'precipitation') return 'Precipitation';
    return cat.toUpperCase().replace(/_/g, ' ');
  }

  // --- Helper: generate full market question from slug ---
  function buildQuestion(m) {
    if (!m.slug) return '';
    var s = m.slug.replace(/-/g, ' ');
    s = s.replace(/\b\w/g, function(c) { return c.toUpperCase(); });
    s = s.replace(/^Highest Temperature In /i, 'Will the highest temperature in ');
    s = s.replace(/^Lowest Temperature In /i, 'Will the lowest temperature in ');
    s = s.replace(/(\d+)forabove/i, '$1\u00B0F or higher');
    s = s.replace(/(\d+)forbelow/i, 'below $1\u00B0F');
    s = s.replace(/(\d+)corhigher/i, '$1\u00B0C or higher');
    s = s.replace(/(\d+)corbelow/i, 'below $1\u00B0C');
    s = s.replace(/(\d+)c(?:\s|$)/i, '$1\u00B0C ');
    s = s.replace(/(\d+)f(?:\s|$)/i, '$1\u00B0F ');
    if (s.indexOf('Will') === 0 && s.indexOf('?') < 0) {
      s = s.replace(/ On (.*?)(\d{4})\s*(.*)/i, ' on $1$2 be $3?');
      if (s.indexOf('?') < 0) s += '?';
    }
    return s;
  }

  // --- CSS for signal cards (injected once) ---
  var css = '<style>';
  css += '.sc-card{background:rgba(15,23,42,0.85);border:1px solid rgba(255,255,255,0.07);border-radius:14px;padding:20px;margin-bottom:14px;position:relative;overflow:hidden;transition:border-color 0.2s;}';
  css += '.sc-card:hover{border-color:rgba(56,189,248,0.3);}';
  css += '.sc-card::before{content:"";position:absolute;left:0;top:0;bottom:0;width:4px;border-radius:14px 0 0 14px;}';
  css += '.sc-card.sc-yes::before{background:#22c55e;} .sc-card.sc-no::before{background:#ef4444;}';
  css += '.sc-top{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:16px;}';
  css += '.sc-left{flex:1;}';
  css += '.sc-dir{display:inline-flex;align-items:center;gap:5px;padding:3px 10px;border-radius:6px;font-size:11px;font-weight:700;letter-spacing:1px;margin-bottom:8px;}';
  css += '.sc-dir.sc-yes{background:rgba(34,197,94,0.15);color:#22c55e;} .sc-dir.sc-no{background:rgba(239,68,68,0.15);color:#ef4444;}';
  css += '.sc-title{font-size:14px;font-weight:600;color:#e2e8f0;line-height:1.45;margin-bottom:6px;}';
  css += '.sc-meta{display:flex;gap:12px;flex-wrap:wrap;}';
  css += '.sc-meta-tag{display:flex;align-items:center;gap:4px;font-size:11px;color:#64748b;}';
  css += '.sc-ev{text-align:right;flex-shrink:0;}';
  css += '.sc-ev-val{font-size:28px;font-weight:700;font-family:monospace;}';
  css += '.sc-ev-lbl{font-size:10px;color:#64748b;letter-spacing:1px;margin-top:2px;}';
  css += '.sc-stats{display:grid;grid-template-columns:repeat(5,1fr);gap:1px;background:rgba(255,255,255,0.04);border-radius:10px;overflow:hidden;margin-bottom:14px;}';
  css += '.sc-cell{background:rgba(10,15,30,0.9);padding:10px 12px;text-align:center;}';
  css += '.sc-cell-val{font-size:14px;font-weight:700;font-family:monospace;}';
  css += '.sc-cell-lbl{font-size:9px;color:#475569;letter-spacing:1px;margin-top:3px;text-transform:uppercase;}';
  css += '.sc-models{display:flex;gap:8px;align-items:center;margin-bottom:14px;flex-wrap:wrap;}';
  css += '.sc-chip{display:flex;align-items:center;gap:5px;padding:4px 10px;border-radius:6px;font-size:11px;font-weight:600;border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.03);color:#94a3b8;}';
  css += '.sc-dot{width:6px;height:6px;border-radius:50%;display:inline-block;}';
  css += '.sc-agree{display:flex;align-items:center;gap:10px;margin-bottom:14px;}';
  css += '.sc-agree-lbl{font-size:11px;color:#64748b;white-space:nowrap;}';
  css += '.sc-agree-bar{flex:1;height:6px;background:rgba(255,255,255,0.06);border-radius:3px;overflow:hidden;}';
  css += '.sc-agree-fill{height:100%;border-radius:3px;}';
  css += '.sc-agree-pct{font-size:11px;font-weight:700;white-space:nowrap;}';
  css += '.sc-bottom{display:flex;align-items:center;justify-content:space-between;}';
  css += '.sc-kelly{display:flex;align-items:center;gap:6px;padding:6px 12px;border-radius:8px;font-size:12px;font-weight:600;}';
  css += '.sc-kelly.sc-yes{background:rgba(56,189,248,0.08);border:1px solid rgba(56,189,248,0.15);color:#38bdf8;}';
  css += '.sc-kelly.sc-no{background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2);color:#f87171;}';
  css += '.sc-kelly.sc-skip{background:rgba(100,116,139,0.08);border:1px solid rgba(100,116,139,0.2);color:#64748b;}';
  css += '.sc-ts{font-size:11px;color:#475569;}';
  css += '.sc-poly{font-size:11px;color:#38bdf8;text-decoration:none;opacity:0.7;font-weight:600;}';
  css += '.sc-poly:hover{opacity:1;}';
  css += '.sc-skip-badge{position:absolute;top:12px;right:12px;background:rgba(100,116,139,0.2);border:1px solid rgba(100,116,139,0.3);padding:3px 8px;border-radius:5px;font-size:10px;color:#64748b;font-weight:600;}';
  css += '</style>';

  // --- Build elite signal cards ---
  var html = css;
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
    if (m.signal && m.signal.includes('NO')) {
      side = 'NO'; edge = m.theo_ev || noEdge; sidePrice = noPrice;
    } else {
      side = 'YES'; edge = m.theo_ev || yesEdge; sidePrice = yesPrice;
    }
    if (edge < 0) edge = 0;
    var theoEv = m.theo_ev || edge;

    // Kelly stake (fractional kelly 0.25)
    var kellyFrac = 0;
    if (sidePrice > 0 && sidePrice < 1) {
      var impliedProb = sidePrice;
      var kProb = impliedProb + (edge / 100);
      if (kProb > 0.99) kProb = 0.99;
      var odds = (1 / sidePrice) - 1;
      if (odds > 0) {
        kellyFrac = ((kProb * odds) - (1 - kProb)) / odds;
        if (kellyFrac < 0) kellyFrac = 0;
        kellyFrac = kellyFrac * 0.25;
      }
    }
    var kellyPct = m.kelly ? m.kelly.toFixed(1) : (kellyFrac * 100).toFixed(1);
    var kellyOn1k = m.kelly ? Math.round(m.kelly * 10) : Math.round(kellyFrac * 1000);

    // Probability estimate
    var ourProb = m.our_prob ? Math.round(m.our_prob) : Math.min(99, Math.max(1, Math.round((sidePrice + edge / 100) * 100)));

    // Model agreement from confidence
    var confPct = m.confidence ? Math.round((m.confidence / 5) * 100) : 60;
    var confLabel = confPct >= 80 ? 'VERY HIGH' : confPct >= 60 ? 'HIGH' : confPct >= 40 ? 'MODERATE' : 'LOW';

    // Agreement bar gradient
    var agreeGrad, agreeColor;
    if (confPct >= 80) { agreeGrad = 'linear-gradient(90deg,#22c55e,#86efac)'; agreeColor = '#22c55e'; }
    else if (confPct >= 60) { agreeGrad = 'linear-gradient(90deg,#f59e0b,#fde68a)'; agreeColor = '#fbbf24'; }
    else if (confPct >= 40) { agreeGrad = 'linear-gradient(90deg,#f97316,#fdba74)'; agreeColor = '#f97316'; }
    else { agreeGrad = 'linear-gradient(90deg,#ef4444,#fca5a5)'; agreeColor = '#ef4444'; }

    // EV color
    var evColor = theoEv >= 10 ? '#22c55e' : theoEv >= 5 ? '#fbbf24' : '#f97316';

    // Time left
    var tl = timeLeft(m.end_date);

    // Is weak signal?
    var isWeak = confPct < 50 && theoEv < 5;

    // Side class
    var sc = side === 'YES' ? 'sc-yes' : 'sc-no';

    // Model dot colors based on confidence
    var modelDots = [];
    if (confPct >= 80) { modelDots = ['#22c55e','#22c55e','#22c55e','#22c55e']; }
    else if (confPct >= 60) { modelDots = ['#22c55e','#22c55e','#22c55e','#fbbf24']; }
    else if (confPct >= 40) { modelDots = ['#22c55e','#fbbf24','#22c55e','#ef4444']; }
    else { modelDots = ['#22c55e','#ef4444','#22c55e','#ef4444']; }

    // Question
    var question = buildQuestion(m);

    // Card open
    html += '<div class="sc-card ' + sc + '"' + (isWeak ? ' style="opacity:0.65"' : '') + '>';

    // LOW CONF badge for weak signals
    if (isWeak) {
      html += '<div class="sc-skip-badge">LOW CONF \u2014 SKIP</div>';
    }

    // Top row: direction badge + question + EV
    html += '<div class="sc-top">';
    html += '<div class="sc-left">';
    html += '<div class="sc-dir ' + sc + '">' + (side === 'YES' ? svgUp : svgDown) + ' BUY ' + side + '</div>';
    html += '<div class="sc-title">' + question + '</div>';
    html += '<div class="sc-meta">';
    if (tl) html += '<span class="sc-meta-tag">' + svgClock + ' Closes in ' + tl + '</span>';
    html += '<span class="sc-meta-tag">' + svgPin + ' ' + (m.city || '') + '</span>';
    html += '<span class="sc-meta-tag">' + svgCat + ' ' + catLabel(m.category) + '</span>';
    html += '</div>';
    html += '</div>'; // end sc-left

    html += '<div class="sc-ev">';
    html += '<div class="sc-ev-val" style="color:' + evColor + '">+' + theoEv.toFixed(1) + '%</div>';
    html += '<div class="sc-ev-lbl">THEO EV</div>';
    html += '</div>';
    html += '</div>'; // end sc-top

    // Stats grid: 5 columns
    html += '<div class="sc-stats">';
    html += '<div class="sc-cell"><div class="sc-cell-val" style="color:#38bdf8">' + ourProb + '%</div><div class="sc-cell-lbl">Our Probability</div></div>';
    html += '<div class="sc-cell"><div class="sc-cell-val" style="color:#fbbf24">' + (side === 'YES' ? yesCents : noCents) + '\u00A2</div><div class="sc-cell-lbl">Market Price</div></div>';
    html += '<div class="sc-cell"><div class="sc-cell-val" style="color:#22c55e">' + yesCents + '\u00A2</div><div class="sc-cell-lbl">YES</div></div>';
    html += '<div class="sc-cell"><div class="sc-cell-val" style="color:#ef4444">' + noCents + '\u00A2</div><div class="sc-cell-lbl">NO</div></div>';
    html += '<div class="sc-cell"><div class="sc-cell-val" style="color:' + evColor + '">' + edge.toFixed(1) + '%</div><div class="sc-cell-lbl">' + side + ' Edge</div></div>';
    html += '</div>';

    // Model chips
    html += '<div class="sc-models">';
    html += '<span style="font-size:11px;color:#475569;margin-right:4px">MODELS:</span>';
    html += '<span class="sc-chip"><span class="sc-dot" style="background:' + modelDots[0] + '"></span>GFS</span>';
    html += '<span class="sc-chip"><span class="sc-dot" style="background:' + modelDots[1] + '"></span>ECMWF</span>';
    html += '<span class="sc-chip"><span class="sc-dot" style="background:' + modelDots[2] + '"></span>UKMO</span>';
    html += '<span class="sc-chip"><span class="sc-dot" style="background:' + modelDots[3] + '"></span>MeteoFrance</span>';
    html += '</div>';

    // Agreement bar
    html += '<div class="sc-agree">';
    html += '<span class="sc-agree-lbl">MODEL AGREEMENT</span>';
    html += '<div class="sc-agree-bar"><div class="sc-agree-fill" style="width:' + confPct + '%;background:' + agreeGrad + '"></div></div>';
    html += '<span class="sc-agree-pct" style="color:' + agreeColor + '">' + confPct + '% \u00B7 ' + confLabel + '</span>';
    html += '</div>';

    // Bottom: Kelly + timestamp + Polymarket link
    var kellyClass = isWeak ? 'sc-skip' : sc;
    html += '<div class="sc-bottom">';
    if (isWeak) {
      html += '<div class="sc-kelly sc-skip">\u26A0\uFE0F Kelly Stake: <strong>' + kellyPct + '% bankroll</strong> \u2014 below min threshold</div>';
    } else {
      html += '<div class="sc-kelly ' + sc + '">\uD83D\uDCB0 Kelly Stake: <strong>' + kellyPct + '% bankroll</strong> (~$' + kellyOn1k + ' on $1000)</div>';
    }
    html += '<div style="display:flex;align-items:center;gap:16px">';
    html += '<span class="sc-ts">Scanned just now</span>';
    html += '<a class="sc-poly" href="' + polyUrl(m.slug) + '" target="_blank" rel="noopener">View on Polymarket \u2192</a>';
    html += '</div>';
    html += '</div>'; // end sc-bottom

    html += '</div>'; // end sc-card
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
        .then(function() { return fetch(API + "/api/signals"); })
        .then(function(r) { return r.json(); })
        .then(function(data) {
          if (data.signals && data.signals.length > 0) populateSignals(data.signals || data.markets || []);
        })
        .catch(function(e) { console.log("[WE] Scan populate error:", e); });
    }, 500);
  };

  function autoScan() {
    console.log("[WE] Auto-scan starting...");
    var badge = document.getElementById("signals-scan-badge");
    if (badge) { badge.textContent = "SCANNING..."; badge.style.background = "#64748b"; }
    fetch(API + "/api/scan", {method: "POST"})
      .then(function() { return fetch(API + "/api/signals"); })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        console.log("[WE] Auto-scan got " + (data.signals ? data.signals.length : 0) + " signals");
        if (data.signals && data.signals.length > 0) {
          populateSignals(data.signals || data.markets || []);
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
