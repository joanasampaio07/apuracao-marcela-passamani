#!/usr/bin/env python3
import argparse
import csv
import io
import json
import os
import sys
import unicodedata
import urllib.request
import zipfile
from typing import List

DEFAULT_URL = "https://cdn.tse.jus.br/estatistica/sead/eleicoes/eleicoes2026/correspesp/CESP_1t_DF_041020261259.zip"


def normalize(value):
    if value is None:
        return ""
    text = str(value).strip().upper()
    text = text.replace('\ufffd', '').replace('\x00', '')
    text = unicodedata.normalize('NFD', text)
    text = ''.join(
        ch for ch in text
        if ch.isalnum() or ch.isspace() or ch in ('-', '_')
    )
    return text


def comparable(value):
    return normalize(value).replace('I', '')


def parse_args():
    ap = argparse.ArgumentParser(description="Parser para arquivos CESP do TSE")
    ap.add_argument("--url", default=DEFAULT_URL, help="URL do ZIP do CESP no TSE")
    ap.add_argument("--municipio", default="", help="Filtro por município")
    ap.add_argument("--zona", default="", help="Filtro por zona eleitoral")
    ap.add_argument("--secao", default="", help="Filtro por seção eleitoral")
    ap.add_argument("--download-dir", default="", help="Diretório para manter cópia local do ZIP")
    ap.add_argument("--limit", type=int, default=200, help="Limite de registros retornados")
    return ap.parse_args()


def download_zip(url: str, download_dir: str = "") -> str:
    tmp_dir = download_dir or os.path.join(os.getcwd(), "tmp")
    os.makedirs(tmp_dir, exist_ok=True)
    nome_arquivo = os.path.basename(url)
    destino = os.path.join(tmp_dir, nome_arquivo)

    print(f"Baixando {url} -> {destino}", file=sys.stderr)
    with urllib.request.urlopen(url, timeout=90) as resp:
        data = resp.read()

    with open(destino, "wb") as f:
        f.write(data)
    return destino


def find_section_csv(zip_path: str) -> str:
    with zipfile.ZipFile(zip_path, "r") as zf:
        for name in zf.namelist():
            lower = name.lower()
            if lower.endswith(".csv") and "csec" in lower:
                return name
    raise FileNotFoundError("CSV de seção não encontrado no ZIP do CESP")


def parse_cesp_rows(csv_bytes: bytes, municipio: str = "", zona: str = "", secao: str = "") -> List[dict]:
    text = csv_bytes.decode("utf-8-sig", errors="replace")
    text = text.replace('\ufffd', '').replace('\x00', '')
    reader = csv.DictReader(io.StringIO(text), delimiter=";")
    rows: List[dict] = []

    municipio_norm = comparable(municipio)
    zona_norm = comparable(zona)
    secao_norm = comparable(secao)

    for row in reader:
        record = {
            "DT_GERACAO": (row.get("DT_GERACAO") or "").strip(),
            "HH_GERACAO": (row.get("HH_GERACAO") or "").strip(),
            "AA_ELEICAO": (row.get("AA_ELEICAO") or "").strip(),
            "CD_PLEITO": (row.get("CD_PLEITO") or "").strip(),
            "SG_UF": (row.get("SG_UF") or "").strip(),
            "CD_MUNICIPIO": (row.get("CD_MUNICIPIO") or "").strip(),
            "NM_MUNICIPIO": (row.get("NM_MUNICIPIO") or "").strip(),
            "NR_ZONA": (row.get("NR_ZONA") or "").strip(),
            "NR_SECAO": (row.get("NR_SECAO") or "").strip(),
            "NR_LOCAL_VOTACAO": (row.get("NR_LOCAL_VOTACAO") or "").strip(),
            "NR_URNA_ESPERADA": (row.get("NR_URNA_ESPERADA") or "").strip(),
            "CD_CARGA_URNA_ESPERADA": (row.get("CD_CARGA_URNA_ESPERADA") or "").strip(),
            "CD_FLASHCARD_URNA_ESPERADA": (row.get("CD_FLASHCARD_URNA_ESPERADA") or "").strip(),
            "DT_CARGA_URNA_ESPERADA": (row.get("DT_CARGA_URNA_ESPERADA") or "").strip(),
            "ST_CORRESP_ALTERADA": (row.get("ST_CORRESP_ALTERADA") or "").strip(),
            "NM_MAQUINA_GERACAO_MIDIA": (row.get("NM_MAQUINA_GERACAO_MIDIA") or "").strip(),
            "NR_SRI_TPM_GERACAO_MIDIA": (row.get("NR_SRI_TPM_GERACAO_MIDIA") or "").strip(),
            "NR_SRI_INSTAL_GERACAO_MIDIA": (row.get("NR_SRI_INSTAL_GERACAO_MIDIA") or "").strip(),
            "NM_MAQUINA_TRANSM_CORRESP": (row.get("NM_MAQUINA_TRANSM_CORRESP") or "").strip(),
            "NR_SRI_TPM_TRANSM_CORRESP": (row.get("NR_SRI_TPM_TRANSM_CORRESP") or "").strip(),
            "NR_SRI_INSTAL_TRANSM_CORRESP": (row.get("NR_SRI_INSTAL_TRANSM_CORRESP") or "").strip(),
        }

        if municipio_norm and comparable(record["NM_MUNICIPIO"]) != municipio_norm:
            continue
        if zona_norm and comparable(record["NR_ZONA"]) != zona_norm:
            continue
        if secao_norm and comparable(record["NR_SECAO"]) != secao_norm:
            continue

        rows.append(record)

    return rows


def main():
    args = parse_args()
    try:
        zip_path = download_zip(args.url, args.download_dir)
        csv_name = find_section_csv(zip_path)
        with zipfile.ZipFile(zip_path, "r") as zf:
            csv_bytes = zf.read(csv_name)

        rows = parse_cesp_rows(csv_bytes, args.municipio, args.zona, args.secao)
        payload = {
            "success": True,
            "arquivo": csv_name,
            "url": args.url,
            "filtros": {
                "municipio": args.municipio,
                "zona": args.zona,
                "secao": args.secao,
            },
            "total": len(rows),
            "rows": rows[: args.limit],
        }
        print(json.dumps(payload, ensure_ascii=True, indent=2))
        return 0
    except Exception as exc:
        payload = {
            "success": False,
            "error": str(exc),
        }
        print(json.dumps(payload, ensure_ascii=True))
        return 1


if __name__ == "__main__":
    sys.exit(main())
