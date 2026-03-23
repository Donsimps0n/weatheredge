/* ===== WeatherEdge v2 Dashboard Logic ===== */
/* Change this URL when v2 API is deployed */
const API = 'https://weatheredge-production.up.railway.app';

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
  fetch(API + '/api/scan')
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
function toggleBot() {
  _botOn = !_botOn;
  var tx = document.getElementById('btn-start-text');
  var bt = document.getElementById('btn-start');
  if (tx) tx.textContent = _botOn ? 'Stop Bot' : 'Start Bot';
  if (bt) bt.style.background = _botOn ? 'linear-gradient(135deg,#ef4444,#dc2626)' : '';
  addLog('Bot ' + (_botOn ? 'started (paper mode)' : 'stopped'));
  if (_botOn) scanMarkets();
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
function _boot() {
  addLog('Connecting to WeatherEdge v2 API...');
  fetch(API + '/api/stats')
    .then(function(r){ return r.json(); })
    .then(function(s){
      var em = document.getElementById('stat-markets');
      if (em) em.textContent = s.markets_scanned || 0;
      var ee = document.getElementById('stat-edge');
      if (ee) ee.textContent = s.edges_found || 0;
      var el = document.getElementById('stat-live');
      if (el) el.textContent = s.live_edges || 0;
      /* Update model badges */
      var mb = document.getElementById('model-badges');
      if (mb && s.models) {
        mb.innerHTML = s.models.map(function(m){
          return '<span style="display:inline-block;padding:2px 8px;margin:2px;border-radius:4px;font-size:11px;background:#1e293b;color:#22c55e;border:1px solid #22c55e40">' + m + '</span>';
        }).join('');
      }
      addLog('Connected - mode: ' + (s.bot_mode || 'PAPER') + ', models: ' + (s.models||[]).join(', '));
    })
    .catch(function(e){ addLog('API connection failed: ' + e.message); });

  fetch(API + '/api/positions')
    .then(function(r){ return r.json(); })
    .then(function(data){
      if (!Array.isArray(data)) return;
      var pc = document.getElementById('pos-count');
      if (pc) pc.textContent = data.length;
      var op = document.getElementById('open-positions');
      if (op && data.length > 0) {
        op.innerHTML = data.map(function(p){
          return '<div style="padding:8px;border-bottom:1px solid #1e293b;font-size:13px;color:#e2e8f0">'
            + (p.question || 'Position') + ' &mdash; $' + (p.amount||0)
            + '</div>';
        }).join('');
      }
    }).catch(function(){});

  fetch(API + '/api/history')
    .then(function(r){ return r.json(); })
    .then(function(data){
      if (!Array.isArray(data)) return;
      var th = document.getElementById('trade-history');
      if (th && data.length > 0) {
        th.innerHTML = data.slice(0,20).map(function(t){
          var pnl = t.pnl || 0;
          var color = pnl >= 0 ? '#22c55e' : '#ef4444';
          return '<div style="padding:8px;border-bottom:1px solid #1e293b;font-size:13px">'
            + '<span style="color:#e2e8f0">' + (t.question||'Trade') + '</span>'
            + ' <span style="color:' + color + '">' + (pnl>=0?'+':'') + pnl.toFixed(2) + '</span>'
            + '</div>';
        }).join('');
      }
    }).catch(function(){});

  /* Load traders - API only, no fallback */
  fetch(API + '/api/traders')
    .then(function(r){ return r.json(); })
    .then(function(data){
      var traders = data.traders || data;
      if (!Array.isArray(traders)) return;
      var lb = document.getElementById('lb-body');
      if (lb) {
        lb.innerHTML = traders.slice(0,15).map(function(t){
          return '<tr>'
            + '<td style="padding:6px">' + (t.rank||'-') + '</td>'
            + '<td style="padding:6px;color:#e2e8f0">' + (t.trader_name||t.trader||'Anon').slice(0,14) + '</td>'
            + '<td style="padding:6px;color:#22c55e">$' + ((t.overall_gain||0)/1000).toFixed(1) + 'k</td>'
            + '<td style="padding:6px">' + ((t.win_rate||0)*100).toFixed(0) + '%</td>'
            + '<td style="padding:6px">' + (t.event_ct||0) + '</td>'
            + '</tr>';
        }).join('');
      }
    }).catch(function(){
      var lb = document.getElementById('lb-body');
      if (lb) lb.innerHTML = '<tr><td colspan="5" style="padding:16px;color:#64748b;text-align:center">Leaderboard unavailable</td></tr>';
    });
}
_boot();
