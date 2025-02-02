import requests
import json
from tqdm import tqdm
import time
from datetime import datetime, timedelta
import os

# Configuração da API
headers = {
    'accept': '*/*',
}
base_url = 'https://dadosabertos.compras.gov.br/modulo-contratacoes/1_consultarContratacoes_PNCP_14133'

# Parâmetros gerais
data_inicial = '2024-11-01'
data_final = datetime.today().strftime('%Y-%m-%d')
modalidades = ['05']

# Converte as datas para o formato datetime
start_date = datetime.strptime(data_inicial, "%Y-%m-%d")
end_date = datetime.strptime(data_final, "%Y-%m-%d")

# Lista para armazenar os dados
dados_coletados = []
ids_unicos = set()

# Função para salvar os dados progressivamente em um arquivo JSON
def salvar_dados(dados, arquivo='dados_contratacoes_pncp.json'):
    try:
        # Salvando os dados em um arquivo JSON
        with open(arquivo, 'w', encoding='utf-8') as f:
            json.dump(dados, f, ensure_ascii=False, indent=4)
        print(f"Dados salvos em {arquivo}.")
    except Exception as e:
        print(f"Erro ao salvar os dados: {e}")

# Função para realizar a coleta de dados de um único dia
def coletar_dados_do_dia(data, modalidades):
    dados_do_dia = []
    for modalidade in modalidades:
        pagina = 1
        total_paginas = 1  # Inicialmente assume uma página
        while pagina <= total_paginas:
            # Configuração dos parâmetros
            params = {
                'pagina': str(pagina),
                'tamanhoPagina': '500',
                'dataPublicacaoPncpInicial': data.strftime("%Y-%m-%d"),
                'dataPublicacaoPncpFinal': data.strftime("%Y-%m-%d"),
                'codigoModalidade': modalidade,
            }

            # Requisição à API
            try:
                response = requests.get(base_url, params=params, headers=headers, timeout=30)
                if response.status_code == 200:
                    dados = response.json()
                    resultado = dados.get("resultado", [])
                    if resultado:
                        dados_do_dia.extend(resultado)
                        # Adicionar idCompra únicos ao conjunto
                        for item in resultado:
                            id_compra = item.get("idCompra")
                            if id_compra:
                                ids_unicos.add(id_compra)

                    # Atualizar o total de páginas
                    total_paginas = dados.get('totalPaginas', 1)
                    pagina += 1
                    time.sleep(1)
                else:
                    print(f"Erro na API. Status Code: {response.status_code}, Modalidade: {modalidade}, Página: {pagina}")
                    return None  # Se houver erro, retorna None
            except Exception as e:
                print(f"Erro de requisição: {e}")
                return None  # Se houver erro de requisição, retorna None
    return dados_do_dia

# Função para tentar coletar os dados de um dia, com tentativas em caso de falha
def tentar_coletar_dados_dia(data, modalidades, tentativas_max=3):
    tentativas = 0
    while tentativas < tentativas_max:
        print(f"Tentando coletar dados para {data.strftime('%Y-%m-%d')} - Tentativa {tentativas + 1}...")
        dados_do_dia = coletar_dados_do_dia(data, modalidades)
        if dados_do_dia is not None:
            return dados_do_dia
        tentativas += 1
        time.sleep(5)  # Aguardar antes de tentar novamente
    print(f"Falha ao coletar dados para {data.strftime('%Y-%m-%d')} após {tentativas_max} tentativas.")
    return None

# Loop de coleta dia a dia
current_date = start_date
while current_date <= end_date:
    print(f"Coletando dados para {current_date.strftime('%Y-%m-%d')}...")

    dados_do_dia = tentar_coletar_dados_dia(current_date, modalidades)

    if dados_do_dia is not None:
        # Adiciona os dados ao total
        dados_coletados.extend(dados_do_dia)
        
        # Salva os dados progressivamente após cada dia de sucesso
        salvar_dados(dados_coletados)

        # Imprime o progresso
        print(f"Dados do dia {current_date.strftime('%Y-%m-%d')} coletados com sucesso.")
    else:
        print(f"Erro ao coletar dados para {current_date.strftime('%Y-%m-%d')}. Tentando novamente...")

    # Incrementa para o próximo dia
    current_date += timedelta(days=1)

# Verificar se houve dados coletados
if dados_coletados:
    # Salvar os dados finais em JSON
    salvar_dados(dados_coletados, arquivo='dados_contratacoes_pncp_final.json')
else:
    print("Nenhum dado foi coletado. Verifique os parâmetros ou a API.")
