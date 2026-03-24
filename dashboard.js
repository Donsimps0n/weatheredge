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
      if (ao && edges.length > 0) {
        ao.innerHTML = edges.slice(0,15).map(function(e){
          var ev = e.theoretical_full_ev || e.best_edge || 0;
          var evPct = (ev * 100).toFixed(1);
          var color = ev > 0 ? '#22c55e' : '#ef4444';
          return '<div style="padding:8px 0;border-bottom:1px solid #1e293b;font-size:13px">'
            + '<b style="color:#e2e8f0">' + (e.question || e.city || 'Market') + '</b><br>'
            + 'Theo EV: <span style="color:' + color + '">' + evPct + '%</span>'
            + ' &middot; Side: ' + (e.best_side || '-')
            + ' &middot; Price: ' + (e.yes_price || '-')
            + ' &middot; Confidence: ' + ((e.confidence||0)*100).toFixed(0) + '%'
            + (e.regime ? ' &middot; Regime: ' + e.regime : '')
            + '</div>';
        }).join('');
      } else if (ao) {
        ao.innerHTML = '<div style="color:#64748b;padding:12px">No edges found in current scan.</div>';
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

function populateSignals(markets) {
  // Update signal stats
  var sigCount = document.getElementById('sig-count');
  var sigAvg   = document.getElementById('sig-avg-ev');
  var sigHigh  = document.getElementById('sig-high');
  var sigMkts  = document.getElementById('sig-markets');
  var sigList  = document.getElementById('signals-list');
  var badge    = document.getElementById('signals-scan-badge');

  if (sigCount) sigCount.textContent = markets.length;
  if (sigMkts)  sigMkts.textContent  = markets.length;
  if (badge)    badge.textContent     = 'LIVE';
  if (badge)    badge.style.background = '#10b981';

  // Calculate average "edge" from prices
  var totalEdge = 0;
  var bestEdge  = 0;
  markets.forEach(function(m) {
    var prices = m.prices || {};
    var vals = Object.values(prices);
    // Edge = how far from 0.5 the best price is
    var edge = 0;
    vals.forEach(function(v) {
      var e = Math.abs(v - 0.5);
      if (e > edge) edge = e;
    });
    totalEdge += edge;
    if (edge > bestEdge) bestEdge = edge;
  });
  var avgEdge = markets.length > 0 ? (totalEdge / markets.length * 100).toFixed(1) : '0';
  if (sigAvg)  sigAvg.textContent  = avgEdge + '%';
  if (sigHigh) sigHigh.textContent = (bestEdge * 100).toFixed(1) + '%';

  // Populate signals list
  if (!sigList) return;
  if (markets.length === 0) {
    sigList.innerHTML = '<div style="text-align:center;padding:2rem;color:#94a3b8">No signals found. Run a scan first.</div>';
    return;
  }

  var html = '';
  var shown = markets.slice(0, 50);
  shown.forEach(function(m) {
    var city = m.city || m.slug || '?';
    var station = m.station || '';
    var cat = m.category || '';
    var catLabel = cat === 'high_temp' ? 'HIGH' : cat === 'low_temp' ? 'LOW' : cat.toUpperCase();
    var catColor = cat === 'high_temp' ? '#ef4444' : '#3b82f6';

    // Find best YES price
    var yesPrice = '-';
    var noPrice  = '-';
    if (m.tokens && m.tokens.length >= 2) {
      m.tokens.forEach(function(t) {
        if (t.outcome === 'Yes') yesPrice = (parseFloat(t.price) * 100).toFixed(1) + 'c';
        if (t.outcome === 'No')  noPrice  = (parseFloat(t.price) * 100).toFixed(1) + 'c';
      });
    }
    var conf = m.confidence || 0;
    var confBar = Math.min(conf, 5);
    var confDots = '';
    for (var i = 0; i < 5; i++) {
      confDots += '<span style="display:inline-block;width:8px;height:8px;border-radius:50%;margin:0 1px;background:' + (i < confBar ? '#10b981' : '#334155') + '"></span>';
    }

    html += '<div style="background:#1e293b;border:1px solid #334155;border-radius:12px;padding:1rem;margin-bottom:0.75rem;display:flex;justify-content:space-between;align-items:center">';
    html += '  <div style="flex:1">';
    html += '    <div style="font-weight:600;color:#f1f5f9;font-size:0.95rem">' + city + '</div>';
    html += '    <div style="color:#94a3b8;font-size:0.8rem">' + station + ' &middot; <span style="color:' + catColor + '">' + catLabel + '</span></div>';
    html += '  </div>';
    html += '  <div style="text-align:center;min-width:80px">';
    html += '    <div style="color:#10b981;font-weight:700;font-size:1.1rem">YES ' + yesPrice + '</div>';
    html += '    <div style="color:#ef4444;font-size:0.85rem">NO ' + noPrice + '</div>';
    html += '  </div>';
    html += '  <div style="text-align:right;min-width:70px">';
    html += '    <div style="margin-bottom:4px">' + confDots + '</div>';
    html += '    <div style="color:#64748b;font-size:0.7rem">conf ' + conf + '/5</div>';
    html += '  </div>';
    html += '</div>';
  });

  sigList.innerHTML = html;
}

// Auto-fetch signals when page loads and after each scan
(function() {
  // Wrap existing scanMarkets to also populate signals
  var _origScan = window.scanMarkets;
  window.scanMarkets = function() {
    var btn = document.querySelector('[onclick*="scanMarkets"]');
    if (btn) btn.disabled = true;

    fetch(API + '/api/scan', {method: 'POST'})
      .then(function(r) { return r.json(); })
      .then(function(data) {
        // Call original scan UI updates
        if (_origScan) {
          try { _origScan(); } catch(e) {}
        }
        // Populate signals with real data
        if (data.markets) {
          populateSignals(data.markets);
        }
        // Update main stats too
        var el = document.getElementById('stat-markets');
        if (el) el.textContent = (data.weather_markets || data.total_markets || 0);
      })
      .catch(function(err) {
        console.error('Scan error:', err);
      })
      .finally(function() {
        var btn = document.querySelector('[onclick*="scanMarkets"]');
        if (btn) btn.disabled = false;
      });
  };

  // Auto-scan on load
  setTimeout(function() {
    fetch(API + '/api/scan', {method: 'POST'})
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (data.markets) populateSignals(data.markets);
      })
      .catch(function(e) { console.log('Auto-scan failed:', e); });
  }, 2000);
})();
