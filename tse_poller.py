"""
WAR ROOM TSE CDN POLLER - MARCELA PASSAMANI (15555 MDB)
Script oficial de monitoramento de apuração direta da CDN do TSE (Resultados DF)
"""

import time
import requests
import json
import sys

# Configurações do Pleito e Candidata
ANO_ELEICAO = "ele2026"
ID_ELEICAO = "021272" # Obtido dinamicamente em ele-c.json ou fornecido pelo TSE
CODIGO_CARGO = "0007" # 0007 = Deputado Distrital no DF
NUMERO_CANDIDATA = "15555" # Marcela Passamani - MDB
INTERVALO_SEGUNDOS = 1800 # 30 minutos (ajustável para 60s no dia da eleição)
LOCAL_WARROOM_API = "http://localhost:3000/api/tse/importar-json"

HEADERS = {
    "User-Agent": "WarRoomApp/2.0 (Marcela Passamani 15555 MDB; TSE CDN Client)",
    "Accept": "application/json, text/plain, */*",
    "Origin": "https://resultados.tse.jus.br",
    "Referer": "https://resultados.tse.jus.br/"
}

# Cache ETag local para economizar requisições e respeitar CDN
ultimo_etag = None
ultimo_last_modified = None

def obter_id_eleicao():
    """Descobre o ID da eleição através do arquivo global de configuração do TSE"""
    url_config = f"https://resultados.tse.jus.br/oficial/{ANO_ELEICAO}/comum/config/ele-c.json"
    try:
        r = requests.get(url_config, headers=HEADERS, timeout=10)
        if r.status_code == 200:
            data = r.json()
            for pleito in data.get("pl", []):
                for e in pleito.get("e", []):
                    if e.get("t") == "1" and (e.get("cdabr") == "DF" or e.get("tpabr") == "UF"):
                        print(f"[*] Código da Eleição DF identificado na CDN: {e.get('cd')}")
                        return e.get("cd")
    except Exception as err:
        print(f"[!] Erro ao obter ele-c.json: {err}. Usando ID padrão: {ID_ELEICAO}")
    return ID_ELEICAO

def consultar_votos_tse(id_eleicao):
    """Consulta os arquivos estáticos JSON da CDN do TSE e extrai os votos da Marcela Passamani"""
    global ultimo_etag, ultimo_last_modified

    # URL oficial padrão EA20 (-u.json) para o DF
    url_totalizacao = f"https://resultados.tse.jus.br/oficial/{ANO_ELEICAO}/{id_eleicao}/dados/df/df-c{CODIGO_CARGO}-e{id_eleicao}-u.json"
    
    req_headers = HEADERS.copy()
    if ultimo_etag:
        req_headers["If-None-Match"] = ultimo_etag
    if ultimo_last_modified:
        req_headers["If-Modified-Since"] = ultimo_last_modified

    try:
        r = requests.get(url_totalizacao, headers=req_headers, timeout=12)

        if r.status_code == 304:
            print(f"[{time.strftime('%H:%M:%S')}] 304 Not Modified: Cache da CDN inalterado.")
            return None

        if r.status_code == 200:
            ultimo_etag = r.headers.get("ETag")
            ultimo_last_modified = r.headers.get("Last-Modified")
            dados = r.json()

            # Envia cópia para o servidor local do War Room para atualizar Grafana/Zabbix/UI
            try:
                requests.post(LOCAL_WARROOM_API, json={"jsonTSE": dados}, timeout=2)
            except:
                pass

            total_apurado = dados.get("psa", dados.get("pst", "0,00"))
            data_hora = f"{dados.get('dg', '04/10/2026')} {dados.get('hg', '17:00:00')}"

            # Varredura hierárquica oficial do TSE: carg -> agr -> par -> cand
            for cargo in dados.get("carg", []):
                for agregacao in cargo.get("agr", []):
                    for partido in agregacao.get("par", []):
                        for candidato in partido.get("cand", []):
                            if candidato.get("n") == NUMERO_CANDIDATA:
                                return {
                                    "nome": candidato.get("nm"),
                                    "numero": candidato.get("n"),
                                    "partido": partido.get("sg", "MDB"),
                                    "votos": int(candidato.get("vap", 0)),
                                    "percentual": candidato.get("pvap", "0,00"),
                                    "situacao": candidato.get("st", "Em Apuração"),
                                    "apuracao_df": total_apurado,
                                    "ultima_atualizacao": data_hora
                                }

            # Fallback para formato simplificado (-r.json)
            for c in dados.get("cand", []):
                if c.get("n") == NUMERO_CANDIDATA or "PASSAMANI" in c.get("nm", "").upper():
                    return {
                        "nome": c.get("nm"),
                        "numero": c.get("n"),
                        "partido": c.get("nv", "MDB"),
                        "votos": int(c.get("vap", 0)),
                        "percentual": c.get("pvap", "0,00"),
                        "situacao": c.get("st", "Em Apuração"),
                        "apuracao_df": total_apurado,
                        "ultima_atualizacao": data_hora
                    }

        elif r.status_code == 404:
            print(f"[{time.strftime('%H:%M:%S')}] TSE 404: Apuração ainda não iniciada na CDN ou aguardando liberação das urnas.")
        else:
            print(f"[{time.strftime('%H:%M:%S')}] TSE CDN Status HTTP {r.status_code}")

    except Exception as err:
        print(f"[!] Erro de conexão com a CDN do TSE: {err}")

    return None

if __name__ == "__main__":
    print("=" * 65)
    print("   WAR ROOM TSE - APURAÇÃO MARCELA PASSAMANI (15555 MDB)")
    print("   Monitoramento Direto da CDN do Tribunal Superior Eleitoral")
    print("=" * 65)

    id_atual = obter_id_eleicao()
    print(f"[*] Iniciando monitoramento a cada {INTERVALO_SEGUNDOS // 60} minutos...\n")

    while True:
        resultado = consultar_votos_tse(id_atual)
        if resultado:
            status_tag = "⭐ ELEITA!" if "ELEIT" in resultado["situacao"].upper() else resultado["situacao"]
            print(f"[{resultado['ultima_atualizacao']}] {resultado['nome']} ({resultado['numero']} {resultado['partido']}): "
                  f"{resultado['votos']:,} votos ({resultado['percentual']}%) | "
                  f"DF Apurado: {resultado['apuracao_df']}% | Status: {status_tag}")
            
            if "ELEIT" in resultado["situacao"].upper():
                print("\n🚨🚨 VITÓRIA CONFIRMADA: MARCELA PASSAMANI ELEITA DEPUTADA DISTRITAL! 🚨🚨\n")
        
        time.sleep(INTERVALO_SEGUNDOS)
