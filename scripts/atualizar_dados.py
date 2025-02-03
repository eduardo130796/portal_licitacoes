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
data_inicial = '2025-01-23'
data_final = datetime.today().strftime('%Y-%m-%d')
modalidades = ['01', '02', '03', '04', '05', '06', '07']

# Conversão de datas
start_date = datetime.strptime(data_inicial, "%Y-%m-%d")
end_date = datetime.strptime(data_final, "%Y-%m-%d")

# Configurações de salvamento
TAMANHO_MAXIMO_MB = 25
TAMANHO_MAXIMO_BYTES = TAMANHO_MAXIMO_MB * 1024 * 1024
contador_arquivos = 1

# Sessão para otimizar conexões
session = requests.Session()

# Função para salvar dados em partes de até 25 MB
def salvar_dados_em_partes(dados):
    global contador_arquivos
    arquivo = os.path.join(PASTA_DESTINO,f'dados_contratacoes_pncp_parte_{contador_arquivos}.json')
    
    # Salva temporariamente para verificar o tamanho
    with open(arquivo, 'w', encoding='utf-8') as f:
        json.dump(dados, f, ensure_ascii=False, indent=4)
    
    # Se o arquivo for maior que o limite, divide em duas partes
    if os.path.getsize(arquivo) > TAMANHO_MAXIMO_BYTES:
        os.remove(arquivo)
        metade = len(dados) // 2
        salvar_dados_em_partes(dados[:metade])
        salvar_dados_em_partes(dados[metade:])

    else:
        print(f"✅ Dados salvos em {arquivo} ({os.path.getsize(arquivo) / (1024*1024):.2f} MB)")
        contador_arquivos += 1

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
                if resultado:
                    dados_do_dia.extend(resultado)
                
                total_paginas = dados.get('totalPaginas', 1)
                pagina += 1
                time.sleep(0.5)  # Pequeno delay para evitar sobrecarga
            else:
                break  # Interrompe se não conseguir coletar os dados
    
    return dados_do_dia

# Loop principal de coleta
dados_coletados = []
current_date = start_date

while current_date <= end_date:
    print(f"📅 Coletando dados de {current_date.strftime('%Y-%m-%d')}...")

    dados_do_dia = coletar_dados_do_dia(current_date)
    if dados_do_dia:
        dados_coletados.extend(dados_do_dia)
        # Apaga os arquivos antigos antes de salvar os novos dados
        if os.path.exists("dados_contratacoes_pncp_parte_1.json"):
            os.remove("dados_contratacoes_pncp_parte_1.json")
        salvar_dados_em_partes(dados_coletados)
        print(f"✅ Dados de {current_date.strftime('%Y-%m-%d')} coletados com sucesso.")
    else:
        print(f"⚠️ Falha ao coletar dados de {current_date.strftime('%Y-%m-%d')}.")

    current_date += timedelta(days=1)

# Salvar os dados finais
if dados_coletados:
    salvar_dados_em_partes(dados_coletados)
    print("🎯 Coleta concluída!")
else:
    print("🚫 Nenhum dado foi coletado.")
