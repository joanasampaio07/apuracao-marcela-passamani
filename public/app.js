// Sistema de Apuração e Monitoramento Marcela Passamani 15555 MDB - CLDF 2026

let appState = null;
let countdownSeconds = 15 * 60; // 15 minutos em segundos (900s)
let countdownInterval = null;
let currentIntervalMinutes = 15;
let soundEnabled = true;
let hasPlayedVictoryFanfare = false;
let monitorModeEnabled = false;

// Instâncias dos Gráficos Chart.js
let regionalChartInstance = null;
let grafanaVotesRateChartInstance = null;
let grafanaLatencyChartInstance = null;
let grafanaVotesCompChartInstance = null;

function setMonitorMode(enabled) {
  monitorModeEnabled = enabled;
  document.body.classList.toggle('monitor-mode', enabled);
  const monitorButton = document.getElementById('btnMonitorMode');
  if (monitorButton) {
   monitorButton.classList.toggle('active', enabled);
   monitorButton.textContent = enabled ? 'Modo Normal' : 'Modo Monitor';
  }
}

async function toggleFullscreen() {
  try {
   if (!document.fullscreenElement) {
     await document.documentElement.requestFullscreen();
     document.body.classList.add('fullscreen-mode');
   } else {
     await document.exitFullscreen();
     document.body.classList.remove('fullscreen-mode');
   }
  } catch (err) {
   console.warn('Fullscreen não disponível:', err);
  }
}

function updateFeedStatusBanner(state) {
  const banner = document.getElementById('officialFeedBanner');
  if (!banner) return;

  const httpStatus = Number(state?.tseCache?.httpStatus || 0);
  const statusText = String(state?.statusConexaoTSE || '').toUpperCase();
  const waitingForOfficialFeed = state?.modoFonte === 'tse_oficial' && (httpStatus === 404 || statusText.includes('404') || !state?.tseCache?.ultimoTimestampTSE);

  banner.hidden = !waitingForOfficialFeed;
  const title = document.getElementById('officialFeedBannerTitle');
  const text = document.getElementById('officialFeedBannerText');

  if (waitingForOfficialFeed) {
   title.innerText = 'Aguardando feed oficial do TSE';
   text.innerText = 'O painel está pronto para receber e atualizar automaticamente quando a apuração oficial do DF for publicada.';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const selectModoFonte = document.getElementById('selectModoFonte');
  const inputTseUrl = document.getElementById('inputTseUrl');
  const defaultTseUrl = 'https://resultados.tse.jus.br/oficial/ele2026/{ID_ELEICAO}/dados/df/df-c0007-e{ID_ELEICAO}-u.json';

  if (selectModoFonte) selectModoFonte.value = 'tse_oficial';
  if (inputTseUrl) inputTseUrl.value = defaultTseUrl;

  if (window.lucide) {
    window.lucide.createIcons();
  }

  setMonitorMode(false);
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
  const btnManualRefresh = document.getElementById('btnManualRefresh');
  if (btnManualRefresh) {
    btnManualRefresh.addEventListener('click', () => {
      fetchApuracaoData(true);
      resetCountdown();
    });
  }

  const btnConsultarCesp = document.getElementById('btnConsultarCesp');
  if (btnConsultarCesp) {
    btnConsultarCesp.addEventListener('click', () => {
      const municipio = document.getElementById('cespMunicipioInput')?.value || 'BRASILIA';
      const zona = document.getElementById('cespZonaInput')?.value || '18';
      const secao = document.getElementById('cespSecaoInput')?.value || '';
      fetchCespData({ municipio, zona, secao });
    });
  }

  // Modo monitor / tela cheia
  const btnMonitorMode = document.getElementById('btnMonitorMode');
  if (btnMonitorMode) {
    btnMonitorMode.addEventListener('click', () => setMonitorMode(!monitorModeEnabled));
  }

  const btnFullscreen = document.getElementById('btnFullscreen');
  if (btnFullscreen) {
    btnFullscreen.addEventListener('click', toggleFullscreen);
  }

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

  const btnSyncTseBanner = document.getElementById('btnSyncTseNowBanner');
  if (btnSyncTseBanner) {
    btnSyncTseBanner.addEventListener('click', async () => {
      try {
        const res = await fetch('/api/tse/sync-direto', { method: 'POST' });
        const data = await res.json();
        if (data.success) {
          renderDashboard(data.data);
        }
      } catch (err) {
        console.error('Erro ao verificar TSE manualmente:', err);
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
async function fetchCespData({ municipio = 'BRASILIA', zona = '18', secao = '' } = {}) {
  try {
    const params = new URLSearchParams({ municipio, zona });
    if (secao) params.set('secao', secao);
    const response = await fetch(`/api/tse/cesp?${params.toString()}`);
    const json = await response.json();
    if (json && json.success && json.data) {
      if (appState) {
        appState.cespOficial = json.data;
      }
      renderCespData(json.data);
      return;
    }
  } catch (err) {
    console.warn('Falha ao consultar CESP oficial do TSE:', err);
  }

  renderCespData({ success: false, rows: [], error: 'Dados do CESP indisponíveis.' });
}

async function fetchApuracaoData(isManual = false) {
  const refreshIcon = document.getElementById('refreshIcon');
  if (refreshIcon) refreshIcon.classList.add('spin-anim');

  try {
    const res = await fetch('/api/apuracao');
    const json = await res.json();

    if (json.success && json.data) {
      appState = json.data;

      try {
        const tseDetalhadoRes = await fetch('/api/tse/resultado-df');
        const tseDetalhadoJson = await tseDetalhadoRes.json();
        if (tseDetalhadoJson.success && tseDetalhadoJson.data) {
          appState.tseDetalhado = tseDetalhadoJson.data;
          appState.municipioTse = tseDetalhadoJson.data.municipios?.[0] || null;
        }
      } catch (err) {
        console.warn('Falha ao consultar endpoint detalhado do TSE:', err);
      }

      await fetchCespData({
        municipio: document.getElementById('cespMunicipioInput')?.value || 'BRASILIA',
        zona: document.getElementById('cespZonaInput')?.value || '18',
        secao: document.getElementById('cespSecaoInput')?.value || ''
      });
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

  updateFeedStatusBanner(state);

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
  renderZonePerformance(state);
  if (state.cespOficial) {
    renderCespData(state.cespOficial);
  }
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

function renderZonePerformance(state) {
  const grid = document.getElementById('zonePerformanceGrid');
  const list = document.getElementById('sectionPerformanceList');
  if (!grid || !list) return;

  // Usa os dados detalhados oficiais das 21 zonas do TSE se disponíveis
  let zonas = [];
  if (Array.isArray(state?.detalheZonasTSE) && state.detalheZonasTSE.length > 0) {
    zonas = state.detalheZonasTSE.map(z => ({
      nome: z.nome,
      zonaNum: z.numeroZona,
      votos: Number(z.votosMarcela || 0),
      percentual: Number(z.percentualMarcela || 0),
      isSS: z.numeroZona === 18 || z.zona === '0018'
    }));
  } else {
    zonas = Object.entries(state?.candidata?.votosPorZona || {})
      .map(([nome, votos]) => ({
        nome,
        votos: Number(votos || 0),
        isSS: nome.includes('18ª') || nome.includes('São Sebastião')
      }));
  }

  zonas.sort((a, b) => b.votos - a.votos);
  const totalGeral = state?.candidata?.votos || zonas.reduce((sum, z) => sum + z.votos, 0) || 1;

  grid.innerHTML = zonas.map((zona, index) => {
    const pct = zona.percentual || ((zona.votos / totalGeral) * 100);
    const isDestaqueSS = zona.isSS;
    const borderStyle = isDestaqueSS ? 'border: 2px solid #10b981; background: rgba(16,185,129,0.12);' : 'border:1px solid rgba(148,163,184,0.16); background: rgba(15,23,42,0.7);';

    return `
      <div style="padding:12px; border-radius:12px; ${borderStyle}">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 8px;">
          <span style="font-size:0.72rem; letter-spacing:0.08em; text-transform:uppercase; color:#94a3b8;">#${index + 1} ${isDestaqueSS ? '⭐ 18ª ZE' : ''}</span>
          <span style="background: rgba(16,185,129,0.18); color:#a7f3d0; border:1px solid rgba(16,185,129,0.3); border-radius:999px; padding:3px 8px; font-size:0.7rem; font-weight:700;">${pct.toFixed(2)}%</span>
        </div>
        <div style="font-weight:700; color:#f8fafc; margin-bottom:6px; font-size:0.88rem;">${zona.nome}</div>
        <div class="font-mono" style="font-size:1.15rem; color:#10b981; font-weight:700;">${zona.votos.toLocaleString('pt-BR')} votos</div>
      </div>
    `;
  }).join('');

  const secoes = [];
  (state?.saoSebastiao?.colegios || []).forEach((colegio) => {
    (colegio.secoes || []).forEach((secao) => {
      secoes.push({
        nome: `${colegio.nome} • Seção ${secao.secao}`,
        votos: Number(secao.votos || 0)
      });
    });
  });

  const topSecoes = secoes.sort((a, b) => b.votos - a.votos).slice(0, 8);
  list.innerHTML = topSecoes.map((secao, index) => `
    <div style="display:flex; align-items:center; justify-content:space-between; gap: 10px; padding:10px 12px; background: rgba(15,23,42,0.72); border:1px solid rgba(148,163,184,0.14); border-radius:10px;">
      <div>
        <div style="font-size:0.7rem; letter-spacing:0.06em; color:#94a3b8; text-transform:uppercase;">#${index + 1}</div>
        <div style="color:#f8fafc;">${secao.nome}</div>
      </div>
      <div class="font-mono" style="color:#38bdf8; font-size:1rem; font-weight:700;">${secao.votos.toLocaleString('pt-BR')}</div>
    </div>
  `).join('');
}

function renderCespData(data) {
  const container = document.getElementById('cespOfficialInfo');
  if (!container) return;

  if (!data || !data.success || !Array.isArray(data.rows) || data.rows.length === 0) {
    container.innerHTML = `
      <div style="padding: 12px 14px; border-radius: 12px; background: rgba(148, 163, 184, 0.08); color: #cbd5e1; border: 1px solid rgba(148, 163, 184, 0.15);">
        Base oficial CESP da 18ª ZE indisponível no momento. O painel local de São Sebastião e área rural continua em acompanhamento operativo.
      </div>
    `;
    return;
  }

  const rows = data.rows.slice(0, 6);
  const firstRow = rows[0] || {};

  container.innerHTML = `
    <div style="display:flex; justify-content:space-between; gap:12px; flex-wrap:wrap; padding: 12px 14px; border-radius: 12px; background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.25); color: #d1fae5;">
      <div>
        <div style="font-size:0.72rem; letter-spacing:0.08em; text-transform:uppercase; color:#a7f3d0;">CESP • ${firstRow.NM_MUNICIPIO || 'BRASÍLIA'}</div>
        <strong style="font-size:1.05rem;">${data.total ?? rows.length} registros</strong>
      </div>
      <div style="text-align:right; font-size:0.8rem; color:#cbd5e1;">
        <div>Zona ${firstRow.NR_ZONA || '18'}</div>
        <div>Origem: TSE/CDN oficial</div>
      </div>
    </div>
    <div style="display:grid; gap: 8px;">
      ${rows.map((row) => `
        <div style="padding: 10px 12px; border-radius: 10px; background: rgba(15, 23, 42, 0.84); border: 1px solid rgba(148, 163, 184, 0.15);">
          <div style="display:flex; justify-content:space-between; gap: 10px; align-items:center; flex-wrap:wrap;">
            <strong style="color:#f8fafc;">Seção ${row.NR_SECAO || '—'}</strong>
            <span style="font-size:0.75rem; color:#94a3b8;">Local ${row.NR_LOCAL_VOTACAO || '—'}</span>
          </div>
          <div style="margin-top:6px; font-size:0.78rem; color:#cbd5e1;">
            Urna esperada: ${row.NR_URNA_ESPERADA || '—'} • Correspondência: ${row.ST_CORRESP_ALTERADA === 'N' ? 'Normal' : row.ST_CORRESP_ALTERADA || '—'}
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function renderZabbixZones() {
  const grid = document.getElementById('zabbixZonesGrid');
  if (!grid) return;

  const zonas = [
    { num: '1ª ZE', loc: 'Asa Sul / Plano Piloto' },
    { num: '2ª ZE', loc: 'Taguatinga Norte / Vicente Pires' },
    { num: '3ª ZE', loc: 'Taguatinga Sul' },
    { num: '4ª ZE', loc: 'Guará / Setor Complementar' },
    { num: '5ª ZE', loc: 'Gama' },
    { num: '6ª ZE', loc: 'Planaltina' },
    { num: '7ª ZE', loc: 'Sobradinho / Fercal' },
    { num: '8ª ZE', loc: 'Ceilândia Norte' },
    { num: '9ª ZE', loc: 'Núcleo Bandeirante / Candangolândia' },
    { num: '10ª ZE', loc: 'Brazlândia' },
    { num: '11ª ZE', loc: 'Cruzeiro / Sudoeste / Octogonal' },
    { num: '12ª ZE', loc: 'Brasília / Lago Norte' },
    { num: '13ª ZE', loc: 'Samambaia Norte' },
    { num: '14ª ZE', loc: 'Asa Norte / Plano Piloto' },
    { num: '15ª ZE', loc: 'Recanto das Emas' },
    { num: '16ª ZE', loc: 'Ceilândia Sul' },
    { num: '17ª ZE', loc: 'Águas Claras / Arniqueira' },
    { num: '18ª ZE', loc: 'São Sebastião / Jardim Botânico / Área Rural' },
    { num: '19ª ZE', loc: 'Samambaia Sul' },
    { num: '20ª ZE', loc: 'Santa Maria' },
    { num: '21ª ZE', loc: 'Paranoá / Itapoã' }
  ];

  grid.innerHTML = zonas.map(z => `
    <div class="zone-card" style="${z.num.includes('18ª') ? 'border: 1px solid #10b981; background: rgba(16,185,129,0.1);' : ''}">
      <div>
        <strong style="color:white;">${z.num}</strong>
        <div style="font-size:0.68rem; color:#94a3b8;">${z.loc}</div>
      </div>
      <span class="zone-status-dot" title="TSE Online"></span>
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
