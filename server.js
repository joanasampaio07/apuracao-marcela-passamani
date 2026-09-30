import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const DEFAULT_PORT = parseInt(process.env.PORT, 10) || 5555;

const SAO_SEBASTIAO_LOCALS = [
  { codigo_local: '1015', nome: 'CEF Centauro', secoes: ['0012', '0013', '0014', '0015'] },
  { codigo_local: '1023', nome: 'EC Agrovila São José', secoes: ['0020', '0021', '0022', '0023'] },
  { codigo_local: '1040', nome: 'Centro Educacional São Sebastião (CESS)', secoes: ['0030', '0031', '0032', '0033', '0034'] },
  { codigo_local: '1058', nome: 'EC 01 de São Sebastião', secoes: ['0040', '0041', '0042', '0043'] },
  { codigo_local: '1060', nome: 'CEI São Sebastião', secoes: ['0050', '0051', '0052'] },
  { codigo_local: '1075', nome: 'Colégio Sagrado Coração', secoes: ['0060', '0061', '0062', '0063'] },
  { codigo_local: '1082', nome: 'Escola de Educação Infantil Vila Nova', secoes: ['0070', '0071', '0072'] },
  { codigo_local: '1098', nome: 'EMEF Leonardo da Vinci', secoes: ['0080', '0081', '0082', '0083'] }
];

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Estado da Apuração Eleitoral DF - Marcela Passamani (15555 MDB)
const ELECTION_STATE = {
  electionDate: '2026-10-04',
  cargo: 'Deputada Distrital',
  codigoCargoTSE: '0007', // 0007 = Deputado Distrital / Estadual no TSE
  uf: 'df',
  anoEleicao: 'ele2026',
  idEleicao: '021272', // Código oficial do pleito (ex: obtido em ele-c.json)
  totalVagasCLDF: 24,
  totalSecoes: 6850,
  secoesApuradas: 1713,
  percentualApurado: 25.0,
  totalEleitoresDF: 2205500,
  totalVotosApurados: 440659,
  totalVotosValidos: 396990,
  votosBrancos: 24236,
  votosNulos: 19830,
  quocienteEleitoralEstimado: 71200,
  ultimaAtualizacao: new Date().toISOString(),
  intervaloAtualizacaoMinutos: 15,
  modoFonte: 'tse_oficial', // 'tse_oficial' | 'simulado'
  statusConexaoTSE: 'CONECTADO_CDN_TSE',
  
  // Cache HTTP da CDN do TSE
  tseCache: {
    lastEtag: null,
    lastModified: null,
    httpStatus: 200,
    ultimoTimestampTSE: null
  },

  // Candidata Principal: Marcela Passamani (15555 - MDB)
  candidata: {
    nome: 'MARCELA PASSAMANI',
    numero: '15555',
    partido: 'MDB (Movimento Democrático Brasileiro)',
    coligacao: 'MDB / PP / UNIÃO / AVANTE',
    foto: '/assets/marcela_passamani.jpg',
    votos: 8113,
    percentualValidos: 2.04,
    posicaoRanking: 3,
    status: 'EM_APURACAO', // 'EM_APURACAO' | 'ELEITA' | 'ELEITA_POR_QP' | 'ELEITA_POR_MEDIA'
    statusDescricao: 'Em Apuração (3º Lugar Provisório)',
    metaVotosEleicao: 24500,
    probabilidadeEleicao: 88.5,
    votosPorZona: {
      'Plano Piloto / Asa Sul / Asa Norte (1ª e 14ª ZE)': 1785,
      'Águas Claras e Vicente Pires (17ª ZE)': 1460,
      'Taguatinga (3ª e 19ª ZE)': 1217,
      'Guará e Sudoeste (9ª e 11ª ZE)': 1136,
      'Ceilândia (16ª e 20ª ZE)': 974,
      'São Sebastião e Santa Maria (18ª ZE)': 820,
      'Gama (5ª ZE)': 649,
      'Sobradinho e Planaltina (6ª e 7ª ZE)': 487,
      'Samambaia e Recanto das Emas (13ª e 15ª ZE)': 406
    }
  },

  saoSebastiao: {
    totalVotos: 820,
    percentualDoDf: 10.1,
    colegios: SAO_SEBASTIAO_LOCALS.map((local) => ({
      codigo_local: local.codigo_local,
      nome: local.nome,
      totalColegio: 0,
      secoes: local.secoes.map((secao) => ({ secao, votos: 0 }))
    }))
  },

  // Ranking candidatos CLDF (Nota: No dia 04/10 a lista inteira é preenchida 100% dinâmica pelo TSE)
  candidatosCLDF: [
    { rank: 1, nome: 'CHICO VIGILANTE', partido: 'PT', numero: '13123', votos: 9898, percentual: 2.49, status: 'Dentro da Vaga' },
    { rank: 2, nome: 'MARCELA PASSAMANI', partido: 'MDB', numero: '15555', votos: 8113, percentual: 2.04, status: 'Dentro da Vaga', destaque: true },
    { rank: 3, nome: 'ROBÉRIO NEGREIROS', partido: 'PSD', numero: '55123', votos: 7626, percentual: 1.92, status: 'Dentro da Vaga' },
    { rank: 4, nome: 'WELLINGTON LUIZ', partido: 'MDB', numero: '15123', votos: 7383, percentual: 1.86, status: 'Dentro da Vaga' },
    { rank: 5, nome: 'MARTINS MACHADO', partido: 'REPUBLICANOS', numero: '10123', votos: 7058, percentual: 1.78, status: 'Dentro da Vaga' },
    { rank: 6, nome: 'MARTINS MACHADO', partido: 'REPUBLICANOS', numero: '10123', votos: 7058, percentual: 1.78, status: 'Dentro da Vaga' },
    { rank: 7, nome: 'JAQUELINE SILVA', partido: 'MDB', numero: '15456', votos: 6653, percentual: 1.68, status: 'Dentro da Vaga' },
    { rank: 8, nome: 'DANIEL DONIZET', partido: 'MDB', numero: '15789', votos: 6409, percentual: 1.61, status: 'Dentro da Vaga' },
    { rank: 9, nome: 'EDUARDO PEDROSA', partido: 'UNIÃO', numero: '44456', votos: 6247, percentual: 1.57, status: 'Dentro da Vaga' },
    { rank: 10, nome: 'IOLANDO', partido: 'MDB', numero: '15000', votos: 6085, percentual: 1.53, status: 'Dentro da Vaga' },
    { rank: 11, nome: 'DAYSE AMARILIO', partido: 'PSB', numero: '40123', votos: 5922, percentual: 1.49, status: 'Dentro da Vaga' },
    { rank: 12, nome: 'ROOSEVELT VILELA', partido: 'PL', numero: '22123', votos: 5760, percentual: 1.45, status: 'Dentro da Vaga' },
    { rank: 13, nome: 'HERMETO', partido: 'MDB', numero: '15190', votos: 5598, percentual: 1.41, status: 'Dentro da Vaga' },
    { rank: 14, nome: 'PASTOR DANIEL DE CASTRO', partido: 'PP', numero: '11123', votos: 5436, percentual: 1.37, status: 'Dentro da Vaga' },
    { rank: 15, nome: 'JORGE VIANNA', partido: 'PSD', numero: '55456', votos: 5273, percentual: 1.33, status: 'Dentro da Vaga' },
    { rank: 16, nome: 'JOAQUIM RORIZ NETO', partido: 'PL', numero: '22456', votos: 5111, percentual: 1.29, status: 'Dentro da Vaga' },
    { rank: 17, nome: 'THIAGO MANHÃES', partido: 'REPUBLICANOS', numero: '10456', votos: 4949, percentual: 1.25, status: 'Dentro da Vaga' },
    { rank: 18, nome: 'MAX MACIEL', partido: 'PSOL', numero: '50456', votos: 4868, percentual: 1.23, status: 'Dentro da Vaga' },
    { rank: 19, nome: 'GABRIEL MAGNO', partido: 'PT', numero: '13456', votos: 4706, percentual: 1.19, status: 'Dentro da Vaga' },
    { rank: 20, nome: 'PAULA BELMONTE', partido: 'CIDADANIA', numero: '23123', votos: 4624, percentual: 1.16, status: 'Dentro da Vaga' },
    { rank: 21, nome: 'RICARDO VALE', partido: 'PT', numero: '13789', votos: 4462, percentual: 1.12, status: 'Dentro da Vaga' },
    { rank: 22, nome: 'PEPA', partido: 'PP', numero: '11456', votos: 4381, percentual: 1.10, status: 'Dentro da Vaga' },
    { rank: 23, nome: 'JOÃO CARDOSO', partido: 'AVANTE', numero: '70123', votos: 4219, percentual: 1.06, status: 'Dentro da Vaga' },
    { rank: 24, nome: 'DRA. JANE', partido: 'MDB', numero: '15888', votos: 4057, percentual: 1.02, status: 'Dentro da Vaga' }
  ],

  // Telemetria Zabbix & Grafana
  telemetria: {
    statusZabbixAgent: 'ONLINE',
    tsePingMs: 42,
    apiErrorsLastHour: 0,
    taxaRequisicoesMinuto: 120,
    ultimoPayloadTseBytes: 48200,
    historicoVotosMinuto: [
      { hora: '17:00', votosMarcela: 620, totalApurado: 5.0, latenciaMs: 38 },
      { hora: '17:30', votosMarcela: 1850, totalApurado: 12.5, latenciaMs: 45 },
      { hora: '18:00', votosMarcela: 3420, totalApurado: 20.0, latenciaMs: 42 },
      { hora: '18:30', votosMarcela: 8113, totalApurado: 25.0, latenciaMs: 41 }
    ],
    servidoresMonitorados: [
      { nome: 'SRV-TSE-SCRAPER-CDN', ip: '10.0.4.12', cpu: '16%', mem: '38%', status: 'OK' },
      { nome: 'SRV-GRAFANA-WARROOM', ip: '10.0.4.15', cpu: '22%', mem: '54%', status: 'OK' },
      { nome: 'SRV-ZABBIX-MONITOR', ip: '10.0.4.10', cpu: '11%', mem: '32%', status: 'OK' },
      { nome: 'CDN-TSE-EDGE-NODE', ip: 'resultados.tse.jus.br', cpu: '28%', mem: '60%', status: 'OK' }
    ],
    alertasZabbix: [
      { id: 'AL-001', nivel: 'INFO', mensagem: 'Conexão CDN TSE ativa para Marcela Passamani (15555 MDB).', hora: new Date().toLocaleTimeString('pt-BR') },
      { id: 'AL-002', nivel: 'INFO', mensagem: 'Monitoramento da 18ª Zona Eleitoral (São Sebastião) e DF em tempo real.', hora: new Date().toLocaleTimeString('pt-BR') }
    ]
  }
};

// =======================================================
// 1. AUTO-DESCOBERTA DO CÓDIGO DA ELEIÇÃO (ele-c.json)
// =======================================================
async function descobrirCodigoEleicaoTSE() {
  const urlConfigGlobal = `https://resultados.tse.jus.br/oficial/${ELECTION_STATE.anoEleicao}/comum/config/ele-c.json`;
  try {
    const res = await fetch(urlConfigGlobal, {
      headers: { 'User-Agent': 'PainelEleicoesWarRoom/2.0 (Marcela Passamani 15555 MDB)' }
    });
    if (res.ok) {
      const data = await res.json();
      // Procura pleito ordinário 1º turno DF estadual/distrital
      if (Array.isArray(data.pl)) {
        for (const pleito of data.pl) {
          if (Array.isArray(pleito.e)) {
            for (const eleicao of pleito.e) {
              if (eleicao.t === '1' && (eleicao.cdabr === 'DF' || eleicao.tpabr === 'UF' || eleicao.nm?.includes('Ordinária'))) {
                ELECTION_STATE.idEleicao = eleicao.cd;
                console.log(`[TSE AUTO-CONFIG] ID da Eleição identificado: ${ELECTION_STATE.idEleicao}`);
                return eleicao.cd;
              }
            }
          }
        }
      }
    }
  } catch (err) {
    console.log(`[TSE AUTO-CONFIG] Aviso ao ler ele-c.json (${err.message}). Mantendo idEleicao: ${ELECTION_STATE.idEleicao}`);
  }
  return ELECTION_STATE.idEleicao;
}

// =======================================================
// 2. PARSER OFICIAL DE JSON DA CDN DO TSE (Hierárquico e Simplificado)
// =======================================================
function processarPayloadOficialTSE(tseData) {
  try {
    const psaStr = tseData.psa || tseData.pst || '0,00';
    const percentualApurado = parseFloat(psaStr.replace(',', '.'));
    const dataGeracao = tseData.dg || '04/10/2026';
    const horaGeracao = tseData.hg || new Date().toLocaleTimeString('pt-BR');

    ELECTION_STATE.percentualApurado = percentualApurado;
    ELECTION_STATE.secoesApuradas = Math.round((percentualApurado / 100) * ELECTION_STATE.totalSecoes);
    ELECTION_STATE.tseCache.ultimoTimestampTSE = `${dataGeracao} ${horaGeracao}`;

    let todosCandidatos = [];

    // Formato 1: Estrutura Completa TSE (-u.json) -> carg -> agr -> par -> cand
    if (Array.isArray(tseData.carg)) {
      for (const cargo of tseData.carg) {
        if (cargo.cd === '7' || cargo.cd === '0007' || cargo.nmn?.toUpperCase().includes('DISTRITAL')) {
          for (const agregacao of (cargo.agr || [])) {
            for (const partido of (agregacao.par || [])) {
              for (const c of (partido.cand || [])) {
                const votos = parseInt(c.vap || '0');
                const pct = parseFloat((c.pvap || '0,00').replace(',', '.'));
                const isMarcela = c.n === '15555' || c.nm?.toUpperCase().includes('PASSAMANI') || c.nm?.toUpperCase().includes('MARCELA');

                todosCandidatos.push({
                  nome: c.nm,
                  numero: c.n,
                  partido: partido.sg || partido.n || (isMarcela ? 'MDB' : 'PARTIDO'),
                  votos: votos,
                  percentual: pct,
                  status: c.st || 'Em Apuração',
                  destaque: isMarcela
                });
              }
            }
          }
        }
      }
    }

    // Formato 2: Estrutura Simplificada TSE (-r.json) -> cand
    if (todosCandidatos.length === 0 && Array.isArray(tseData.cand)) {
      todosCandidatos = tseData.cand.map(c => {
        const votos = parseInt(c.vap || '0');
        const pct = parseFloat((c.pvap || '0,00').replace(',', '.'));
        const isMarcela = c.n === '15555' || c.nm?.toUpperCase().includes('PASSAMANI') || c.nm?.toUpperCase().includes('MARCELA');

        return {
          nome: c.nm,
          numero: c.n,
          partido: c.nv || c.cc || (isMarcela ? 'MDB' : 'PARTIDO'),
          votos: votos,
          percentual: pct,
          status: c.st || (c.e === 's' ? 'ELEITA' : 'Em Apuração'),
          destaque: isMarcela
        };
      });
    }

    // Se encontramos candidatos no JSON oficial do TSE
    if (todosCandidatos.length > 0) {
      todosCandidatos.sort((a, b) => b.votos - a.votos);
      todosCandidatos.forEach((c, idx) => c.rank = idx + 1);
      ELECTION_STATE.candidatosCLDF = todosCandidatos.slice(0, 24);

      // Localizar Marcela Passamani (15555 MDB)
      const marcela = todosCandidatos.find(c => c.destaque);
      if (marcela) {
        ELECTION_STATE.candidata.votos = marcela.votos;
        ELECTION_STATE.candidata.percentualValidos = marcela.percentual;
        ELECTION_STATE.candidata.posicaoRanking = marcela.rank;

        const isEleitaTSE = marcela.status.toUpperCase().includes('ELEITO') || 
                            marcela.status.toUpperCase().includes('ELEITA') || 
                            (percentualApurado >= 85 && marcela.rank <= 24);

        if (isEleitaTSE) {
          ELECTION_STATE.candidata.status = 'ELEITA';
          ELECTION_STATE.candidata.probabilidadeEleicao = 100.0;
          ELECTION_STATE.candidata.statusDescricao = 'OFICIALMENTE ELEITA DEPUTADA DISTRITAL (15555 MDB)!';
          
          // Alerta Zabbix
          const jaTem = ELECTION_STATE.telemetria.alertasZabbix.some(a => a.id === 'AL-ELEITA-TSE');
          if (!jaTem) {
            ELECTION_STATE.telemetria.alertasZabbix.unshift({
              id: 'AL-ELEITA-TSE',
              nivel: 'DISASTER_VICTORY',
              mensagem: `🚨 CONFIRMAÇÃO OFICIAL DO TSE: MARCELA PASSAMANI (15555 MDB) ELEITA COM ${marcela.votos.toLocaleString('pt-BR')} VOTOS!`,
              hora: horaGeracao
            });
          }
        } else {
          ELECTION_STATE.candidata.status = 'EM_APURACAO';
          ELECTION_STATE.candidata.probabilidadeEleicao = parseFloat((70 + (percentualApurado * 0.3)).toFixed(1));
          ELECTION_STATE.candidata.statusDescricao = `Em Apuração (${marcela.rank}º Lugar Provisório)`;
        }
      }
    }

    ELECTION_STATE.statusConexaoTSE = 'LENDO_CDN_TSE_TEMPO_REAL';
    ELECTION_STATE.ultimaAtualizacao = new Date().toISOString();
    return true;
  } catch (err) {
    console.error('[TSE PARSER ERROR]:', err);
    return false;
  }
}

// =======================================================
// 3. CONSULTA HTTP DIRETA À CDN DO TSE (com ETag e If-Modified-Since)
// =======================================================
async function consultarCDNDoTSE() {
  const startTime = Date.now();
  const idEleicao = ELECTION_STATE.idEleicao;
  
  // URL primária do padrão oficial EA20 (-u.json)
  const urlTotalizacao = `https://resultados.tse.jus.br/oficial/${ELECTION_STATE.anoEleicao}/${idEleicao}/dados/df/df-c0007-e${idEleicao}-u.json`;
  
  // Headers com If-None-Match e If-Modified-Since para respeitar cache da CDN
  const reqHeaders = {
    'User-Agent': 'PainelEleicoesWarRoom/2.0 (Marcela Passamani 15555 MDB; TSE Monitor)',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'pt-BR,pt;q=0.9',
    'Origin': 'https://resultados.tse.jus.br',
    'Referer': 'https://resultados.tse.jus.br/'
  };

  if (ELECTION_STATE.tseCache.lastEtag) {
    reqHeaders['If-None-Match'] = ELECTION_STATE.tseCache.lastEtag;
  }
  if (ELECTION_STATE.tseCache.lastModified) {
    reqHeaders['If-Modified-Since'] = ELECTION_STATE.tseCache.lastModified;
  }

  try {
    console.log(`[TSE CDN POLLER] Requisitando: ${urlTotalizacao}`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 9000);

    const res = await fetch(urlTotalizacao, {
      signal: controller.signal,
      headers: reqHeaders
    });

    clearTimeout(timeoutId);
    const latency = Date.now() - startTime;
    ELECTION_STATE.telemetria.tsePingMs = latency;
    ELECTION_STATE.tseCache.httpStatus = res.status;

    if (res.status === 304) {
      console.log(`[TSE CDN] 304 Not Modified: Conteúdo inalterado no cache do TSE.`);
      return { ok: true, status: 304, message: 'Dados inalterados (Cache TSE válido)' };
    }

    if (res.ok) {
      ELECTION_STATE.tseCache.lastEtag = res.headers.get('ETag');
      ELECTION_STATE.tseCache.lastModified = res.headers.get('Last-Modified');

      const json = await res.json();
      ELECTION_STATE.telemetria.ultimoPayloadTseBytes = JSON.stringify(json).length;
      processarPayloadOficialTSE(json);
      
      ELECTION_STATE.telemetria.alertasZabbix.unshift({
        id: `TSE-${Date.now()}`,
        nivel: 'INFO',
        mensagem: `Dados recebidos da CDN do TSE com sucesso (${latency}ms).`,
        hora: new Date().toLocaleTimeString('pt-BR')
      });
      return { ok: true, direct: true, data: json };
    } else {
      console.log(`[TSE CDN] Resposta HTTP ${res.status}. Aguardando início oficial da totalização.`);
      ELECTION_STATE.statusConexaoTSE = `CONEXAO_ESTABELECIDA_STATUS_${res.status}`;
      return { ok: false, status: res.status };
    }
  } catch (err) {
    const latency = Date.now() - startTime;
    ELECTION_STATE.telemetria.tsePingMs = latency;
    console.log(`[TSE CDN INFO] Requisição (${latency}ms): ${err.message}`);
    return { ok: false, error: err.message };
  }
}

function atualizarDadosSaoSebastiao(votosMarcelaAtual) {
  const totalVotosSaoSebastiao = Math.max(0, Math.round(votosMarcelaAtual * 0.101));
  const shares = [0.28, 0.22, 0.18, 0.14, 0.08, 0.05, 0.03, 0.02];

  const colegios = SAO_SEBASTIAO_LOCALS.map((local, index) => {
    const share = shares[index] ?? 0.02;
    const totalColegio = Math.max(0, Math.round(totalVotosSaoSebastiao * share));
    const secoes = local.secoes.map((secao, secaoIndex) => {
      const base = secaoIndex === 0 && local.secoes.length > 1
        ? totalColegio - Math.floor(totalColegio * (local.secoes.length - 1) / local.secoes.length)
        : Math.floor(totalColegio / local.secoes.length);
      return { secao, votos: Math.max(0, base) };
    });

    const totalCalculado = secoes.reduce((sum, secao) => sum + secao.votos, 0);
    const diff = totalColegio - totalCalculado;
    if (diff !== 0 && secoes.length > 0) {
      secoes[0].votos += diff;
    }

    return {
      codigo_local: local.codigo_local,
      nome: local.nome,
      totalColegio: secoes.reduce((sum, secao) => sum + secao.votos, 0),
      secoes
    };
  });

  const totalColegioAjustado = colegios.reduce((sum, colegio) => sum + colegio.totalColegio, 0);
  const diferenca = totalVotosSaoSebastiao - totalColegioAjustado;
  if (Math.abs(diferenca) > 0 && colegios.length) {
    colegios[0].secoes[0].votos += diferenca;
    colegios[0].totalColegio += diferenca;
  }

  const totalGeral = ELECTION_STATE.candidata?.votos ?? votosMarcelaAtual;
  ELECTION_STATE.candidata.votosPorZona['São Sebastião e Santa Maria (18ª ZE)'] = totalVotosSaoSebastiao;
  ELECTION_STATE.saoSebastiao = {
    totalVotos: totalVotosSaoSebastiao,
    percentualDoDf: totalGeral > 0 ? parseFloat(((totalVotosSaoSebastiao / totalGeral) * 100).toFixed(1)) : 0,
    colegios
  };
}

// Recalcular simulação
function recalcularEleicao(pctApurado) {
  pctApurado = Math.min(100, Math.max(0, pctApurado));
  ELECTION_STATE.percentualApurado = parseFloat(pctApurado.toFixed(2));
  ELECTION_STATE.secoesApuradas = Math.round((pctApurado / 100) * ELECTION_STATE.totalSecoes);
  
  const totalValidosFinalEstimado = 1587960;
  ELECTION_STATE.totalVotosValidos = Math.round((pctApurado / 100) * totalValidosFinalEstimado);
  ELECTION_STATE.totalVotosApurados = Math.round(ELECTION_STATE.totalVotosValidos * 1.11);
  ELECTION_STATE.votosBrancos = Math.round(ELECTION_STATE.totalVotosApurados * 0.055);
  ELECTION_STATE.votosNulos = Math.round(ELECTION_STATE.totalVotosApurados * 0.045);
  
  const votosFinalMarcela = 32450;
  const votosAtuaisMarcela = Math.round((pctApurado / 100) * votosFinalMarcela);
  ELECTION_STATE.candidata.votos = votosAtuaisMarcela;
  ELECTION_STATE.candidata.percentualValidos = ELECTION_STATE.totalVotosValidos > 0 
    ? parseFloat(((votosAtuaisMarcela / ELECTION_STATE.totalVotosValidos) * 100).toFixed(2)) 
    : 0;

  const pesosRegiao = {
    'Plano Piloto / Asa Sul / Asa Norte (1ª e 14ª ZE)': 0.22,
    'Águas Claras e Vicente Pires (17ª ZE)': 0.18,
    'Taguatinga (3ª e 19ª ZE)': 0.15,
    'Guará e Sudoeste (9ª e 11ª ZE)': 0.14,
    'Ceilândia (16ª e 20ª ZE)': 0.12,
    'São Sebastião e Santa Maria (18ª ZE)': 0.09,
    'Gama (5ª ZE)': 0.07,
    'Sobradinho e Planaltina (6ª e 7ª ZE)': 0.06,
    'Samambaia e Recanto das Emas (13ª e 15ª ZE)': 0.05
  };

  for (const regiao in pesosRegiao) {
    ELECTION_STATE.candidata.votosPorZona[regiao] = Math.round(votosAtuaisMarcela * pesosRegiao[regiao]);
  }

    atualizarDadosSaoSebastiao(votosAtuaisMarcela);

    const multiplicadores = [1.22, 1.12, 1.00, 0.94, 0.91, 0.87, 0.82, 0.79, 0.77, 0.75, 0.73, 0.71, 0.69, 0.67, 0.65, 0.63, 0.61, 0.60, 0.58, 0.57, 0.55, 0.54, 0.52, 0.50];
  
  ELECTION_STATE.candidatosCLDF = ELECTION_STATE.candidatosCLDF.map((cand, idx) => {
    let votosCand = cand.destaque ? votosAtuaisMarcela : Math.round(votosAtuaisMarcela * (multiplicadores[idx] || 0.5));
    let pctCand = ELECTION_STATE.totalVotosValidos > 0 ? parseFloat(((votosCand / ELECTION_STATE.totalVotosValidos) * 100).toFixed(2)) : 0;
    
    let statusCand = 'Dentro da Vaga';
    if (pctApurado >= 85) {
      statusCand = idx < 16 ? 'ELEITO POR QP' : (idx < 24 ? 'ELEITO POR MÉDIA' : 'SUPLENTE');
    }

    return {
      ...cand,
      votos: votosCand,
      percentual: pctCand,
      status: statusCand
    };
  });

  ELECTION_STATE.candidatosCLDF.sort((a, b) => b.votos - a.votos);
  ELECTION_STATE.candidatosCLDF.forEach((cand, idx) => {
    cand.rank = idx + 1;
    if (cand.destaque) {
      ELECTION_STATE.candidata.posicaoRanking = idx + 1;
    }
  });

  if (pctApurado < 40) {
    ELECTION_STATE.candidata.status = 'EM_APURACAO';
    ELECTION_STATE.candidata.probabilidadeEleicao = parseFloat((70 + (pctApurado * 0.4)).toFixed(1));
    ELECTION_STATE.candidata.statusDescricao = `Em Apuração (${ELECTION_STATE.candidata.posicaoRanking}º Lugar Provisório)`;
  } else if (pctApurado < 70) {
    ELECTION_STATE.candidata.status = 'EM_APURACAO';
    ELECTION_STATE.candidata.probabilidadeEleicao = parseFloat((86 + (pctApurado * 0.15)).toFixed(1));
    ELECTION_STATE.candidata.statusDescricao = `Forte Tendência de Eleição (${ELECTION_STATE.candidata.posicaoRanking}º Lugar)`;
  } else if (pctApurado < 85) {
    ELECTION_STATE.candidata.status = 'ELEITA';
    ELECTION_STATE.candidata.probabilidadeEleicao = 99.4;
    ELECTION_STATE.candidata.statusDescricao = 'MATEMATICAMENTE ELEITA (Quociente Partidário MDB Assegurado)';
  } else {
    ELECTION_STATE.candidata.status = 'ELEITA';
    ELECTION_STATE.candidata.probabilidadeEleicao = 100.0;
    ELECTION_STATE.candidata.statusDescricao = 'ELEITA DEPUTADA DISTRITAL OFICIALMENTE!';
  }

  if (ELECTION_STATE.candidata.status === 'ELEITA') {
    const jaTemAlertaEleita = ELECTION_STATE.telemetria.alertasZabbix.some(a => a.id === 'AL-ELEITA');
    if (!jaTemAlertaEleita) {
      ELECTION_STATE.telemetria.alertasZabbix.unshift({
        id: 'AL-ELEITA',
        nivel: 'DISASTER_VICTORY',
        mensagem: '🚨 VITÓRIA CONFIRMADA: MARCELA PASSAMANI (15555 MDB) ELEITA DEPUTADA DISTRITAL NO DF!',
        hora: new Date().toLocaleTimeString('pt-BR')
      });
    }
  }

  const now = new Date();
  const horaFormatada = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  ELECTION_STATE.telemetria.historicoVotosMinuto.push({
    hora: horaFormatada,
    votosMarcela: votosAtuaisMarcela,
    totalApurado: pctApurado,
    latenciaMs: ELECTION_STATE.telemetria.tsePingMs || 42
  });
  if (ELECTION_STATE.telemetria.historicoVotosMinuto.length > 12) {
    ELECTION_STATE.telemetria.historicoVotosMinuto.shift();
  }

  ELECTION_STATE.ultimaAtualizacao = new Date().toISOString();
}

recalcularEleicao(25);

// =======================================================
// 4. CICLO DE POLLING A CADA 30 MINUTOS (OU PERSONALIZADO)
// =======================================================
let pollerInterval = setInterval(async () => {
  console.log(`[WAR ROOM AUTO-POLLER] Executando consulta periódica à CDN do TSE (a cada 15 min)...`);
  if (ELECTION_STATE.modoFonte === 'tse_oficial') {
    await consultarCDNDoTSE();
  }
}, 15 * 60 * 1000);

// =======================================================
// 5. ROTAS DA API REST
// =======================================================
app.get('/api/apuracao', async (req, res) => {
  res.json({
    success: true,
    data: ELECTION_STATE
  });
});

// Sincronização direta sob demanda
app.post('/api/tse/sync-direto', async (req, res) => {
  const result = await consultarCDNDoTSE();
  res.json({
    success: true,
    result: result,
    data: ELECTION_STATE
  });
});

// Descoberta automática de ID do pleito
app.post('/api/tse/auto-discover', async (req, res) => {
  const cd = await descobrirCodigoEleicaoTSE();
  res.json({
    success: true,
    idEleicao: cd,
    data: ELECTION_STATE
  });
});

// Importação manual de JSON Oficial do TSE
app.post('/api/tse/importar-json', (req, res) => {
  const { jsonTSE } = req.body;
  if (!jsonTSE) {
    return res.status(400).json({ error: 'Payload JSON do TSE ausente.' });
  }

  const ok = processarPayloadOficialTSE(jsonTSE);
  if (ok) {
    res.json({ success: true, message: 'JSON Oficial da CDN processado com sucesso!', data: ELECTION_STATE });
  } else {
    res.status(400).json({ error: 'Falha ao processar a estrutura do JSON do TSE.' });
  }
});

// Controles do Simulador
app.post('/api/apuracao/set-percentual', (req, res) => {
  const { percentual } = req.body;
  if (percentual === undefined || isNaN(percentual)) {
    return res.status(400).json({ error: 'Percentual inválido' });
  }
  recalcularEleicao(parseFloat(percentual));
  res.json({ success: true, data: ELECTION_STATE });
});

app.post('/api/apuracao/avancar-passo', (req, res) => {
  let novoPct = ELECTION_STATE.percentualApurado + 15;
  if (novoPct > 100) novoPct = 100;
  recalcularEleicao(novoPct);
  res.json({ success: true, data: ELECTION_STATE });
});

app.post('/api/apuracao/reset', (req, res) => {
  recalcularEleicao(5);
  res.json({ success: true, data: ELECTION_STATE });
});

// Configurações
app.post('/api/config', (req, res) => {
  const { intervaloMinutos, modoFonte, idEleicao, anoEleicao } = req.body;
  if (intervaloMinutos) {
    ELECTION_STATE.intervaloAtualizacaoMinutos = parseFloat(intervaloMinutos);
    clearInterval(pollerInterval);
    pollerInterval = setInterval(async () => {
      if (ELECTION_STATE.modoFonte === 'tse_oficial') {
        await consultarCDNDoTSE();
      }
    }, ELECTION_STATE.intervaloAtualizacaoMinutos * 60 * 1000);
  }
  if (modoFonte) ELECTION_STATE.modoFonte = modoFonte;
  if (idEleicao) ELECTION_STATE.idEleicao = idEleicao;
  if (anoEleicao) ELECTION_STATE.anoEleicao = anoEleicao;
  
  res.json({ success: true, message: 'Configurações de CDN do TSE atualizadas', data: ELECTION_STATE });
});

// Zabbix Metrics Endpoint
app.get('/api/metrics/zabbix', (req, res) => {
  res.json({
    timestamp: Date.now(),
    host: 'WARROOM-MARCELA-PASSAMANI-15555-MDB',
    items: {
      'tse.conexao_status': ELECTION_STATE.statusConexaoTSE,
      'tse.id_eleicao': ELECTION_STATE.idEleicao,
      'tse.http_status': ELECTION_STATE.tseCache.httpStatus,
      'tse.latency_ms': ELECTION_STATE.telemetria.tsePingMs,
      'tse.ultimo_timestamp': ELECTION_STATE.tseCache.ultimoTimestampTSE || 'N/A',
      'eleicao.df.percentual_apurado': ELECTION_STATE.percentualApurado,
      'eleicao.df.secoes_apuradas': ELECTION_STATE.secoesApuradas,
      'eleicao.marcela.numero': '15555',
      'eleicao.marcela.partido': 'MDB',
      'eleicao.marcela.votos': ELECTION_STATE.candidata.votos,
      'eleicao.marcela.percentual': ELECTION_STATE.candidata.percentualValidos,
      'eleicao.marcela.ranking': ELECTION_STATE.candidata.posicaoRanking,
      'eleicao.marcela.status_eleita': ELECTION_STATE.candidata.status === 'ELEITA' ? 1 : 0
    }
  });
});

// Grafana Metrics Endpoint
app.get('/api/metrics/grafana', (req, res) => {
  res.json({
    metrics: ELECTION_STATE.telemetria.historicoVotosMinuto,
    regional: ELECTION_STATE.candidata.votosPorZona,
    topCandidatos: ELECTION_STATE.candidatosCLDF.slice(0, 10),
    servers: ELECTION_STATE.telemetria.servidoresMonitorados,
    alerts: ELECTION_STATE.telemetria.alertasZabbix,
    candidataInfo: {
      nome: 'MARCELA PASSAMANI',
      numero: '15555',
      partido: 'MDB'
    },
    tseTelemetry: {
      pingMs: ELECTION_STATE.telemetria.tsePingMs,
      status: ELECTION_STATE.statusConexaoTSE,
      payloadBytes: ELECTION_STATE.telemetria.ultimoPayloadTseBytes,
      httpStatus: ELECTION_STATE.tseCache.httpStatus
    }
  });
});

function startServer(port) {
  const server = app.listen(port, () => {
    console.log(`\n================================================================`);
    console.log(` ⭐ WAR ROOM MARCELA PASSAMANI (15555 MDB) ONLINE!`);
    console.log(` 👉 ACESSE NO SEU NAVEGADOR: http://localhost:${port}`);
    console.log(`================================================================\n`);
    descobrirCodigoEleicaoTSE();
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`[AVISO] Porta ${port} em uso por outro aplicativo. Tentando porta ${port + 1}...`);
      startServer(port + 1);
    } else {
      console.error('[ERRO SERVIDOR]', err);
    }
  });
}

startServer(DEFAULT_PORT);
