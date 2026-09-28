# 🗳️ Sistema de Apuração e War Room - Marcela Passamani (Deputada Distrital - DF)

Sistema de alta performance para apuração ao vivo, projeção matemática e observabilidade eleitoral para **Marcela Passamani** (Deputada Distrital no Distrito Federal).

---

## ✨ Funcionalidades Principais

1. **Atualização Automática a cada 30 Minutos (ou Personalizada)**:
   - Temporizador regressivo em tempo real no topo da tela.
   - Botão **"Atualizar Agora"** para sincronização imediata.
   - Intervalos configuráveis: 30m, 15m, 5m, 1m ou 30s.

2. **Tela e Alerta de Vitória: "ELEITA DEPUTADA DISTRITAL"**:
   - Quando a apuração atinge a projeção matemática de eleição segura (Quociente Partidário garantido e mais de 24.500 votos), o sistema dispara automaticamente uma **tela de celebração épica** com:
     - Chuva de confetes dourados contínua (`canvas-confetti`).
     - Fanfarra triunfal sintetizada via **Web Audio API** (sem necessidade de arquivos de áudio externos).
     - Badge dourado e destaque no War Room.

3. **Painel Grafana Integrado (Observabilidade)**:
   - Gráfico em tempo real de votos por minuto da Marcela Passamani.
   - Gráfico de latência e saúde da API do TSE.
   - Distribuição de votos válidos, brancos e nulos.
   - Endpoint nativo para conectar a instâncias reais do Grafana: `http://localhost:3000/api/metrics/grafana`.

4. **Monitor Zabbix 7.0 Integrado (Infraestrutura & Zonas Eleitorais)**:
   - Telemetria de nós servidores de ingestão.
   - Status dos 21 Agentes Zabbix correspondentes às **21 Zonas Eleitorais do TRE-DF** (Plano Piloto, Ceilândia, Taguatinga, Águas Claras, Gama, Samambaia, Sobradinho, Planaltina, etc.).
   - Endpoint de métricas compatível com Zabbix / Prometheus: `http://localhost:3000/api/metrics/zabbix`.

5. **Distribuição Geográfica de Votos no DF**:
   - Gráfico de barras e listagem por Região Administrativa do Distrito Federal.

6. **Ranking ao Vivo dos 24 Deputados Distritais (CLDF)**:
   - Lista completa com status de eleito por Quociente Partidário (QP) e por Média.

7. **Simulador de War Room**:
   - Permite testar todos os cenários da apuração antes do domingo de eleição (04 de Outubro).

---

## 🚀 Como Executar o Sistema

No terminal:

```bash
# 1. Acesse a pasta do projeto
cd C:\Users\Admin\.gemini\antigravity-ide\scratch\apuracao-marcela-passamani

# 2. Instale as dependências (caso ainda não tenha feito)
npm install

# 3. Inicie o servidor
npm start
```

O painel estará disponível em seu navegador no endereço:
👉 **[http://localhost:8080](http://localhost:8080)**

---

## 🌐 Configuração do Feed Oficial do TSE (Domingo, 04 de Outubro)

No domingo da eleição (04 de Outubro), na aba **"Simulador & Configurações"**:
1. Altere o campo **Fonte de Dados** para `Endpoint JSON Oficial do TSE`.
2. Insira a URL disponibilizada pelo TSE Divulga no dia da apuração.
3. Clique em **"Salvar Configurações"**.
