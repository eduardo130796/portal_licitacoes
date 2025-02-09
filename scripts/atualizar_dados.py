import requests
import json
from datetime import datetime, timedelta
import time
import os

# Cria a pasta "dados_pncp" se não existir
PASTA_DESTINO = "dados_pncp"
os.makedirs(PASTA_DESTINO, exist_ok=True)

# Configuração da API
headers = {'accept': '*/*'}
base_url = 'https://dadosabertos.compras.gov.br/modulo-contratacoes/1_consultarContratacoes_PNCP_14133'

# Parâmetros de busca
data_inicial = '2025-01-01'
data_final = datetime.today().strftime('%Y-%m-%d')
modalidades = ['01', '02', '03', '04', '05', '06', '07']

# Conversão de datas
start_date = datetime.strptime(data_inicial, "%Y-%m-%d")
end_date = datetime.strptime(data_final, "%Y-%m-%d")

# Sessão para otimizar conexões
session = requests.Session()

# 🔹 Conjunto para armazenar IDs já coletados (evita duplicação)
ids_coletados = set()

# Função para salvar dados do dia separadamente
def salvar_dados_do_dia(dados, data):
    arquivo = os.path.join(PASTA_DESTINO, f'dados_contratacoes_pncp_{data}.json')

    with open(arquivo, 'w', encoding='utf-8') as f:
        json.dump(dados, f, ensure_ascii=False, indent=4)

    print(f"✅ Dados de {data} salvos em {arquivo} ({os.path.getsize(arquivo) / (1024*1024):.2f} MB)")

# Função para realizar a requisição com tentativas e backoff
def requisitar_dados(params, tentativas_max=5):
    tentativas = 0
    backoff = 2  # Atraso inicial em segundos
    while tentativas < tentativas_max:
        try:
            response = session.get(base_url, params=params, headers=headers, timeout=30)
            if response.status_code == 200:
                return response.json()
            else:
                print(f"⚠️ Erro {response.status_code}. Tentando novamente...")
        except requests.exceptions.RequestException as e:
            print(f"⏳ Erro de conexão: {e}. Tentando novamente em {backoff}s...")

        tentativas += 1
        time.sleep(backoff)
        backoff *= 2  # Backoff exponencial

    print(f"❌ Falha após {tentativas_max} tentativas.")
    return None

# Função para coletar dados de um dia específico
def coletar_dados_do_dia(data):
    dados_do_dia = []
    hoje = datetime.today()

    for modalidade in modalidades:
        pagina = 1
        total_paginas = 1

        while pagina <= total_paginas:
            params = {
                'pagina': str(pagina),
                'tamanhoPagina': '500',
                'dataPublicacaoPncpInicial': data.strftime("%Y-%m-%d"),
                'dataPublicacaoPncpFinal': data.strftime("%Y-%m-%d"),
                'codigoModalidade': modalidade,
            }

            dados = requisitar_dados(params)
            if dados:
                resultado = dados.get("resultado", [])

                # ✅ Filtragem: Apenas licitações que ainda não foram encerradas e não coletadas antes
                licitacoes_abertas = []
                for item in resultado:
                    id_compra = item.get('idCompra')
                    data_fim_str = item.get('dataEncerramentoPropostaPncp')  # Campo que indica o fim da licitação

                    if id_compra and id_compra not in ids_coletados:  # Verifica se já foi coletada
                        if data_fim_str:
                            data_fim = datetime.strptime(data_fim_str, "%Y-%m-%dT%H:%M:%S")
                            if data_fim >= hoje:  # Licitação ainda aberta
                                licitacoes_abertas.append(item)
                                ids_coletados.add(id_compra)  # Adiciona ao conjunto para evitar duplicação
                        else:
                            # Se não houver data de encerramento, assume que está aberta
                            licitacoes_abertas.append(item)
                            ids_coletados.add(id_compra)

                if licitacoes_abertas:
                    dados_do_dia.extend(licitacoes_abertas)

                total_paginas = dados.get('totalPaginas', 1)
                pagina += 1
                time.sleep(0.5)  # Pequeno delay para evitar sobrecarga
            else:
                break  # Interrompe se não conseguir coletar os dados

    return dados_do_dia

# Apaga todos os arquivos JSON da pasta antes de iniciar a nova coleta
for arquivo in os.listdir(PASTA_DESTINO):
    if arquivo.endswith(".json"):
        os.remove(os.path.join(PASTA_DESTINO, arquivo))
print("🗑️ Arquivos antigos apagados. Iniciando nova coleta...")

# Loop principal de coleta
current_date = start_date

while current_date <= end_date:
    print(f"📅 Coletando dados de {current_date.strftime('%Y-%m-%d')}...")

    dados_do_dia = coletar_dados_do_dia(current_date)
    if dados_do_dia:
        salvar_dados_do_dia(dados_do_dia, current_date.strftime('%Y-%m-%d'))
        print(f"✅ Dados de {current_date.strftime('%Y-%m-%d')} coletados com sucesso.")
    else:
        print(f"⚠️ Falha ao coletar dados de {current_date.strftime('%Y-%m-%d')}.")
    
    current_date += timedelta(days=1)

print("🎯 Coleta concluída!")

