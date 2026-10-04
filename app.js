(function () {
  'use strict';

  // ==================== STATE ====================
  let flightData = {};
  let steps = [];
  let currentStep = 0;

  // Wizard state
  const WIZ = [
    { key: 'airline',   label: 'Airline' },
    { key: 'callsign',  label: 'Call sign' },
    { key: 'confirm',   label: 'Confirm' },
    { key: 'departure', label: 'From' },
    { key: 'arrival',   label: 'To' },
    { key: 'runway',    label: 'Runway' },
  ];
  let wizIndex = 0;

  const selection = {
    mode: 'preset',        // 'preset' | 'custom'
    airline: null,         // preset airline object
    customName: '',
    format: 'airline',     // 'airline' (radio) | 'icao'
    flightNumber: '',
    dep: null,             // airport object
    arr: null,
    depRunway: '',
    arrRunway: '',
  };

  // ==================== DOM ====================
  const $  = (s, p) => (p || document).querySelector(s);
  const $$ = (s, p) => [...(p || document).querySelectorAll(s)];

  const setupScreen   = $('#setup-screen');
  const flowScreen    = $('#flow-screen');
  const stepContainer = $('#step-container');
  const progressFill  = $('#progress-fill');
  const progressPhase = $('#progress-phase');
  const progressStep  = $('#progress-step');
  const progressDots  = $('#progress-dots');
  const flightBadge   = $('#flight-badge');
  const btnBack       = $('#btn-back');
  const btnSkip       = $('#btn-skip');
  const btnNext       = $('#btn-next');
  const readbackOverlay = $('#readback-overlay');
  const toast         = $('#toast');

  const wizBack  = $('#wiz-back');
  const wizNext  = $('#wiz-next');
  const stepper  = $('#stepper');

  const PLANE = 'M21 16v-2l-8-5V3.5A1.5 1.5 0 0 0 11.5 2 1.5 1.5 0 0 0 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z';
  const CHECK = 'M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z';

  // ==================== AIRLINE DATA ====================
  const AIRLINES = [
    { name: 'United Airlines',   radio: 'United',       iata: 'UA', icao3: 'UAL', color: '#0a58ca', accent: '#06265a' },
    { name: 'Delta Air Lines',   radio: 'Delta',        iata: 'DL', icao3: 'DAL', color: '#c8102e', accent: '#0033a0' },
    { name: 'American Airlines', radio: 'American',     iata: 'AA', icao3: 'AAL', color: '#0078d2', accent: '#c8102e' },
    { name: 'Southwest',         radio: 'Southwest',    iata: 'WN', icao3: 'SWA', color: '#304cb2', accent: '#f9b600' },
    { name: 'JetBlue',           radio: 'JetBlue',      iata: 'B6', icao3: 'JBU', color: '#003876', accent: '#00a8e1' },
    { name: 'Alaska Airlines',   radio: 'Alaska',       iata: 'AS', icao3: 'ASA', color: '#01426a', accent: '#00a3ad' },
    { name: 'Spirit',            radio: 'Spirit',       iata: 'NK', icao3: 'NKS', color: '#ffe01b', accent: '#f5c400', fg: '#1a1a1a' },
    { name: 'Frontier',          radio: 'Frontier',     iata: 'F9', icao3: 'FFT', color: '#00843d', accent: '#0b6a3b' },
    { name: 'Air Canada',        radio: 'Air Canada',   iata: 'AC', icao3: 'ACA', color: '#f01428', accent: '#8f0d17' },
    { name: 'Aerom\u00e9xico',  radio: 'Aeromexico',   iata: 'AM', icao3: 'AMX', color: '#0b2343', accent: '#e31837' },
    { name: 'Copa Airlines',     radio: 'Copa',         iata: 'CM', icao3: 'CMP', color: '#0033a0', accent: '#e31837' },
    { name: 'LATAM',             radio: 'LATAM',        iata: 'LA', icao3: 'TAM', color: '#1b0f5b', accent: '#e4002b' },
    { name: 'British Airways',   radio: 'Speedbird',    iata: 'BA', icao3: 'BAW', color: '#123a6b', accent: '#d2232a' },
    { name: 'Lufthansa',         radio: 'Lufthansa',    iata: 'LH', icao3: 'DLH', color: '#05164d', accent: '#f0c200' },
    { name: 'Air France',        radio: 'Air France',   iata: 'AF', icao3: 'AFR', color: '#002157', accent: '#e30613' },
    { name: 'Iberia',            radio: 'Iberia',       iata: 'IB', icao3: 'IBE', color: '#d50032', accent: '#fbba00' },
    { name: 'TAP Air Portugal',  radio: 'TAP',          iata: 'TP', icao3: 'TAP', color: '#00a9a5', accent: '#e30613' },
    { name: 'Emirates',          radio: 'Emirates',     iata: 'EK', icao3: 'UAE', color: '#d71921', accent: '#8e0e14' },
  ];

  function currentAirline() {
    if (selection.mode === 'preset') return selection.airline;
    const letters = (selection.customName || '').replace(/[^A-Za-z]/g, '').toUpperCase();
    return {
      name: (selection.customName || '').trim() || 'Custom Airline',
      radio: (selection.customName || '').trim() || 'Custom',
      iata: letters.substring(0, 2) || 'CU',
      icao3: letters.substring(0, 3) || 'CUS',
      color: '#334155', accent: '#475569', custom: true,
    };
  }

  function logoHTML(a, cls) {
    if (!a) return '';
    const fg = a.fg || '#fff';
    const mono = a.custom
      ? ((a.name.replace(/[^A-Za-z]/g, '').toUpperCase().substring(0, 2)) || '+')
      : a.iata;
    return '<span class="airline-logo ' + (cls || '') + '" style="background:linear-gradient(135deg,' + a.color + ',' + a.accent + ');color:' + fg + '">'
      + esc(mono)
      + '<svg class="plane" viewBox="0 0 24 24"><path d="' + PLANE + '"/></svg>'
      + '</span>';
  }

  // ==================== AIRPORT DATA ====================
  const AIRPORT_GROUPS = [
    { region: 'Rep\u00fablica Dominicana', airports: [
      { icao: 'MTCA', iata: 'CYA', name: 'Antoine-Simon International Airport' },
      { icao: 'MDCR', iata: 'CBJ', name: 'Cabo Rojo Airport' },
      { icao: 'MDPC', iata: 'PUJ', name: 'Punta Cana International Airport' },
      { icao: 'MDST', iata: 'STI', name: 'Cibao International Airport' },
      { icao: 'MDAB', iata: 'EPS', name: 'Arroyo Barril International Airport' },
    ]},
    { region: 'Chipre', airports: [
      { icao: 'LCLK', iata: 'LCA', name: 'Larnaca International Airport' },
      { icao: 'LCPH', iata: 'PFO', name: 'Paphos International Airport' },
      { icao: 'LCRA', iata: 'AKT', name: 'RAF Akrotiri' },
    ]},
    { region: 'Madeira', airports: [
      { icao: 'LPMA', iata: 'FNC', name: 'Aeroporto Internacional da Madeira \u2013 Cristiano Ronaldo' },
    ]},
    { region: 'Reino Unido', airports: [
      { icao: 'X2BH', iata: null, name: 'Bolt Head' },
      { icao: 'EGHC', iata: 'LEQ', name: "Land's End" },
      { icao: 'EGCK', iata: null, name: 'Caernarfon' },
      { icao: 'EGHJ', iata: 'BBP', name: 'Bembridge' },
      { icao: 'EGFF', iata: 'CWL', name: 'Cardiff' },
      { icao: 'EGLC', iata: 'LCY', name: 'London City' },
      { icao: 'EGKK', iata: 'LGW', name: 'London Gatwick' },
    ]},
    { region: 'Alaska', airports: [
      { icao: 'PAFA', iata: 'FAI', name: 'Fairbanks International Airport' },
    ]},
  ];

  function lookupAirport(icao) {
    for (const g of AIRPORT_GROUPS) {
      const found = g.airports.find(a => a.icao === icao);
      if (found) return Object.assign({ region: g.region }, found);
    }
    return null;
  }

  // Compact, radio-friendly display name
  function shortName(n) {
    return n
      .replace(/Aeroporto Internacional da Madeira/i, 'Madeira')
      .replace(/\bIntern(ational|acional|azionale)\b/gi, '')
      .replace(/\bAirport\b/gi, '')
      .replace(/\s+[\u2013\u2014-]\s+.*$/, '')     // drop "– Cristiano Ronaldo"
      .replace(/\s{2,}/g, ' ')
      .replace(/\s+$/, '')
      .trim();
  }

  // ==================== AIRLINE GRID ====================
  function mediaHTML(a) {
    return '<span class="airline-media">'
      + '<img class="airline-img" src="img/' + a.iata + '.png" alt="" loading="lazy" onerror="this.parentNode.classList.add(\'no-img\')">'
      + logoHTML(a, 'fill')
      + '</span>';
  }

  function renderAirlines(filter) {
    const q = (filter || '').toLowerCase().trim();
    const grid = $('#airline-grid');
    const list = AIRLINES.filter(a =>
      !q || (a.name + ' ' + a.radio + ' ' + a.iata + ' ' + a.icao3).toLowerCase().includes(q));
    if (!list.length) {
      grid.innerHTML = '<div class="airport-empty">No airlines match your search.</div>';
      return;
    }
    grid.innerHTML = list.map(a => {
      const idx = AIRLINES.indexOf(a);
      const sel = selection.mode === 'preset' && selection.airline === a;
      return '<div class="airline-card' + (sel ? ' selected' : '') + '" data-index="' + idx + '" tabindex="0" role="button" aria-label="' + esc(a.name) + '">'
        + '<span class="airline-check"><svg viewBox="0 0 24 24"><path d="' + CHECK + '"/></svg></span>'
        + mediaHTML(a)
        + '<span class="airline-name">' + esc(a.name) + '</span>'
        + '<span class="airline-code">' + esc(a.icao3) + '</span>'
        + '</div>';
    }).join('');
  }

  function bindAirlines() {
    const grid = $('#airline-grid');
    grid.addEventListener('click', (e) => {
      const card = e.target.closest('.airline-card');
      if (!card) return;
      selectPreset(parseInt(card.dataset.index, 10));
    });
    grid.addEventListener('keydown', (e) => {
      const card = e.target.closest('.airline-card');
      if (card && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        selectPreset(parseInt(card.dataset.index, 10));
      }
    });
    $('#airline-search').addEventListener('input', (e) => renderAirlines(e.target.value));
  }

  function selectPreset(i) {
    selection.mode = 'preset';
    selection.airline = AIRLINES[i];
    $('#custom-input-wrap').classList.add('hidden');
    $('#custom-card').classList.remove('selected');
    syncAirlineHighlight();
    updateFooter();
  }

  function selectCustom() {
    selection.mode = 'custom';
    selection.airline = null;
    $('#custom-input-wrap').classList.remove('hidden');
    $('#custom-card').classList.add('selected');
    syncAirlineHighlight();
    updateFooter();
    setTimeout(() => $('#custom-name').focus(), 40);
  }

  function syncAirlineHighlight() {
    $$('#airline-grid .airline-card').forEach(card => {
      const i = parseInt(card.dataset.index, 10);
      card.classList.toggle('selected', selection.mode === 'preset' && selection.airline === AIRLINES[i]);
    });
  }

  // ==================== AIRPORT GRID ====================
  function renderAirports(which) {
    const isDep = which === 'dep';
    const container = $(isDep ? '#dep-grid' : '#arr-grid');
    const q = ($(isDep ? '#dep-search' : '#arr-search').value || '').toLowerCase().trim();
    const selectedAp = isDep ? selection.dep : selection.arr;

    let html = '';
    let count = 0;
    AIRPORT_GROUPS.forEach(group => {
      const matches = group.airports.filter(ap => {
        if (!q) return true;
        return (ap.icao + ' ' + (ap.iata || '') + ' ' + ap.name + ' ' + shortName(ap.name)).toLowerCase().includes(q);
      });
      if (!matches.length) return;
      html += '<div class="region">';
      html += '<div class="region-title">' + esc(group.region) + '</div>';
      html += '<div class="airport-grid">';
      matches.forEach(ap => {
        const code = ap.iata || ap.icao;
        const isSel = selectedAp && selectedAp.icao === ap.icao;
        html += '<div class="airport-card' + (isSel ? ' selected' : '') + '" data-icao="' + ap.icao + '" tabindex="0" role="button">'
          + '<span class="ap-codes"><span class="ap-iata">' + esc(code) + '</span><span class="ap-icao">' + esc(ap.icao) + '</span></span>'
          + '<span class="ap-name">' + esc(shortName(ap.name)) + '</span>'
          + '</div>';
        count++;
      });
      html += '</div></div>';
    });
    if (!count) html = '<div class="airport-empty">No airports match your search.</div>';
    container.innerHTML = html;
  }

  function bindAirport(which) {
    const isDep = which === 'dep';
    const container = $(isDep ? '#dep-grid' : '#arr-grid');
    const search = $(isDep ? '#dep-search' : '#arr-search');

    function choose(icao) {
      const ap = lookupAirport(icao);
      if (!ap) return;
      if (isDep) selection.dep = ap; else selection.arr = ap;
      renderAirports(which);
      updateFooter();
    }

    container.addEventListener('click', (e) => {
      const card = e.target.closest('.airport-card');
      if (card) choose(card.dataset.icao);
    });
    container.addEventListener('keydown', (e) => {
      const card = e.target.closest('.airport-card');
      if (card && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); choose(card.dataset.icao); }
    });
    search.addEventListener('input', () => renderAirports(which));
  }

  // ==================== CALLSIGN ====================
  function buildCallsign() {
    const a = currentAirline();
    const num = selection.flightNumber.trim();
    if (!a || !num) return '';
    if (selection.format === 'icao') return a.icao3 + num;
    return a.radio + ' ' + num;
  }

  function updateCallsignPreview() {
    const cs = buildCallsign();
    $('#cp-value').textContent = cs || '\u2014';
  }

  function renderCallsignChosen() {
    const a = currentAirline();
    const box = $('#callsign-chosen');
    if (!a) { box.innerHTML = '<span class="cc-tag">No airline yet</span>'; return; }
    box.innerHTML = logoHTML(a)
      + '<span class="cc-name">' + esc(a.name) + '</span>'
      + '<span class="cc-tag">' + esc(selection.format === 'icao' ? a.icao3 : a.radio) + '</span>';
  }

  function renderConfirm() {
    const a = currentAirline();
    const cs = buildCallsign();
    $('#confirm-logo').innerHTML = a ? logoHTML(a) : '';
    $('#confirm-callsign').textContent = cs || '\u2014';
    const fmt = selection.format === 'icao' ? 'ICAO format' : 'Radio format';
    $('#confirm-meta').innerHTML = a
      ? esc(a.name) + ' &middot; Flight ' + esc(selection.flightNumber.trim()) + ' &middot; ' + fmt
      : '';
  }

  function renderRouteSummary() {
    const dep = selection.dep, arr = selection.arr;
    const cs = buildCallsign();
    const node = (ap) => ap
      ? '<div class="rs-node"><div class="rs-code">' + esc(ap.iata || ap.icao) + '</div><div class="rs-city">' + esc(shortName(ap.name)) + '</div></div>'
      : '<div class="rs-node"><div class="rs-code">&mdash;</div></div>';
    $('#route-summary').innerHTML =
      node(dep)
      + '<div class="rs-arrow"><svg viewBox="0 0 24 24"><path d="' + PLANE + '"/></svg></div>'
      + node(arr)
      + '<div class="rs-callsign">Flying as <b>' + esc(cs || '\u2014') + '</b></div>';
  }

  // ==================== WIZARD NAV ====================
  function renderStepper() {
    stepper.innerHTML = WIZ.map((s, i) =>
      (i ? '<li class="step-sep"></li>' : '')
      + '<li class="step-pill" data-i="' + i + '">'
      + '<span class="step-num">' + (i + 1) + '</span>'
      + '<span class="step-lbl">' + esc(s.label) + '</span>'
      + '</li>'
    ).join('');
    $$('.step-pill', stepper).forEach(pill => {
      pill.addEventListener('click', () => {
        const i = parseInt(pill.dataset.i, 10);
        if (i < wizIndex) showPanel(i);
      });
    });
  }

  function updateStepper() {
    $$('.step-pill', stepper).forEach(pill => {
      const i = parseInt(pill.dataset.i, 10);
      pill.classList.toggle('active', i === wizIndex);
      pill.classList.toggle('done', i < wizIndex);
    });
  }

  function isValid(i) {
    switch (WIZ[i].key) {
      case 'airline': {
        const a = currentAirline();
        return !!(a && (!a.custom || selection.customName.trim().length > 0));
      }
      case 'callsign':  return /^[A-Za-z0-9]{1,6}$/.test(selection.flightNumber.trim());
      case 'confirm':   return !!buildCallsign();
      case 'departure': return !!selection.dep;
      case 'arrival':   return !!selection.arr;
      case 'runway':    return !!selection.depRunway.trim();
      default: return false;
    }
  }

  function updateFooter() {
    wizBack.disabled = wizIndex === 0;
    const last = wizIndex === WIZ.length - 1;
    const confirmStep = WIZ[wizIndex].key === 'confirm';
    wizNext.classList.toggle('start', last);
    wizNext.innerHTML = last
      ? 'Start Flight \u2708'
      : (confirmStep ? 'Looks good \u2192' : 'Continue \u2192');
    wizNext.disabled = !isValid(wizIndex);
  }

  function showPanel(i) {
    wizIndex = Math.max(0, Math.min(WIZ.length - 1, i));

    WIZ.forEach((s, idx) => {
      const p = $('#panel-' + s.key);
      if (p) p.classList.toggle('active', idx === wizIndex);
    });

    // Refresh dynamic content per step
    const key = WIZ[wizIndex].key;
    if (key === 'callsign') { renderCallsignChosen(); updateCallsignPreview(); }
    if (key === 'confirm')  { renderConfirm(); }
    if (key === 'departure'){ renderAirports('dep'); }
    if (key === 'arrival')  { renderAirports('arr'); }
    if (key === 'runway')   { renderRouteSummary(); }

    updateStepper();
    updateFooter();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  wizNext.addEventListener('click', () => {
    if (!isValid(wizIndex)) return;
    if (wizIndex === WIZ.length - 1) startFlight();
    else showPanel(wizIndex + 1);
  });
  wizBack.addEventListener('click', () => { if (wizIndex > 0) showPanel(wizIndex - 1); });

  // ==================== WIZARD EVENTS ====================
  renderStepper();
  renderAirlines();
  bindAirlines();
  renderAirports('dep');
  renderAirports('arr');
  bindAirport('dep');
  bindAirport('arr');

  $('#custom-card').addEventListener('click', selectCustom);
  $('#custom-name').addEventListener('input', (e) => {
    selection.customName = e.target.value;
    updateFooter();
  });

  $$('#format-seg .seg-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('#format-seg .seg-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selection.format = btn.dataset.format;
      renderCallsignChosen();
      updateCallsignPreview();
    });
  });

  $('#flight-number').addEventListener('input', (e) => {
    selection.flightNumber = e.target.value;
    updateCallsignPreview();
    updateFooter();
  });

  $('#dep-runway').addEventListener('input', (e) => {
    selection.depRunway = e.target.value.toUpperCase();
    e.target.value = selection.depRunway;
    updateFooter();
  });
  $('#arr-runway').addEventListener('input', (e) => {
    selection.arrRunway = e.target.value.toUpperCase();
    e.target.value = selection.arrRunway;
  });

  // Enter key advances within text inputs
  ['#flight-number', '#custom-name', '#dep-runway', '#arr-runway'].forEach(sel => {
    const el = $(sel);
    if (el) el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); wizNext.click(); }
    });
  });

  function startFlight() {
    const a = currentAirline();
    const num = selection.flightNumber.trim();
    const cs = buildCallsign();
    flightData = {
      airline:       a ? a.name : '',
      flightNumber:  num,
      callsign:      cs,
      departureICAO: selection.dep.icao,
      departureName: shortName(selection.dep.name),
      arrivalICAO:   selection.arr.icao,
      arrivalName:   shortName(selection.arr.name),
      depRunway:     selection.depRunway.trim(),
      arrRunway:     selection.arrRunway.trim() || selection.depRunway.trim(),
      sid:           '',
      star:          '',
      approachType:  'ILS',
      cruiseAlt:     'FL350',
      squawk:        '4523',
    };
    steps = buildSteps(flightData);
    currentStep = 0;
    showScreen('flow');
    renderStep();
  }

  function showScreen(name) {
    setupScreen.classList.toggle('active', name === 'setup');
    flowScreen.classList.toggle('active', name === 'flow');
    window.scrollTo(0, 0);
  }

  // ==================== STEP DEFINITIONS ====================
  function buildSteps(d) {
    const cs = d.callsign;
    const list = [];

    list.push({
      id: 'pushback', title: 'PUSHBACK & STARTUP', phase: 'PUSHBACK',
      frequency: 'Ground', required: true,
      youSay: `Ground, ${cs}, request pushback and startup.`,
      atcMaySay: `${cs}, pushback approved, start approved. Expect runway ${d.depRunway}.`,
      readbackTemplate: `Pushback approved, start approved, expect runway ${d.depRunway}, ${cs}.`,
    });

    list.push({
      id: 'taxi-out', title: 'TAXI', phase: 'TAXI',
      frequency: 'Ground', required: true,
      youSay: `Ground, ${cs}, ready to taxi.`,
      atcMaySay: `${cs}, taxi to runway ${d.depRunway} via Alpha, Bravo.`,
      readbackTemplate: `Taxi to runway ${d.depRunway} via Alpha, Bravo, ${cs}.`,
      customTaxiways: true,
    });

    list.push({
      id: 'holding-short', title: 'HOLDING SHORT', phase: 'HOLDING SHORT',
      frequency: 'Tower', required: true,
      youSay: `Tower, ${cs}, holding short runway ${d.depRunway}, ready for departure.`,
      atcMaySay: `${cs}, roger, hold short runway ${d.depRunway}, stand by for line-up.`,
      readbackTemplate: `Holding short runway ${d.depRunway}, standing by, ${cs}.`,
    });

    list.push({
      id: 'lineup', title: 'LINE-UP REQUEST', phase: 'LINE-UP',
      frequency: 'Tower', required: true,
      youSay: `Tower, ${cs}, request line-up runway ${d.depRunway}.`,
      atcMaySay: `${cs}, line up and wait runway ${d.depRunway}.`,
      readbackTemplate: `Line up and wait runway ${d.depRunway}, ${cs}.`,
    });

    list.push({
      id: 'takeoff', title: 'TAKEOFF CLEARANCE', phase: 'TAKEOFF',
      frequency: 'Tower', required: true,
      youSay: null,
      atcMaySay: `${cs}, runway ${d.depRunway}, cleared for takeoff.`,
      readbackTemplate: `Cleared for takeoff runway ${d.depRunway}, ${cs}.`,
    });

    list.push({
      id: 'approach', title: 'APPROACH CLEARANCE', phase: 'APPROACH',
      frequency: 'Approach', required: true,
      youSay: null,
      atcMaySay: `${cs}, cleared ${d.approachType} runway ${d.arrRunway}.`,
      readbackTemplate: `Cleared ${d.approachType} runway ${d.arrRunway}, ${cs}.`,
    });

    list.push({
      id: 'landing', title: 'LANDING CLEARANCE', phase: 'LANDING',
      frequency: 'Tower', required: true,
      youSay: null,
      atcMaySay: `${cs}, runway ${d.arrRunway}, cleared to land.`,
      readbackTemplate: `Cleared to land runway ${d.arrRunway}, ${cs}.`,
    });

    list.push({
      id: 'taxi-in', title: 'AFTER LANDING', phase: 'TAXI IN',
      frequency: 'Ground', required: true,
      youSay: null,
      atcMaySay: `${cs}, taxi to the ramp via Charlie, Delta.`,
      readbackTemplate: `Taxi to the ramp via Charlie, Delta, ${cs}.`,
    });

    return list;
  }

  // ==================== RENDER ====================
  function renderStep() {
    if (currentStep >= steps.length) { renderCompletion(); return; }
    const s = steps[currentStep];

    flightBadge.textContent = `${flightData.callsign}  |  ${flightData.departureICAO} \u2192 ${flightData.arrivalICAO}`;

    const pct = (currentStep / steps.length) * 100;
    progressFill.style.width = pct + '%';
    progressPhase.textContent = s.phase;
    progressStep.textContent = `Step ${currentStep + 1} of ${steps.length}`;

    progressDots.innerHTML = '';
    steps.forEach((st, i) => {
      const dot = document.createElement('div');
      dot.className = 'progress-dot';
      if (i < currentStep) dot.classList.add('completed');
      if (i === currentStep) dot.classList.add('current');
      if (!st.required) dot.classList.add('optional');
      dot.title = st.title;
      dot.addEventListener('click', () => { currentStep = i; renderStep(); });
      progressDots.appendChild(dot);
    });

    btnBack.disabled = currentStep === 0;
    btnSkip.style.display = s.required ? 'none' : '';
    btnNext.textContent = currentStep === steps.length - 1 ? 'FINISH' : 'NEXT \u2192';
    btnNext.classList.toggle('finish', currentStep === steps.length - 1);

    let html = '';
    html += `<div class="step-header">`;
    html += `<div class="step-number">STEP ${currentStep + 1}</div>`;
    html += `<div class="step-title">${s.title}</div>`;
    html += `<div class="step-frequency">${s.frequency}</div>`;
    if (!s.required) html += `<span class="step-optional-badge">OPTIONAL</span>`;
    html += `</div>`;

    if (s.youSay) {
      html += `<div class="comm-block pilot">`;
      html += `<div class="comm-label">YOU SAY</div>`;
      html += `<blockquote id="pilot-say">${esc(s.youSay)}</blockquote>`;
      html += `<button class="btn-copy" data-target="pilot-say">COPY</button>`;
      html += `</div>`;
    }

    if (s.followUp) {
      html += `<div class="comm-block atc">`;
      html += `<div class="comm-label">ATC MAY SAY <span class="example-tag">EXAMPLE</span></div>`;
      html += `<blockquote>${esc(s.atcMaySay)}</blockquote>`;
      html += `</div>`;
      html += `<div class="comm-block readback">`;
      html += `<div class="comm-label">YOUR RESPONSE</div>`;
      html += `<blockquote id="rb-template">${esc(s.readbackTemplate)}</blockquote>`;
      html += `<button class="btn-copy" data-target="rb-template">COPY</button>`;
      html += `</div>`;
      html += `<div class="comm-separator">After frequency change</div>`;
      html += `<div class="comm-block pilot">`;
      html += `<div class="comm-label">YOU SAY</div>`;
      html += `<blockquote id="pilot-followup">${esc(s.followUp)}</blockquote>`;
      html += `<button class="btn-copy" data-target="pilot-followup">COPY</button>`;
      html += `</div>`;
    } else {
      if (s.atcMaySay) {
        html += `<div class="comm-block atc">`;
        html += `<div class="comm-label">ATC MAY SAY <span class="example-tag">EXAMPLE</span></div>`;
        html += `<blockquote>${esc(s.atcMaySay)}</blockquote>`;
        html += `</div>`;
      }
      if (s.readbackTemplate) {
        html += `<div class="comm-block readback">`;
        html += `<div class="comm-label">YOUR READBACK</div>`;
        html += `<blockquote id="rb-template">${esc(s.readbackTemplate)}</blockquote>`;
        html += `<button class="btn-copy" data-target="rb-template">COPY</button>`;
        html += `</div>`;
      }
    }

    html += `<div class="comm-separator">Or enter what ATC actually said</div>`;
    html += `<div class="atc-input-section">`;
    html += `<label for="atc-actual">ATC RESPONSE (paste real instruction)</label>`;
    html += `<textarea id="atc-actual" rows="2" placeholder="Paste or type the actual ATC instruction here..."></textarea>`;
    html += `<button class="btn-parse" id="btn-parse">GENERATE READBACK</button>`;
    html += `<div class="generated-readback" id="generated-rb"></div>`;
    html += `</div>`;

    stepContainer.innerHTML = html;
    window.scrollTo({ top: 0, behavior: 'smooth' });

    $$('.btn-copy', stepContainer).forEach(btn => {
      btn.addEventListener('click', () => {
        const target = $('#' + btn.dataset.target, stepContainer);
        if (target) copyText(target.textContent);
      });
    });

    const btnParse = $('#btn-parse', stepContainer);
    if (btnParse) {
      btnParse.addEventListener('click', () => {
        const input = $('#atc-actual', stepContainer).value.trim();
        if (!input) return;
        const result = parseATCInstruction(input, flightData.callsign);
        const container = $('#generated-rb', stepContainer);
        container.innerHTML = renderParsedReadback(result);
        $$('.btn-copy', container).forEach(btn => {
          btn.addEventListener('click', () => {
            const target = $('#' + btn.dataset.target, container);
            if (target) copyText(target.textContent);
          });
        });
      });
    }
  }

  function renderCompletion() {
    progressFill.style.width = '100%';
    progressPhase.textContent = 'COMPLETE';
    progressStep.textContent = `${steps.length} of ${steps.length}`;
    btnNext.disabled = true;
    btnSkip.style.display = 'none';

    stepContainer.innerHTML = `
      <div class="completion">
        <div class="fin-badge"><svg viewBox="0 0 24 24"><path d="${CHECK}"/></svg></div>
        <h2>FLIGHT COMPLETE</h2>
        <p class="fin-route">${esc(flightData.callsign)} &mdash; ${esc(flightData.departureICAO)} to ${esc(flightData.arrivalICAO)}</p>
        <p>All communications completed successfully.</p>
        <button class="btn-restart" id="btn-restart">NEW FLIGHT</button>
      </div>`;

    $('#btn-restart').addEventListener('click', () => {
      showScreen('setup');
      btnNext.disabled = false;
    });
  }

  // ==================== NAVIGATION ====================
  btnNext.addEventListener('click', () => {
    if (currentStep < steps.length) { currentStep++; renderStep(); }
  });
  btnBack.addEventListener('click', () => {
    if (currentStep > 0) { currentStep--; renderStep(); }
  });
  btnSkip.addEventListener('click', () => {
    if (currentStep < steps.length) { currentStep++; renderStep(); }
  });
  $('#btn-back-setup').addEventListener('click', () => showScreen('setup'));

  document.addEventListener('keydown', (e) => {
    if (!flowScreen.classList.contains('active')) return;
    if (readbackOverlay.classList.contains('active')) return;
    const tag = e.target.tagName;
    if (tag === 'TEXTAREA' || tag === 'INPUT' || tag === 'SELECT' || tag === 'BUTTON') return;
    if (e.key === 'ArrowRight') { btnNext.click(); e.preventDefault(); }
    if (e.key === 'ArrowLeft') { btnBack.click(); e.preventDefault(); }
  });

  // ==================== READBACK MODE ====================
  $('#btn-readback-mode').addEventListener('click', () => readbackOverlay.classList.add('active'));
  $('#btn-close-readback').addEventListener('click', () => readbackOverlay.classList.remove('active'));
  readbackOverlay.addEventListener('click', (e) => {
    if (e.target === readbackOverlay) readbackOverlay.classList.remove('active');
  });

  $('#btn-generate-readback').addEventListener('click', () => {
    const input = $('#readback-input').value.trim();
    if (!input) return;
    const result = parseATCInstruction(input, flightData.callsign || '');
    const container = $('#readback-result');
    container.classList.remove('hidden');
    $('#readback-parsed').innerHTML = renderParsedTags(result.parsed);
    const outEl = $('#readback-output');
    outEl.textContent = result.readback;
    $$('.btn-copy', container).forEach(btn => {
      btn.onclick = () => copyText(outEl.textContent);
    });
  });

  // ==================== ATC PARSER ====================
  function parseATCInstruction(raw, callsign) {
    const parsed = [];
    let instruction = raw.trim();

    if (callsign) {
      const csLower = callsign.toLowerCase();
      const instrLower = instruction.toLowerCase();
      if (instrLower.startsWith(csLower)) {
        instruction = instruction.substring(callsign.length).replace(/^[\s,]+/, '');
      }
    }
    instruction = instruction.replace(/^[A-Za-z]+\s+\d{1,4}[A-Za-z]?[\s,]+/i, function (m) {
      if (!callsign) callsign = m.trim().replace(/,\s*$/, '');
      return '';
    });

    const runwayMatch = instruction.match(/runway\s+(\d{1,2}[LRCrlc]?)/gi);
    if (runwayMatch) runwayMatch.forEach(m => parsed.push({ type: 'runway', value: m }));

    const altMatch = instruction.match(/(climb|descend|maintain)\s+(and\s+maintain\s+)?(FL\s*\d+|\d[\d,]+)/gi);
    if (altMatch) altMatch.forEach(m => parsed.push({ type: 'altitude', value: m }));

    const headingMatch = instruction.match(/heading\s+\d{3}/gi);
    if (headingMatch) headingMatch.forEach(m => parsed.push({ type: 'heading', value: m }));

    const speedMatch = instruction.match(/(reduce|increase|maintain)\s+speed\s+\d+/gi) ||
                       instruction.match(/speed\s+\d+\s*knots?/gi);
    if (speedMatch) speedMatch.forEach(m => parsed.push({ type: 'speed', value: m }));

    const freqMatch = instruction.match(/\d{3}\.\d{1,3}/g);
    if (freqMatch) freqMatch.forEach(m => parsed.push({ type: 'frequency', value: m }));

    const taxiwayMatch = instruction.match(/via\s+([A-Za-z][A-Za-z,\s]+?)(?=\.|,?\s*hold|,?\s*runway|$)/gi);
    if (taxiwayMatch) taxiwayMatch.forEach(m => parsed.push({ type: 'taxiway', value: m.trim() }));

    if (/hold\s+short/i.test(instruction)) parsed.push({ type: 'holdshort', value: (instruction.match(/hold\s+short\s+runway\s+\d{1,2}[LRCrlc]?/i) || [])[0] || 'Hold short' });
    if (/line\s+up\s+and\s+wait/i.test(instruction)) parsed.push({ type: 'clearance', value: 'Line up and wait' });
    if (/cleared\s+for\s+takeoff/i.test(instruction)) parsed.push({ type: 'clearance', value: 'Cleared for takeoff' });
    if (/cleared\s+to\s+land/i.test(instruction)) parsed.push({ type: 'clearance', value: 'Cleared to land' });
    if (/cleared\s+(ILS|RNAV|VOR|Visual|LOC|Localizer)/i.test(instruction)) {
      const am = instruction.match(/cleared\s+(ILS|RNAV|VOR|Visual|LOC|Localizer)\s*(runway\s+\d{1,2}[LRCrlc]?)?/i);
      parsed.push({ type: 'approach', value: am ? am[0] : 'Approach clearance' });
    }

    const squawkMatch = instruction.match(/squawk\s+(\d{4})/i);
    if (squawkMatch) parsed.push({ type: 'squawk', value: 'Squawk ' + squawkMatch[1] });

    let readback = instruction
      .replace(/^(roger|affirmative|good\s+day|thank\s+you|thanks)[,.\s]*/i, '')
      .replace(/[,.\s]+$/, '');

    readback = callsign ? (readback + ', ' + callsign + '.') : (readback + '.');
    readback = readback.charAt(0).toUpperCase() + readback.slice(1);

    return { readback, parsed, callsign };
  }

  function renderParsedTags(parsed) {
    if (!parsed.length) return '';
    return parsed.map(p => `<span class="parsed-tag ${p.type}">${esc(p.value)}</span>`).join('');
  }

  function renderParsedReadback(result) {
    let html = '';
    if (result.parsed.length) {
      html += `<div style="margin-bottom:.5rem">${renderParsedTags(result.parsed)}</div>`;
    }
    html += `<div class="comm-block readback">`;
    html += `<div class="comm-label">YOUR READBACK</div>`;
    html += `<blockquote id="gen-rb-text">${esc(result.readback)}</blockquote>`;
    html += `<button class="btn-copy" data-target="gen-rb-text">COPY</button>`;
    html += `</div>`;
    return html;
  }

  // ==================== UTILITIES ====================
  function esc(str) {
    const d = document.createElement('div');
    d.textContent = str == null ? '' : String(str);
    return d.innerHTML;
  }

  function copyText(text) {
    navigator.clipboard.writeText(text).then(() => showToast('Copied!'));
  }

  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 1500);
  }

  // ==================== THEME ====================
  function applyTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    try { localStorage.setItem('fcf-theme', t); } catch (e) {}
  }
  function initTheme() {
    let t = 'dark';
    try { t = localStorage.getItem('fcf-theme') || 'dark'; } catch (e) {}
    document.documentElement.setAttribute('data-theme', t);
  }
  initTheme();
  $$('.theme-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const next = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
      applyTheme(next);
    });
  });

  // ==================== INIT ====================
  showPanel(0);
})();
