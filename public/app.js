// Sistema de Apuração e Monitoramento Marcela Passamani 15555 MDB - CLDF 2026

let appState = null;
let countdownSeconds = 15 * 60; // 15 minutos em segundos (900s)
let countdownInterval = null;
let currentIntervalMinutes = 15;
let soundEnabled = true;
let hasPlayedVictoryFanfare = false;

// Instâncias dos Gráficos Chart.js
let regionalChartInstance = null;
let grafanaVotesRateChartInstance = null;
let grafanaLatencyChartInstance = null;
let grafanaVotesCompChartInstance = null;

document.addEventListener('DOMContentLoaded', () => {
  if (window.lucide) {
    window.lucide.createIcons();
  }

  setupTabs();
  setupEventListeners();
  initCharts();
  fetchApuracaoData();
  startCountdown();
});

// Navegação entre Abas
function setupTabs() {
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabPanes = document.querySelectorAll('.tab-pane');

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      tabButtons.forEach(b => b.classList.remove('active'));
      tabPanes.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const targetPane = document.getElementById(btn.dataset.tab);
      if (targetPane) {
        targetPane.classList.add('active');
      }

      setTimeout(() => {
        if (btn.dataset.tab === 'tab-grafana') {
          updateGrafanaCharts();
        } else if (btn.dataset.tab === 'tab-warroom') {
          updateRegionalChart();
        }
      }, 50);
    });
  });
}

// Configuração de Event Listeners
function setupEventListeners() {
  // Botão Atualizar Manual
  document.getElementById('btnManualRefresh').addEventListener('click', () => {
    fetchApuracaoData(true);
    resetCountdown();
  });

  // Botão Sincronizar Direto do TSE
  const btnSyncTse = document.getElementById('btnSyncTseNow');
  if (btnSyncTse) {
    btnSyncTse.addEventListener('click', async () => {
      btnSyncTse.innerHTML = '<i data-lucide="loader-2" class="spin-anim"></i> Conectando ao TSE...';
      if (window.lucide) window.lucide.createIcons();
      try {
        const res = await fetch('/api/tse/sync-direto', { method: 'POST' });
        const data = await res.json();
        if (data.success) {
          renderDashboard(data.data);
          alert('Consulta direta ao servidor do TSE finalizada com sucesso!');
        }
      } catch (err) {
        alert('Erro ao consultar TSE: ' + err.message);
      } finally {
        btnSyncTse.innerHTML = '<i data-lucide="refresh-cw"></i> Forçar Leitura Imediata Direto do TSE';
        if (window.lucide) window.lucide.createIcons();
      }
    });
  }

  // Toggle de Som
  document.getElementById('btnSoundToggle').addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    const icon = document.getElementById('soundIcon');
    if (soundEnabled) {
      icon.setAttribute('data-lucide', 'volume-2');
      playBeep(600, 0.1);
    } else {
      icon.setAttribute('data-lucide', 'volume-x');
    }
    if (window.lucide) window.lucide.createIcons();
  });

  // Simulador: Slider
  const slider = document.getElementById('sliderApuracao');
  const sliderValue = document.getElementById('sliderValue');
  if (slider) {
    slider.addEventListener('input', (e) => {
      sliderValue.innerText = `${e.target.value}%`;
    });
    slider.addEventListener('change', (e) => {
      setApuracaoPercentual(parseFloat(e.target.value));
    });
  }

  // Simulador: Botão Avançar +15%
  document.getElementById('btnAvancarPasso').addEventListener('click', async () => {
    try {
      const res = await fetch('/api/apuracao/avancar-passo', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        renderDashboard(data.data);
      }
    } catch (e) {
      console.error('Erro ao avançar passo:', e);
    }
  });

  // Simulador: Botão Vitória Instantânea
  document.getElementById('btnSimularVitoria').addEventListener('click', () => {
    setApuracaoPercentual(100);
  });

  // Simulador: Resetar
  document.getElementById('btnResetarEleicao').addEventListener('click', async () => {
    try {
      const res = await fetch('/api/apuracao/reset', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        hasPlayedVictoryFanfare = false;
        renderDashboard(data.data);
      }
    } catch (e) {
      console.error('Erro ao resetar:', e);
    }
  });

  // Formulário de Configurações
  document.getElementById('formConfig').addEventListener('submit', async (e) => {
    e.preventDefault();
    const intervalo = parseFloat(document.getElementById('selectIntervalo').value);
    const modoFonte = document.getElementById('selectModoFonte').value;
    const tseUrl = document.getElementById('inputTseUrl').value;

    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intervaloMinutos: intervalo,
          modoFonte: modoFonte,
          tseEndpointUrl: tseUrl
        })
      });
      const data = await res.json();
      if (data.success) {
        currentIntervalMinutes = intervalo;
        document.getElementById('intervalDisplay').innerText = intervalo >= 1 ? `${intervalo}m` : `${intervalo * 60}s`;
        resetCountdown();
        alert('Configurações do War Room salvas! Monitorando feed oficial do TSE.');
      }
    } catch (err) {
      alert('Erro ao salvar configurações');
    }
  });

  // Ações do Modal de Vitória
  document.getElementById('btnCelebrarMais').addEventListener('click', () => {
    triggerConfettiStorm();
    playVictorySound();
  });

  document.getElementById('btnFecharVitoria').addEventListener('click', () => {
    document.getElementById('victoryOverlay').classList.remove('active');
  });
}

// Timer de Contagem Regressiva para os 30 minutos
function startCountdown() {
  if (countdownInterval) clearInterval(countdownInterval);
  
  countdownInterval = setInterval(() => {
    countdownSeconds--;
    if (countdownSeconds <= 0) {
      fetchApuracaoData(true);
      resetCountdown();
    }
    updateCountdownDisplay();
  }, 1000);
}

function resetCountdown() {
  countdownSeconds = Math.round(currentIntervalMinutes * 60);
  updateCountdownDisplay();
}

function updateCountdownDisplay() {
  const mins = Math.floor(countdownSeconds / 60);
  const secs = countdownSeconds % 60;
  const formatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  document.getElementById('countdownTimer').innerText = formatted;
}

// Busca de dados da API
async function fetchApuracaoData(isManual = false) {
  const refreshIcon = document.getElementById('refreshIcon');
  if (refreshIcon) refreshIcon.classList.add('spin-anim');

  try {
    const res = await fetch('/api/apuracao');
    const json = await res.json();

    if (json.success && json.data) {
      appState = json.data;
      renderDashboard(appState);
      if (isManual && soundEnabled) {
        playBeep(880, 0.08);
      }
    }
  } catch (err) {
    console.error('Falha ao obter dados da apuração:', err);
  } finally {
    setTimeout(() => {
      if (refreshIcon) refreshIcon.classList.remove('spin-anim');
    }, 600);
  }
}

async function setApuracaoPercentual(pct) {
  try {
    const res = await fetch('/api/apuracao/set-percentual', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ percentual: pct })
    });
    const data = await res.json();
    if (data.success) {
      renderDashboard(data.data);
    }
  } catch (e) {
    console.error('Erro ao definir percentual:', e);
  }
}

// Renderização Geral
function renderDashboard(state) {
  const cand = state.candidata;

  // Atualiza Hero Card Marcela Passamani 15555 MDB
  document.getElementById('voteCountNumber').innerText = cand.votos.toLocaleString('pt-BR');
  document.getElementById('votePercentageValid').innerText = `${cand.percentualValidos.toFixed(2)}%`;
  document.getElementById('rankingBadge').innerText = `#${cand.posicaoRanking} LUGAR GERAL`;
  document.getElementById('probNumber').innerText = `${cand.probabilidadeEleicao.toFixed(1)}%`;
  
  const probBarFill = document.getElementById('probBarFill');
  const probWidth = Math.min(100, Math.max(5, cand.probabilidadeEleicao));
  probBarFill.style.width = `${probWidth}%`;

  // Status de Eleição
  const statusBox = document.getElementById('statusIndicatorBox');
  const statusText = document.getElementById('statusText');
  const statusSub = document.getElementById('statusSub');
  const statusDot = document.getElementById('statusDot');
  const heroCard = document.getElementById('candidateHeroCard');

  if (cand.status === 'ELEITA') {
    heroCard.classList.add('eleita-state');
    statusBox.style.borderColor = 'var(--accent-gold)';
    statusBox.style.background = 'rgba(245, 158, 11, 0.15)';
    statusText.innerText = '⭐ ELEITA DEPUTADA DISTRITAL (15555 MDB)!';
    statusText.style.color = 'var(--accent-gold-bright)';
    statusDot.style.background = 'var(--accent-gold-bright)';
    statusDot.style.boxShadow = '0 0 15px var(--accent-gold)';
    statusSub.innerText = 'CADEIRA OFICIALMENTE CONQUISTADA NA CÂMARA LEGISLATIVA DO DF';
    
    if (!hasPlayedVictoryFanfare) {
      triggerVictoryModal(cand, state);
      hasPlayedVictoryFanfare = true;
    }
  } else {
    heroCard.classList.remove('eleita-state');
    statusBox.style.borderColor = 'rgba(59, 130, 246, 0.3)';
    statusBox.style.background = 'rgba(15, 23, 42, 0.6)';
    statusText.innerText = cand.statusDescricao.toUpperCase();
    statusText.style.color = '#38bdf8';
    statusDot.style.background = 'var(--accent-cyan)';
    statusDot.style.boxShadow = '0 0 10px var(--accent-cyan)';
    statusSub.innerText = 'Projeção matemática com quociente partidário do MDB e dados do TSE';
  }

  // Quick Stats
  document.getElementById('statPercentualApurado').innerText = `${state.percentualApurado.toFixed(2)}%`;
  document.getElementById('statSecoesApuradas').innerText = state.secoesApuradas.toLocaleString('pt-BR');
  document.getElementById('statVotosValidos').innerText = state.totalVotosValidos.toLocaleString('pt-BR');
  document.getElementById('statQuociente').innerText = state.quocienteEleitoralEstimado.toLocaleString('pt-BR');

  // Slider
  const slider = document.getElementById('sliderApuracao');
  const sliderValue = document.getElementById('sliderValue');
  if (slider && document.activeElement !== slider) {
    slider.value = state.percentualApurado;
    sliderValue.innerText = `${state.percentualApurado}%`;
  }

  renderRankingTable(state.candidatosCLDF);
  renderRegionalList(cand.votosPorZona);
  renderSaoSebastiaoPanel(state.saoSebastiao);
  renderZabbixZones();
  renderZabbixTriggers(state.telemetria.alertasZabbix);
  renderServerList(state.telemetria.servidoresMonitorados);
  
  updateRegionalChart();
  updateGrafanaCharts();
}

function renderRankingTable(candidatos) {
  const tbody = document.getElementById('rankingTableBody');
  if (!tbody) return;

  tbody.innerHTML = candidatos.map(cand => {
    const isMarcela = cand.destaque;
    let badgeClass = 'status-blue';
    if (cand.status.toUpperCase().includes('ELEITO') || cand.status.toUpperCase().includes('ELEITA') || isMarcela) badgeClass = 'status-green';
    
    return `
      <tr class="${isMarcela ? 'highlight-row' : ''}">
        <td class="rank-badge-num">#${cand.rank}</td>
        <td>
          <div class="cand-name-cell">
            ${isMarcela ? '<i data-lucide="star" class="star-icon"></i>' : ''}
            <span>${cand.nome}</span>
          </div>
        </td>
        <td><span class="party-tag ${cand.partido === 'MDB' ? 'mdb-tag' : ''}">${cand.partido}</span></td>
        <td class="font-mono"><strong>${cand.numero}</strong></td>
        <td class="font-mono">${cand.votos.toLocaleString('pt-BR')}</td>
        <td class="font-mono">${cand.percentual.toFixed(2)}%</td>
        <td><span class="status-badge ${badgeClass}">${cand.status}</span></td>
      </tr>
    `;
  }).join('');

  if (window.lucide) window.lucide.createIcons();
}

function renderRegionalList(votosPorZona) {
  const container = document.getElementById('regionalList');
  if (!container || !votosPorZona) return;

  container.innerHTML = Object.entries(votosPorZona).map(([regiao, votos]) => `
    <div class="regional-item">
      <span class="regional-name">${regiao}</span>
      <span class="regional-votes font-mono">${votos.toLocaleString('pt-BR')} votos</span>
    </div>
  `).join('');
}

function renderSaoSebastiaoPanel(saoSebastiao) {
  const summary = document.getElementById('saoSebastiaoSummary');
  const list = document.getElementById('saoSebastiaoList');

  if (!summary || !list) return;

  if (!saoSebastiao || !Array.isArray(saoSebastiao.colegios)) {
    summary.innerHTML = '<div class="sao-sebastiao-no-data">Dados de São Sebastião indisponíveis no momento.</div>';
    list.innerHTML = '';
    return;
  }

  const totalVotos = Number(saoSebastiao.totalVotos || 0);
  const percentual = Number(saoSebastiao.percentualDoDf || 0);

  summary.innerHTML = `
    <div class="sao-sebastiao-summary-main">
      <span class="sao-sebastiao-pill">TOTAL EM SÃO SEBASTIÃO + ÁREA RURAL</span>
      <div class="sao-sebastiao-total font-mono">${totalVotos.toLocaleString('pt-BR')} votos</div>
      <div class="sao-sebastiao-meta">${percentual.toFixed(1)}% do total geral da Marcela no DF</div>
    </div>
  `;

  list.innerHTML = saoSebastiao.colegios.map((colegio) => `
    <details class="sao-sebastiao-school" open>
      <summary>
        <span>${colegio.nome}</span>
        <strong>${Number(colegio.totalColegio || 0).toLocaleString('pt-BR')} votos</strong>
      </summary>
      <ul class="sao-sebastiao-secoes">
        ${colegio.secoes.map((secao) => `
          <li>
            <span>Seção ${secao.secao}</span>
            <strong>${Number(secao.votos || 0).toLocaleString('pt-BR')} votos</strong>
          </li>
        `).join('')}
      </ul>
    </details>
  `).join('');

  if (window.lucide) {
    window.lucide.createIcons();
  }
}

function renderZabbixZones() {
  const grid = document.getElementById('zabbixZonesGrid');
  if (!grid) return;

  const zonas = [
    { num: '1ª ZE', loc: 'Asa Sul / Plano Piloto' },
    { num: '2ª ZE', loc: 'Paranoá / Itapoã' },
    { num: '3ª ZE', loc: 'Taguatinga Norte' },
    { num: '4ª ZE', loc: 'Brazlândia' },
    { num: '5ª ZE', loc: 'Gama Sul' },
    { num: '6ª ZE', loc: 'Planaltina' },
    { num: '7ª ZE', loc: 'Sobradinho I e II' },
    { num: '8ª ZE', loc: 'Ceilândia Centro' },
    { num: '9ª ZE', loc: 'Guará I e II' },
    { num: '10ª ZE', loc: 'Núcleo Bandeirante' },
    { num: '11ª ZE', loc: 'Cruzeiro / Sudoeste' },
    { num: '12ª ZE', loc: 'São Sebastião / Área Rural' },
    { num: '13ª ZE', loc: 'Samambaia Norte' },
    { num: '14ª ZE', loc: 'Asa Norte / Lago Norte' },
    { num: '15ª ZE', loc: 'Recanto das Emas' },
    { num: '16ª ZE', loc: 'Ceilândia Sul' },
    { num: '17ª ZE', loc: 'Águas Claras / Vicente Pires' },
    { num: '18ª ZE', loc: 'Santa Maria' },
    { num: '19ª ZE', loc: 'Taguatinga Sul' },
    { num: '20ª ZE', loc: 'Sol Nascente / Pôr do Sol' },
    { num: '21ª ZE', loc: 'Lago Sul / Jardim Botânico' }
  ];

  grid.innerHTML = zonas.map(z => `
    <div class="zone-card">
      <div>
        <strong style="color:white;">${z.num}</strong>
        <div style="font-size:0.68rem; color:#94a3b8;">${z.loc}</div>
      </div>
      <span class="zone-status-dot" title="Zabbix Agent Ativo"></span>
    </div>
  `).join('');
}

function renderZabbixTriggers(alertas) {
  const tbody = document.getElementById('zabbixTriggersTableBody');
  if (!tbody || !alertas) return;

  tbody.innerHTML = alertas.map(a => {
    const isDisaster = a.nivel.includes('DISASTER') || a.nivel.includes('VICTORY');
    return `
      <tr>
        <td>
          <span class="status-badge ${isDisaster ? 'status-green' : 'status-blue'}">
            ${isDisaster ? 'VITÓRIA' : a.nivel}
          </span>
        </td>
        <td class="font-mono">${a.hora}</td>
        <td style="${isDisaster ? 'color:var(--accent-gold-bright); font-weight:bold;' : ''}">${a.mensagem}</td>
        <td class="font-mono" style="font-size:0.75rem;">${a.id}</td>
      </tr>
    `;
  }).join('');
}

function renderServerList(servers) {
  const container = document.getElementById('grafanaServerList');
  if (!container || !servers) return;

  container.innerHTML = servers.map(s => `
    <div class="server-item">
      <div>
        <div class="server-name">${s.nome}</div>
        <div class="server-ip">${s.ip}</div>
      </div>
      <div class="server-metrics">
        <span>CPU: <strong>${s.cpu}</strong></span>
        <span>MEM: <strong>${s.mem}</strong></span>
        <span class="badge-ok">${s.status}</span>
      </div>
    </div>
  `).join('');
}

function initCharts() {
  Chart.defaults.color = '#94a3b8';
  Chart.defaults.font.family = "'Plus Jakarta Sans', sans-serif";

  // Gráfico Regional
  const ctxRegional = document.getElementById('regionalChart')?.getContext('2d');
  if (ctxRegional) {
    regionalChartInstance = new Chart(ctxRegional, {
      type: 'bar',
      data: {
        labels: [],
        datasets: [{
          label: 'Votos Marcela Passamani (15555)',
          data: [],
          backgroundColor: 'rgba(16, 185, 129, 0.7)',
          borderColor: '#10b981',
          borderWidth: 1,
          borderRadius: 6
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { color: 'rgba(255,255,255,0.05)' } },
          y: { grid: { display: false } }
        }
      }
    });
  }

  // Gráfico Grafana: Taxa de Votos
  const ctxVotesRate = document.getElementById('grafanaVotesRateChart')?.getContext('2d');
  if (ctxVotesRate) {
    grafanaVotesRateChartInstance = new Chart(ctxVotesRate, {
      type: 'line',
      data: {
        labels: [],
        datasets: [{
          label: 'Votos Marcela Passamani',
          data: [],
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.15)',
          fill: true,
          tension: 0.35,
          borderWidth: 2,
          pointRadius: 4,
          pointBackgroundColor: '#10b981'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { color: 'rgba(255,255,255,0.05)' } },
          y: { grid: { color: 'rgba(255,255,255,0.05)' } }
        }
      }
    });
  }

  // Gráfico Grafana: Latência TSE
  const ctxLatency = document.getElementById('grafanaLatencyChart')?.getContext('2d');
  if (ctxLatency) {
    grafanaLatencyChartInstance = new Chart(ctxLatency, {
      type: 'line',
      data: {
        labels: [],
        datasets: [{
          label: 'Latência API TSE (ms)',
          data: [],
          borderColor: '#38bdf8',
          backgroundColor: 'rgba(56, 189, 248, 0.1)',
          fill: true,
          tension: 0.3,
          borderWidth: 2,
          pointRadius: 3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { color: 'rgba(255,255,255,0.05)' } },
          y: { min: 20, max: 80, grid: { color: 'rgba(255,255,255,0.05)' } }
        }
      }
    });
  }

  // Gráfico Grafana: Composição de Votos
  const ctxComp = document.getElementById('grafanaVotesCompositionChart')?.getContext('2d');
  if (ctxComp) {
    grafanaVotesCompChartInstance = new Chart(ctxComp, {
      type: 'doughnut',
      data: {
        labels: ['Votos Válidos', 'Brancos', 'Nulos'],
        datasets: [{
          data: [90, 5.5, 4.5],
          backgroundColor: ['#10b981', '#64748b', '#ef4444'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 12 } }
        },
        cutout: '70%'
      }
    });
  }
}

function updateRegionalChart() {
  if (!regionalChartInstance || !appState) return;

  const zonas = appState.candidata.votosPorZona;
  const labels = Object.keys(zonas).map(k => k.split(' (')[0]);
  const data = Object.values(zonas);

  regionalChartInstance.data.labels = labels;
  regionalChartInstance.data.datasets[0].data = data;
  regionalChartInstance.update();
}

function updateGrafanaCharts() {
  if (!appState) return;
  const telemetria = appState.telemetria;

  if (grafanaVotesRateChartInstance && telemetria.historicoVotosMinuto) {
    grafanaVotesRateChartInstance.data.labels = telemetria.historicoVotosMinuto.map(h => h.hora);
    grafanaVotesRateChartInstance.data.datasets[0].data = telemetria.historicoVotosMinuto.map(h => h.votosMarcela);
    grafanaVotesRateChartInstance.update();
  }

  if (grafanaLatencyChartInstance && telemetria.historicoVotosMinuto) {
    grafanaLatencyChartInstance.data.labels = telemetria.historicoVotosMinuto.map(h => h.hora);
    grafanaLatencyChartInstance.data.datasets[0].data = telemetria.historicoVotosMinuto.map(h => h.latenciaMs);
    grafanaLatencyChartInstance.update();
  }

  if (grafanaVotesCompChartInstance) {
    grafanaVotesCompChartInstance.data.datasets[0].data = [
      appState.totalVotosValidos,
      appState.votosBrancos,
      appState.votosNulos
    ];
    grafanaVotesCompChartInstance.update();
  }
}

function triggerVictoryModal(candidata, state) {
  const modal = document.getElementById('victoryOverlay');
  document.getElementById('victoryVotesNumber').innerText = candidata.votos.toLocaleString('pt-BR');
  document.getElementById('victoryRank').innerText = `#${candidata.posicaoRanking} LUGAR GERAL`;
  
  modal.classList.add('active');
  triggerConfettiStorm();
  playVictorySound();
}

function triggerConfettiStorm() {
  if (typeof confetti !== 'function') return;

  const duration = 5 * 1000;
  const animationEnd = Date.now() + duration;
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 10000 };

  function randomInRange(min, max) {
    return Math.random() * (max - min) + min;
  }

  const interval = setInterval(function() {
    const timeLeft = animationEnd - Date.now();
    if (timeLeft <= 0) {
      return clearInterval(interval);
    }
    const particleCount = 50 * (timeLeft / duration);
    confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } }));
    confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } }));
  }, 250);
}

function playVictorySound() {
  if (!soundEnabled) return;

  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    const notes = [
      { freq: 523.25, time: 0.0, dur: 0.15 },
      { freq: 523.25, time: 0.18, dur: 0.15 },
      { freq: 523.25, time: 0.36, dur: 0.15 },
      { freq: 659.25, time: 0.54, dur: 0.35 },
      { freq: 783.99, time: 0.90, dur: 0.25 },
      { freq: 659.25, time: 1.18, dur: 0.20 },
      { freq: 1046.50, time: 1.40, dur: 0.90 }
    ];

    notes.forEach(note => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(note.freq, ctx.currentTime + note.time);

      gain.gain.setValueAtTime(0, ctx.currentTime + note.time);
      gain.gain.linearRampToValueAtTime(0.35, ctx.currentTime + note.time + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + note.time + note.dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + note.time);
      osc.stop(ctx.currentTime + note.time + note.dur);
    });
  } catch (err) {
    console.log('Áudio:', err);
  }
}

function playBeep(freq, dur) {
  if (!soundEnabled) return;
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + dur);
  } catch (e) {}
}
