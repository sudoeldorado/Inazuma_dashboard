const SUPABASE_URL = "https://ktnutrhbhwsrojunujnw.supabase.co";
// Replace with your anon/public key from Supabase Project Settings > API
const SUPABASE_ANON_KEY = "your_supabase_anon_key_here";

const { createClient } = supabase;
let client = null;
try {
  if (SUPABASE_ANON_KEY && SUPABASE_ANON_KEY !== "your_supabase_anon_key_here") {
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
} catch (err) {
  console.warn("Supabase client init skipped or failed:", err);
}

// Fallback demo signals in case Supabase API key is unconfigured or unreachable
const DEMO_SIGNALS = [
  {
    id: 101,
    received_at: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    channel_name: 'Ghost Crypto',
    symbol: 'BTC/USDT',
    direction: 'LONG',
    entry_min: 64200,
    entry_max: 64500,
    tp_targets: [66000, 68000],
    sl_target: 63000,
    status: 'PENDING'
  },
  {
    id: 102,
    received_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    channel_name: 'Ghost Crypto',
    symbol: 'ETH/USDT',
    direction: 'BUY',
    entry_min: 3450,
    entry_max: 3480,
    tp_targets: [3600, 3750],
    sl_target: 3380,
    status: 'EXECUTED'
  },
  {
    id: 103,
    received_at: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    channel_name: 'Inazuma VIP',
    symbol: 'SOL/USDT',
    direction: 'SHORT',
    entry_min: 155,
    entry_max: 158,
    tp_targets: [145, 138],
    sl_target: 162,
    status: 'PENDING'
  }
];

let allSignals = [];
let activeFilter = 'ALL';

function toggleDropdown() {
  const menu = document.getElementById('channel-dropdown-menu');
  const arrow = document.getElementById('dropdown-arrow');
  menu.classList.toggle('hidden');
  arrow.classList.toggle('rotate-180');
}

// Close dropdown on outside click
window.addEventListener('click', (e) => {
  const btn = document.getElementById('dropdown-btn');
  const menu = document.getElementById('channel-dropdown-menu');
  if (btn && menu && !btn.contains(e.target) && !menu.contains(e.target)) {
    menu.classList.add('hidden');
    document.getElementById('dropdown-arrow').classList.remove('rotate-180');
  }
});

async function loadData() {
  if (client) {
    try {
      const { data, error } = await client
        .from('signals')
        .select('*')
        .order('id', { ascending: false });

      if (error) {
        console.error("DB Load Error, using fallback data:", error);
        allSignals = DEMO_SIGNALS;
      } else {
        allSignals = data && data.length > 0 ? data : DEMO_SIGNALS;
      }
    } catch (e) {
      console.error("Fetch Exception, using fallback data:", e);
      allSignals = DEMO_SIGNALS;
    }
  } else {
    console.warn("No valid Supabase client config found. Loading demo signals.");
    allSignals = DEMO_SIGNALS;
  }

  renderUI();
}

function renderUI() {
  const channels = [...new Set(allSignals.map(s => s.channel_name || 'Ghost Crypto'))];
  
  // Populate Dropdown Items
  const dropdownMenu = document.getElementById('channel-dropdown-menu');
  const allCount = allSignals.length;
  
  let menuHTML = `
    <div onclick="filterChannel('ALL')" class="p-3 hover:bg-yellow-400/10 cursor-pointer flex items-center justify-between transition-colors ${activeFilter === 'ALL' ? 'bg-yellow-400/10' : ''}">
      <div>
        <div class="font-bold text-xs text-slate-100">ALL CHANNELS</div>
        <div class="text-[10px] text-neutral-400">${allCount} Trades Open</div>
      </div>
      <div class="text-right font-mono">
        <div class="text-xs font-semibold text-emerald-400">+$0.00</div>
        <div class="text-[9px] text-neutral-400">PnL (0.00%)</div>
      </div>
    </div>
  `;

  channels.forEach(ch => {
    const count = allSignals.filter(s => (s.channel_name || 'Ghost Crypto') === ch).length;
    const isActive = activeFilter === ch;
    menuHTML += `
      <div onclick="filterChannel('${ch}')" class="p-3 hover:bg-yellow-400/10 cursor-pointer flex items-center justify-between transition-colors ${isActive ? 'bg-yellow-400/10' : ''}">
        <div>
          <div class="font-bold text-xs text-slate-100 flex items-center gap-1.5">
            <span class="text-neutral-400">📢</span> ${ch}
          </div>
          <div class="text-[10px] text-neutral-400">${count} Trades Open</div>
        </div>
        <div class="text-right font-mono">
          <div class="text-xs font-semibold text-emerald-400">+$0.00</div>
          <div class="text-[9px] text-neutral-400">PnL (0.00%)</div>
        </div>
      </div>
    `;
  });
  dropdownMenu.innerHTML = menuHTML;

  // Update Active Channel Label & Side Info
  const activeLabel = document.getElementById('selected-channel-label');
  activeLabel.innerHTML = `
    <span class="w-2 h-2 rounded-full ${activeFilter === 'ALL' ? 'bg-yellow-400' : 'bg-sky-400'}"></span>
    ${activeFilter}
  `;
  document.getElementById('active-channel-scope').innerText = activeFilter;

  const filtered = activeFilter === 'ALL' ? allSignals : allSignals.filter(s => (s.channel_name || 'Ghost Crypto') === activeFilter);

  // Update Scope Metrics
  document.getElementById('channel-trades-count').innerText = filtered.length;
  document.getElementById('channel-pnl-val').innerHTML = `$0.00 <span class="text-[10px] font-normal text-neutral-400">(0.00%)</span>`;

  // Update Global Summary Cards
  document.getElementById('metric-total').innerText = filtered.length;
  document.getElementById('metric-pending').innerText = filtered.filter(s => s.status === 'PENDING').length;
  document.getElementById('metric-executed').innerText = filtered.filter(s => s.status !== 'PENDING' && s.status !== 'SKIPPED').length;
  document.getElementById('metric-channels').innerText = channels.length;

  // Table Render
  const tbody = document.getElementById('trade-table-body');
  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="p-8 text-center text-neutral-500 font-mono">No telemetry signals recorded for this channel.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(row => {
    const isBuy = row.direction === 'BUY';
    const sideBadge = isBuy 
      ? 'text-emerald-400 bg-emerald-950/40 border border-emerald-500/20' 
      : 'text-rose-400 bg-rose-950/40 border border-rose-500/20';
    
    const time = new Date(row.received_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const tp = Array.isArray(row.tp_targets) && row.tp_targets.length > 0 ? row.tp_targets[0] : (row.tp_targets || '-');
    
    return `
      <tr class="hover:bg-white/[0.02] transition-colors">
        <td class="p-3.5 pl-5 text-neutral-400 font-mono text-[11px]">${time}</td>
        <td class="p-3.5 font-medium text-slate-200">${row.channel_name || 'Ghost Crypto'}</td>
        <td class="p-3.5 font-bold text-yellow-300 font-mono">${row.symbol}</td>
        <td class="p-3.5"><span class="px-2 py-0.5 rounded text-[10px] font-bold ${sideBadge}">${row.direction}</span></td>
        <td class="p-3.5 font-mono text-slate-300">${row.entry_min || '-'}</td>
        <td class="p-3.5 font-mono text-emerald-400 font-medium">${tp}</td>
        <td class="p-3.5 font-mono text-rose-400 font-medium">${row.sl_target || '-'}</td>
        <td class="p-3.5 pr-5"><span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-neutral-900 border border-neutral-800 text-neutral-300">${row.status || 'PENDING'}</span></td>
      </tr>
    `;
  }).join('');
}

function filterChannel(name) {
  activeFilter = name;
  toggleDropdown();
  renderUI();
}

// Initial Fetch and Realtime Subscription
loadData();
if (client) {
  try {
    client
      .channel('signals-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'signals' }, () => {
        loadData();
      })
      .subscribe();
  } catch (err) {
    console.warn("Realtime subscription failed:", err);
  }
}
           
