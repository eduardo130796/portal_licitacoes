document.addEventListener("DOMContentLoaded", function () {
    configurarBotoes();
    atualizarUFsPorRegiao();

    // Certifique-se de que os elementos existam no DOM antes de adicionar event listeners
    const regionSelected = document.getElementById("regionSelected");
    const ufSelected = document.getElementById("ufSelected");

    if (regionSelected) {
        document.getElementById("applyRegionFilters").addEventListener("click", aplicarRegionFilters);
    }

    if (ufSelected) {
        document.getElementById("applyUFFilters").addEventListener("click", aplicarUFFilters);
    }

    // Fechar modal corretamente sem bloquear a tela
    const modalCloseButton = document.querySelector("#modalCloseButton");
    if (modalCloseButton) {
        modalCloseButton.addEventListener("click", fecharModal);
    }
});
// Função para garantir que o modal seja fechado sem bloquear a tela

// Atualiza as UFs ao alterar o filtro de regiões
document.getElementById("regionSelected").addEventListener("change", atualizarUFsPorRegiao);


// Função para carregar os dados filtrados
function carregarDadosFiltrados() {
    const loadingElement = document.getElementById('loading');
    loadingElement.style.display = 'block'; // Exibe o spinner

    // Função para carregar e processar cada arquivo JSON de forma controlada
    async function carregarArquivos() {
        let todosDados = []; // Armazena todos os dados filtrados

        try {
            const response = await fetch('https://api.github.com/repos/eduardo130796/portal_licitacoes/contents/dados_pncp');
            const data = await response.json();
            
            // Filtra apenas os arquivos JSON
            const arquivosJson = data.filter(file => file.name.endsWith('.json'));

            // Cria uma lista de promessas para carregar todos os arquivos
            const promises = arquivosJson.map(async (file) => {
                try {
                    const fileData = await fetch(file.download_url);
                    const dados = await fileData.json();
                    
                    // Filtra os dados com base na data de encerramento
                    const dadosValidos = dados.filter(item => {
                        const dataEncerramento = item["dataEncerramentoPropostaPncp"];
                        if (!dataEncerramento) return false;
                        const dataAtual = new Date();
                        return new Date(dataEncerramento) >= dataAtual;
                    });

                    // Adiciona os dados válidos à lista total
                    todosDados = [...todosDados, ...dadosValidos];
                } catch (error) {
                    console.error('Erro ao carregar o arquivo:', error);
                }
            });

            // Espera todas as promessas de carregamento de arquivos terminarem
            await Promise.all(promises);

            // Aplica os filtros aos dados carregados
            aplicarFiltros(todosDados);

        } catch (error) {
            console.error('Erro ao listar os arquivos:', error);
        } finally {
            loadingElement.style.display = 'none'; // Esconde o spinner
        }
    }

    carregarArquivos();
}
// Mapeamento de regiões e suas respectivas UFs
const regioes = {
    "Norte": ["AC", "AP", "AM", "PA", "RO", "RR", "TO"],
    "Nordeste": ["AL", "BA", "CE", "MA", "PB", "PE", "PI", "RN", "SE"],
    "Centro-Oeste": ["DF", "GO", "MS", "MT"],
    "Sudeste": ["ES", "MG", "RJ", "SP"],
    "Sul": ["PR", "RS", "SC"]
};

//document.getElementById("regionSelected").addEventListener("change", atualizarUFs);

function atualizarUFs() {
    const regionSelected = document.getElementById("regionSelected");
    const ufAvailable = document.getElementById("ufAvailable");

    // Obter as regiões selecionadas
    const regioesSelecionadas = Array.from(regionSelected.options).map(option => option.value);

    if (regioesSelecionadas.length === 0) {
        // Se nenhuma região estiver selecionada, exibir todas as UFs
    exibirTodasUfs();
        return;
    }

    // Filtrar as UFs com base nas regiões selecionadas
    const ufsFiltradas = [];
    regioesSelecionadas.forEach(region => {
        if (regioes[region]) {
            ufsFiltradas.push(...regioes[region]);
        }
    });

    // Atualizar a lista de UFs disponíveis
    ufAvailable.innerHTML = "";
    ufsFiltradas.forEach(uf => {
        const option = document.createElement("option");
        option.value = uf;
        option.textContent = uf;
        ufAvailable.appendChild(option);
    });

    ordenarLista(ufAvailable);
}

function carregarModalidades() {
    // Exemplo: Buscando modalidades do JSON
    fetch('https://api.github.com/repos/eduardo130796/portal_licitacoes/contents/dados_pncp')
        .then(response => response.json())
        .then(data => {
            // Itera sobre os arquivos no repositório
            data.forEach(file => {
                if (file.name.endsWith('.json')) {
                    // Faz o download do conteúdo do arquivo JSON
                    fetch(file.download_url)
                        .then(res => res.json())
                        .then((dados) => {
                            // Extraímos as modalidades únicas dos dados
                            const modalidades = new Set(dados.map(item => item.modalidadeNome).filter(Boolean));
                            
                            // Selecionamos o campo select de modalidade
                            const selectModalidade = document.getElementById("modalidadeFilter");

                            // Adiciona a opção "Selecione uma modalidade"
                            selectModalidade.innerHTML = '<option value="">Selecione uma modalidade...</option>';

                            // Adiciona as opções de modalidades
                            modalidades.forEach(modalidade => {
                                const option = document.createElement("option");
                                option.value = modalidade;
                                option.textContent = modalidade;
                                selectModalidade.appendChild(option);
                            });
                        })
                        .catch((error) => { 
                            console.error("Erro ao carregar os dados do arquivo JSON:", error);
                        });
                }
            });
        })
        .catch((error) => { 
            console.error("Erro ao listar os arquivos:", error);
        });
}


// Chama a função para carregar as modalidades após o DOM estar carregado
document.addEventListener("DOMContentLoaded", carregarModalidades);
// Função para mostrar alertas de erro
function exibirErro(mensagem) {
    const containerErro = document.createElement("div");
    containerErro.className = "alert alert-danger";
    containerErro.textContent = mensagem;
    document.querySelector(".container").prepend(containerErro);
}

// Formatação de valor em reais
function formatarValor(valor) {
    return valor
        ? parseFloat(valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
        : "-";
}

// Formatar data para dd/mm/aaaa
function formatarData(data) {
    if (!data) return "-";
    const [ano, mes, dia] = data.split("T")[0].split("-");
    return `${dia}/${mes}/${ano}`;
}


function aplicarFiltros(dados) {
    const selectedRegions = Array.from(document.getElementById("regionSelected").selectedOptions).map(opt => opt.value);
    const selectedUFs = Array.from(document.getElementById("ufSelected").selectedOptions).map(opt => opt.value);
    const modalidade = document.getElementById("modalidadeFilter").value;
    const keyword = document.getElementById("keywordFilter").value.toLowerCase();
    const startDate = document.getElementById("startDateFilter").value;
    const endDate = document.getElementById("endDateFilter").value;

    const dadosFiltrados = dados.filter((item) => {
        // Verifica se a UF pertence às regiões selecionadas ou está explicitamente escolhida
        const verificarRegiao = () => {
            if (selectedUFs.length > 0) {
                return selectedUFs.includes(item["unidadeOrgaoUfSigla"]);
            }
            if (selectedRegions.length > 0) {
                return selectedRegions.some(region => regioes[region]?.includes(item["unidadeOrgaoUfSigla"]));
            }
            return true; // Sem filtro
        };

        const verificarCampo = (campo, filtro) =>
            !filtro || (item[campo] && item[campo].toLowerCase().includes(filtro.toLowerCase()));

        const verificarData = (campo, inicio, fim) => {
            if (!item[campo]) return true;
            const data = new Date(item[campo]);
            return (!inicio || data >= new Date(inicio)) && (!fim || data <= new Date(fim));
        };

        return (
            verificarRegiao() &&
            verificarCampo("modalidadeNome", modalidade) &&
            verificarCampo("objetoCompra", keyword) &&
            verificarData("dataAberturaPropostaPncp", startDate, endDate)
        );
    });

    renderizarCards(dadosFiltrados);
}

// Adicionar evento ao filtro de regiões para atualizar as UFs
//document.getElementById("regionSelected").addEventListener("change", atualizarUFs);

function limparFiltros() {
// Limpar regiões
    const regionAvailable = document.getElementById("regionAvailable");
    const regionSelected = document.getElementById("regionSelected");
    moverTodosItens(regionSelected, regionAvailable);

    // Limpar UFs
    const ufAvailable = document.getElementById("ufAvailable");
    const ufSelected = document.getElementById("ufSelected");
    moverTodosItens(ufSelected, ufAvailable);

    // Mostrar todas as UFs
    exibirTodasUfs();

    
    regionSelected.innerHTML = ""; // Limpa todas as seleções
    atualizarUFsPorRegiao(); // Atualiza para mostrar todas as UFs
    

    // Atualizar displays
    document.getElementById("regionFilterDisplay").textContent = "Todas as Regiões";
    document.getElementById("ufFilterDisplay").textContent = "Todas as UFs";

    // Resetar outros campos
    document.getElementById("modalidadeFilter").selectedIndex = 0;
    document.getElementById("keywordFilter").value = "";
    document.getElementById("startDateFilter").value = "";
    document.getElementById("endDateFilter").value = "";

    // Limpar exibição de dados
    document.getElementById("dados").innerHTML = "";
    document.getElementById("countDisplay").textContent = "Nenhuma licitação encontrada.";
}

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("applyRegionFilters").addEventListener("click", () => {
        const regionSelected = document.getElementById("regionSelected");

        const regionValue = regionSelected.value;
        if (!regionValue || regionValue === "") {
            atualizarUFsPorRegiao();
        } else {
            atualizarUFsPorRegiao(regionValue);
        }
    });
});



// Função para mover todos os itens de uma lista para outra
function moverTodosItens(origem, destino) {
    Array.from(origem.options).forEach(option => {
        origem.removeChild(option); // Remove da lista de origem
        destino.appendChild(option); // Adiciona na lista de destino
    });
}

// Função para exibir todas as UFs (sem filtro por região)
function exibirTodasUfs() {
    const ufAvailable = document.getElementById("ufAvailable");
    const ufSelected = document.getElementById("ufSelected");

    // Combinar todas as opções (tanto disponíveis quanto selecionadas)
    const todasAsUfs = [...Array.from(ufAvailable.options), ...Array.from(ufSelected.options)];

    // Resetar as listas de UFs
    ufAvailable.innerHTML = "";
    ufSelected.innerHTML = "";

    // Adicionar todas as UFs na lista de disponíveis
    todasAsUfs.forEach(option => ufAvailable.appendChild(option));

    // Ordenar a lista para manter a organização
    ordenarLista(ufAvailable);
}

// Função para ordenar os itens dentro de uma lista (alfabeticamente)
function ordenarLista(lista) {
    const options = Array.from(lista.options);
    options.sort((a, b) => a.text.localeCompare(b.text)); // Ordenar pelo texto
    lista.innerHTML = ""; // Limpar a lista
    options.forEach(option => lista.appendChild(option)); // Reapendá-los em ordem
}

// Evento ao alterar a seleção de regiões
// Função para atualizar as UFs com base nas regiões selecionadas
function atualizarUFsPorRegiao() {
    const regionSelected = document.getElementById("regionSelected");
    const ufAvailable = document.getElementById("ufAvailable");

    // Obter as regiões selecionadas
    const regioesSelecionadas = Array.from(regionSelected.options).map(option => option.value);

    // Resetar a lista de UFs disponíveis
    ufAvailable.innerHTML = "";

    // Se nenhuma região estiver selecionada, ou se for para "todas as regiões"
    if (regioesSelecionadas.length === 0) {
        // Exibir todas as UFs
        Object.values(regioes).flat().forEach(uf => {
            const option = document.createElement("option");
            option.value = uf;
            option.textContent = uf;
            ufAvailable.appendChild(option);
        });
    } else {
        // Exibir apenas UFs das regiões selecionadas
        regioesSelecionadas.forEach(regiao => {
            if (regioes[regiao]) {
                regioes[regiao].forEach(uf => {
                    const option = document.createElement("option");
                    option.value = uf;
                    option.textContent = uf;
                    ufAvailable.appendChild(option);
                });
            }
        });
    }

    // Ordenar a lista de UFs disponíveis
    ordenarLista(ufAvailable);
}



function renderizarCards(dadosFiltrados) {
    const container = document.getElementById("dados");
    const countDisplay = document.getElementById("countDisplay");
    container.innerHTML = "";

    if (dadosFiltrados.length === 0) {
        countDisplay.innerHTML = "Nenhuma licitação encontrada.";
        container.style.display = "none";
        return;
    }

    countDisplay.innerHTML = `Total de Licitações: ${dadosFiltrados.length}`;
    container.style.display = "flex";
    container.style.flexWrap = "wrap";

    dadosFiltrados.forEach((item) => {
        const card = document.createElement("div");
        card.className = "col, mb-4";

        // Alerta visual para data de encerramento próxima
        const dataEncerramento = item["dataEncerramentoPropostaPncp"];
        const diasRestantes = calcularDiasRestantes(dataEncerramento);
        const alerta = diasRestantes <= 7 ? "border-danger" : ""; // Borda vermelha se faltam 7 dias ou menos
        const iconeAlerta = diasRestantes <= 7 ? `<i class="fa fa-exclamation-triangle text-danger"></i>` : "";


        card.innerHTML = `
            <div class="col">
                <div class="card p-3 ${alerta}">
                    <div class="card-content">
                        <div class="row">
                            <div class="col-6">
                                <p class="icon-text">
                                    <i class="fa fa-map-marker-alt"></i> <strong>UF:</strong> ${item['unidadeOrgaoUfSigla']}
                                </p>
                            </div>
                            <div class="col-6">
                                <p class="icon-text">
                                    <i class="fa fa-city"></i> <strong>Cidade:</strong> ${item['unidadeOrgaoMunicipioNome']}
                                </p>
                            </div> 
                        </div>     
                        <p class="icon-text">
                            <i class="fa fa-info-circle"></i> <strong>Objeto:</strong> ${item['objetoCompra']}
                        </p>
                        <p class="icon-text">
                            <i class="fa fa-building"></i> <strong>Órgão:</strong> ${item['unidadeOrgaoNomeUnidade']}
                        </p>
                        <p class="icon-text">
                            <i class="fa fa-list-alt"></i> <strong>Modalidade:</strong> ${item['modalidadeNome']}
                        </p>
                        <p class="icon-text">
                            <i class="fa fa-file-alt"></i> <strong>Edital:</strong> ${item['numeroCompra']}
                        </p>
                        <p class="icon-text">
                            <i class="fa fa-calendar-alt"></i> <strong>Abertura:</strong> ${formatarData(item['dataAberturaPropostaPncp'])}
                        </p>
                        <p class="icon-text">
                            <i class="fa fa-clock"></i> <strong>Encerramento:</strong> ${formatarData(item['dataEncerramentoPropostaPncp'])}
                            <small class="text-muted">Faltam ${diasRestantes} dias </small>${iconeAlerta}
                        </p>
                        <p class="icon-text">
                            <i class="fa fa-dollar-sign"></i> <strong>Valor Estimado:</strong> ${formatarValor(item['valorTotalEstimado'])}
                        </p>
                    </div>
                        <div class="row">
                        <div class="col-6">
                            <a href="#" onclick="abrirModalComSite('https://cnetmobile.estaleiro.serpro.gov.br/comprasnet-web/public/compras/acompanhamento-compra?compra=${item['idCompra']}')" class="btn-infos btn mt-2">
                                <i class="fas fa-box btn-icon"></i> Ver Itens
                            </a>
                        </div>
                        <div class="col-6">
                            <a href="#" onclick="abrirModalComSite('https://cnetmobile.estaleiro.serpro.gov.br/comprasnet-web/public/compras/quadro-informativo?compra=${item['idCompra']}')" class="btn-infos btn mt-2">
                                <i class="fas fa-bell btn-icon"></i> Ver Avisos
                            </a>
                        </div> 
                    </div>     
                </div>
            </div>
        </div>
        </br>
        `;

        container.appendChild(card);
    });
    
}
// Função para configurar os botões
function configurarBotoes() {
    // Botão de filtrar
    document.getElementById("filterButton").addEventListener("click", () => {
        carregarDadosFiltrados();
    });

    // Botão de limpar filtros
    document.getElementById("clearFiltersButton").addEventListener("click", () => {
        limparFiltros();
    });
    document.getElementById("moveRight").addEventListener("click", function () {
        moverUfs("ufAvailable", "ufSelected");
    });

    document.getElementById("moveLeft").addEventListener("click", function () {
        moverUfs("ufSelected", "ufAvailable");
    });

    // Função para mover as regiões da lista de disponíveis para a lista de selecionadas
    document.getElementById("moveRegionRight").addEventListener("click", function () {
        moverRegioes("regionAvailable", "regionSelected");
    });

    document.getElementById("moveRegionLeft").addEventListener("click", function () {
        moverRegioes("regionSelected", "regionAvailable");
    });
}

// Função para mover as regiões de uma lista para outra
function moverRegioes(fromId, toId) {
    const fromList = document.getElementById(fromId);
    const toList = document.getElementById(toId);

    const selectedOptions = Array.from(fromList.selectedOptions);
    selectedOptions.forEach(option => {
        fromList.removeChild(option);
        toList.appendChild(option);
    });
}

// Função para mover as UFs de uma lista para outra
function moverUfs(fromId, toId) {
    const fromList = document.getElementById(fromId);
    const toList = document.getElementById(toId);

    const selectedOptions = Array.from(fromList.selectedOptions);
    selectedOptions.forEach(option => {
        fromList.removeChild(option);
        toList.appendChild(option);
    });
}
// Função para aplicar os filtros de regiões
function aplicarRegionFilters() {
    const regionSelected = document.getElementById("regionSelected");
    const regioesSelecionadas = Array.from(regionSelected.options).map(option => option.value);

    if (regioesSelecionadas.length === 0) {
        document.getElementById("regionFilterDisplay").textContent = "Todas as Regiões";
        exibirTodasUfs(); // Exibir todas as UFs se nenhuma região estiver selecionada
    } else {
        document.getElementById("regionFilterDisplay").textContent = regioesSelecionadas.join(", ");
        atualizarUFs(); // Atualizar as UFs com base nas regiões selecionadas
    }

    // Fechar o modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('regionModal'));
    modal.hide();
}
function moverItens(origemId, destinoId) {
    const origem = document.getElementById(origemId);
    const destino = document.getElementById(destinoId);

    const itensSelecionados = Array.from(origem.selectedOptions);
    itensSelecionados.forEach(item => {
        origem.removeChild(item);
        destino.appendChild(item);
    });

    ordenarLista(destino);
}
// Função para aplicar os filtros de UFs
function aplicarUFFilters() {
    const ufSelected = document.getElementById("ufSelected");
    const ufSelecionadas = Array.from(ufSelected.options).map(option => option.value);

    if (ufSelecionadas.length === 0) {
        // Se nenhuma UF estiver selecionada, exibir todas
        document.getElementById("ufFilterDisplay").textContent = "Todas as UFs";
        exibirTodasUfs();
    } else {
        // Exibir as UFs selecionadas
        document.getElementById("ufFilterDisplay").textContent = ufSelecionadas.join(", ");
    }

    // Fechar o modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('ufModal'));
    modal.hide();
}


// Exemplo de como os dados filtrados seriam processados
function renderizarDadosFiltrados(dadosFiltrados) {
    console.log(dadosFiltrados); // Aqui você pode renderizar os dados na interface
}

function calcularDiasRestantes(dataEncerramento) {
    if (!dataEncerramento) return Infinity;
    const dataAtual = new Date();
    const dataFinal = new Date(dataEncerramento);
    const diferencaMs = dataFinal - dataAtual;
    return Math.ceil(diferencaMs / (1000 * 60 * 60 * 24));
}

function abrirModalComSite(link) {
    const modalIframe = document.getElementById("modalIframe");
    modalIframe.src = link;

    // Prevenir que a página role para o topo
    const body = document.body;
    const scrollPosition = window.scrollY;

    // Impede a rolagem da página (sem afetar a posição do body)
    body.style.overflow = 'hidden';  // Evita a rolagem

    // Abrir o modal
    const modal = new bootstrap.Modal(document.getElementById("exampleModal"));
    modal.show();

    // Restaurar a rolagem após o modal ser fechado
    modal._element.addEventListener('hidden.bs.modal', function () {
        body.style.overflow = '';  // Restaura a rolagem
        window.scrollTo(0, scrollPosition);  // Restaura a posição original da rolagem
    });
}

document.getElementById("regionSelected").addEventListener("change", atualizarUFs);


function exportarParaExcel() {
    const cards = document.querySelectorAll('#dados .col'); // Seleciona todos os cards na área de dados
    if (!cards.length) {
        alert("Não há dados para exportar.");
        return;
    }

    // Array para armazenar os dados dos cards
    let dadosExportados = [];

    // Percorrer os cards e extrair as informações
    cards.forEach(card => {
        const cardData = {
            UF: card.querySelector('.icon-text .fa-map-marker-alt') ? card.querySelector('.icon-text .fa-map-marker-alt').parentElement.innerText.replace("UF:", "").trim() : 'Sem UF',
            Cidade: card.querySelector('.icon-text .fa-city') ? card.querySelector('.icon-text .fa-city').parentElement.innerText.replace("Cidade:", "").trim() : 'Sem Cidade',
            Objeto: card.querySelector('.icon-text .fa-info-circle') ? card.querySelector('.icon-text .fa-info-circle').parentElement.innerText.replace("Objeto:", "").trim() : 'Sem Objeto',
            Orgao: card.querySelector('.icon-text .fa-building') ? card.querySelector('.icon-text .fa-building').parentElement.innerText.replace("Órgão:", "").trim() : 'Sem Órgão',
            Modalidade: card.querySelector('.icon-text .fa-list-alt') ? card.querySelector('.icon-text .fa-list-alt').parentElement.innerText.replace("Modalidade:", "").trim() : 'Sem Modalidade',
            Edital: card.querySelector('.icon-text .fa-file-alt') ? card.querySelector('.icon-text .fa-file-alt').parentElement.innerText.replace("Edital:", "").trim() : 'Sem Edital',
            Abertura: card.querySelector('.icon-text .fa-calendar-alt') ? card.querySelector('.icon-text .fa-calendar-alt').parentElement.innerText.replace("Abertura:", "").trim() : 'Sem Abertura',
            Encerramento: card.querySelector('.icon-text .fa-clock') ? card.querySelector('.icon-text .fa-clock').parentElement.innerText.replace("Encerramento:", "").trim() : 'Sem Encerramento',
            ValorEstimado: card.querySelector('.icon-text .fa-dollar-sign') ? card.querySelector('.icon-text .fa-dollar-sign').parentElement.innerText.replace("Valor Estimado:", "").trim() : 'Sem Valor Estimado',
        };

        dadosExportados.push(cardData);
    });

    // Criando uma planilha Excel
    const ws = XLSX.utils.json_to_sheet(dadosExportados);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Licitações");
    XLSX.writeFile(wb, "licitacoes.xlsx");
}

