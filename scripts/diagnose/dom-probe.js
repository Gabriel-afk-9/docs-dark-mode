/*
 * Docs Dark Mode — instrumento de diagnóstico do DOM do Google Docs (Etapa A).
 *
 * OBJETIVO
 * Coletar dados reais do DOM do Google Docs autenticado para fundamentar a
 * correção visual da Etapa B: estrutura real da interface, cores computadas,
 * origem dos valores na cascata, inventário de menus/diálogos e situação dos
 * ícones.
 *
 * ESTE ARQUIVO NÃO É PROVA DE COMPATIBILIDADE VISUAL. Ele fornece os dados
 * necessários para decidir as regras; a validação visual continua sendo
 * feita no editor autenticado.
 *
 * USO
 * 1. Abra um documento do Google Docs autenticado e ative o tema.
 * 2. F12 > Console. Se o navegador bloquear a colagem, digite "allow pasting".
 * 3. Cole o conteúdo inteiro deste arquivo e pressione Enter.
 * 4. O JSON vai para a área de transferência; o console mostra um resumo.
 * 5. Repita a execução em cada cenário (menu Arquivo, submenu, diálogo
 *    Compartilhar, painel de comentários, menu de contexto). Cada execução é
 *    independente e restaura o estado da página.
 *
 * RÓTULO OPCIONAL DO CENÁRIO
 * Antes de colar, é possível rotular a execução:
 *     window.__ddmProbeCenario = 'menu-arquivo';
 *
 * GARANTIAS DE SEGURANÇA
 * - Não acessa rede, não usa importações, não usa `chrome.*`, não escreve no
 *   storage e não altera preferências salvas.
 * - Não escreve no conteúdo do documento nem lê o texto do documento: não
 *   captura `textContent`, `innerText`, `value` de campos, `document.title` nem
 *   o identificador do documento na URL.
 * - Rótulos ARIA (`aria-label`) só são exportados dentro de menus, diálogos e
 *   painéis, onde descrevem controles da interface — nunca em conteúdo.
 * - O atributo `data-ddm-theme`, as folhas temporárias e os estilos inline
 *   alterados são restaurados ao final, inclusive em caso de exceção.
 *
 * RESTRIÇÕES DE LINT
 * O projeto não declara globais de browser no ESLint; por isso o arquivo usa
 * `globalThis` explicitamente para toda a API do navegador.
 */
(() => {
  'use strict';

  const g = globalThis;
  const doc = g.document;
  const win = g.window;

  /* ------------------------------------------------------------------ *
   * Configuração                                                        *
   * ------------------------------------------------------------------ */

  /** Rótulo do cenário informado pelo operador (opcional). */
  const CENARIO =
    typeof win.__ddmProbeCenario === 'string' ? win.__ddmProbeCenario : 'auto';

  /** Limites de coleta: mantêm o JSON pequeno e o console legível. */
  const LIMITES = {
    regiao: 160,
    varredura: 60,
    icones: 40,
    caminhosIcone: 6,
    overlays: 12,
    itens: 40,
    ancestrais: 5,
    superficies: 24,
  };

  /** Altura (px) da faixa superior considerada "chrome". */
  const ALTURA_REGIAO = 420;

  /** Cores exclusivas dos testes temporários de cascata. */
  const COR_ESPECIFICA = 'rgb(1, 2, 3)';
  const COR_FRACA = 'rgb(4, 5, 6)';
  const COR_IMPORTANTE = 'rgb(7, 8, 9)';

  /** Atributos ARIA de estado/estrutura exportados (nunca rótulos). */
  const ATRIBUTOS_ARIA = [
    'aria-expanded',
    'aria-checked',
    'aria-disabled',
    'aria-pressed',
    'aria-haspopup',
    'aria-selected',
    'aria-current',
    'aria-modal',
    'aria-orientation',
    'aria-multiselectable',
    'aria-activedescendant',
  ];

  /** Seletores já medidos em责任编辑 — confirmados, ausentes ou pendentes. */
  const REGISTRO = [
    '#docs-titlebar',
    '#docs-title-input-label-inner',
    '#docs-titlebar-buttons',
    '#docs-menubar',
    '#docs-file-menu',
    '#docs-edit-menu',
    '#docs-view-menu',
    '#docs-toolbar-wrapper',
    '#undoButton',
    '#redoButton',
    '#printButton',
    '#zoomSelect',
    '#headingStyleSelect',
    '#fontSizeSelect',
    '#docs-font-family',
    '.docs-titlebar',
    '.docs-title-input',
  ];

  /** Contêineres de interface usados na varredura de ícones. */
  const CONTENEDORES_CHROME = [
    '#docs-titlebar',
    '#docs-menubar',
    '#docs-toolbar-wrapper',
  ];

  /** Candidatos a overlay (menus, diálogos, painéis). */
  const SELETORES_OVERLAY = [
    '[role="menu"]',
    '[role="listbox"]',
    '[role="dialog"]',
    '[role="alertdialog"]',
    '[aria-modal="true"]',
    '[role="tooltip"]',
    '.goog-menu',
    '.goog-menu-popup',
    '.modal-dialog',
    '.docs-dialog',
  ];

  /** Candidatos a painel lateral. */
  const SELETORES_PAINEL = [
    '[role="complementary"]',
    '[role="navigation"]',
    '.docs-sidebar',
    '.docs-comments',
  ];

  /** Lacunas conhecidas: cada uma é fechada por uma medição específica. */
  const PENDENCIAS = [
    { id: 'P1', pergunta: 'Contêiner real dos controles à direita do título (compartilhar, comentários).' },
    { id: 'P2', pergunta: 'Classe ou papel comum dos demais botões e campos da barra de ferramentas.' },
    { id: 'P3', pergunta: 'Origem da cor dos ícones problemáticos (fill, stroke, currentColor).' },
    { id: 'P4', pergunta: 'Origem do fundo claro da barra de ferramentas (inline, !important do editor ou outro).' },
    { id: 'P5', pergunta: 'Contêiner da área de trabalho (entorno) e da régua.' },
    { id: 'P6', pergunta: 'Popup do menu de um item da barra de menus e seus itens.' },
    { id: 'P7', pergunta: 'Popup de submenu.' },
    { id: 'P8', pergunta: 'Menu de contexto.' },
    { id: 'P9', pergunta: 'Diálogos (Compartilhar, Histórico, Imprimir, Opções).' },
    { id: 'P10', pergunta: 'Painéis laterais (comentários, esboço, navegação).' },
    { id: 'P11', pergunta: 'Atributo de estado ativo/selecionado dos alternadores (negrito, revisão).' },
    { id: 'P12', pergunta: 'Texto de status (salvo em…) e menu de modo de edição.' },
    { id: 'P13', pergunta: 'Elemento que representa a folha do documento e precisa permanecer branco.' },
  ];

  /* ------------------------------------------------------------------ *
   * Estado a preservar e restaurar                                      *
   * ------------------------------------------------------------------ */

  const raiz = doc.documentElement;
  const atributoPresenteOriginal = raiz.hasAttribute('data-ddm-theme');
  const atributoOriginal = raiz.getAttribute('data-ddm-theme');

  /** Folhas de estilo temporárias criadas durante a execução. */
  const folhasCriadas = [];

  /** Estilos inline alterados durante a execução. */
  const estilosAlterados = [];

  /* ------------------------------------------------------------------ *
   * Utilidades                                                          *
   * ------------------------------------------------------------------ */

  function registrar(...itens) {
    if (typeof g.console === 'function') {
      g.console.log(...itens);
    }
  }

  function limitar(texto, tamanho) {
    return texto.length > tamanho ? `${texto.slice(0, tamanho)}…` : texto;
  }

  function escaparId(id) {
    if (g.CSS && typeof g.CSS.escape === 'function') {
      return g.CSS.escape(id);
    }
    return id.replace(/([^\w-])/g, '\\$1');
  }

  /** Converte uma cor computada em [r, g, b, a]; null se totalmente transparente. */
  function canais(cor) {
    if (typeof cor !== 'string' || cor === 'transparent') {
      return null;
    }
    const partes = cor.match(/rgba?\(([^)]+)\)/);
    if (partes === null) {
      return null;
    }
    const numeros = partes[1].split(',').map((n) => Number.parseFloat(n.trim()));
    const alfa = numeros.length > 3 ? numeros[3] : 1;
    if (alfa === 0) {
      return null;
    }
    return [numeros[0] || 0, numeros[1] || 0, numeros[2] || 0, alfa];
  }

  /** Luminância relativa WCAG (0 a 1) de uma cor computada. */
  function luminancia(cor) {
    const c = canais(cor);
    if (c === null) {
      return null;
    }
    const linear = (valor) => {
      const v = valor / 255;
      return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * linear(c[0]) + 0.7152 * linear(c[1]) + 0.0722 * linear(c[2]);
  }

  function visivel(el) {
    const r = el.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) {
      return false;
    }
    const cs = g.getComputedStyle(el);
    return cs.visibility !== 'hidden' && cs.display !== 'none';
  }

  function naRegiao(el) {
    const r = el.getBoundingClientRect();
    return r.top < ALTURA_REGIAO && r.bottom > 0 && r.width > 0 && r.height > 0;
  }

  function ariaDe(el) {
    const saida = {};
    for (const nome of ATRIBUTOS_ARIA) {
      const valor = el.getAttribute(nome);
      if (valor !== null) {
        saida[nome.replace('aria-', '')] = valor;
      }
    }
    return saida;
  }

  function ancestrais(el) {
    const cadeia = [];
    let node = el.parentElement;
    while (node !== null && cadeia.length < LIMITES.ancestrais) {
      const cs = g.getComputedStyle(node);
      cadeia.push({
        tag: node.tagName.toLowerCase(),
        id: node.id || undefined,
        classe:
          typeof node.className === 'string' && node.className.length > 0
            ? limitar(node.className, 140)
            : undefined,
        papel: node.getAttribute('role') || undefined,
        style: node.getAttribute('style') || undefined,
        bg: cs.backgroundColor,
        cor: cs.color,
      });
      node = node.parentElement;
    }
    return cadeia;
  }

  /**
   * Mede um elemento. Rótulos ARIA só entram com `comRotulo: true`, usado
   * exclusivamente dentro de menus, diálogos e painéis.
   */
  function medir(el, opcoes) {
    const usarRotulo = Boolean(opcoes && opcoes.comRotulo);
    const cs = g.getComputedStyle(el);
    const r = el.getBoundingClientRect();
    const saida = {
      tag: el.tagName.toLowerCase(),
      id: el.id || undefined,
      classe:
        typeof el.className === 'string' && el.className.length > 0
          ? limitar(el.className, 160)
          : undefined,
      papel: el.getAttribute('role') || undefined,
      aria: ariaDe(el),
      style: el.getAttribute('style') || undefined,
      bg: cs.backgroundColor,
      cor: cs.color,
      borda: cs.borderColor,
      preenchimento: cs.fill,
      traco: cs.stroke,
      retangulo: [
        Math.round(r.left),
        Math.round(r.top),
        Math.round(r.width),
        Math.round(r.height),
      ],
      ancestrais: ancestrais(el),
    };
    if (usarRotulo) {
      const rotulo = el.getAttribute('aria-label');
      saida.rotulo = rotulo ? limitar(rotulo, 80) : undefined;
    }
    return saida;
  }

  /* ------------------------------------------------------------------ *
   * Criação e remoção de folhas temporárias                             *
   * ------------------------------------------------------------------ */

  function criarFolha(css) {
    const folha = doc.createElement('style');
    folha.setAttribute('data-ddm-probe', 'temporaria');
    folha.appendChild(doc.createTextNode(css));
    (doc.head || doc.documentElement).appendChild(folha);
    folhasCriadas.push(folha);
    return folha;
  }

  function removerFolhas() {
    for (const folha of folhasCriadas) {
      if (folha.parentNode !== null) {
        folha.parentNode.removeChild(folha);
      }
    }
  }

  /* ------------------------------------------------------------------ *
   * Preservação de estilos inline                                        *
   * ------------------------------------------------------------------ */

  function salvarEstiloInline(el) {
    const valor = el.getAttribute('style');
    estilosAlterados.push({ el, valor });
  }

  function restaurarEstilosInline() {
    for (const registro of estilosAlterados) {
      if (registro.valor === null) {
        registro.el.removeAttribute('style');
      } else {
        registro.el.setAttribute('style', registro.valor);
      }
    }
  }

  /* ------------------------------------------------------------------ *
   *restauração do atributo de tema                                      *
   * ------------------------------------------------------------------ */

  function restaurarAtributo() {
    if (atributoPresenteOriginal) {
      raiz.setAttribute('data-ddm-theme', String(atributoOriginal));
    } else {
      raiz.removeAttribute('data-ddm-theme');
    }
  }

  /* ------------------------------------------------------------------ *
   * Detecção de folha do documento e de superfícies de fundo             *
   * ------------------------------------------------------------------ */

  function acharFolha() {
    const editavel = doc.querySelector('[contenteditable="true"]');
    if (editavel === null) {
      return null;
    }
    let node = editavel;
    while (node !== null && node !== doc.body) {
      const cs = g.getComputedStyle(node);
      const l = luminancia(cs.backgroundColor);
      if (l !== null && l > 0.85) {
        return node;
      }
      node = node.parentElement;
    }
    return editavel;
  }

  function dentroDaFolha(el, folha) {
    return folha !== null && folha !== el && folha.contains(el);
  }

  function fundoEfetivo(el) {
    let node = el;
    while (node !== null) {
      const cs = g.getComputedStyle(node);
      const l = luminancia(cs.backgroundColor);
      if (l !== null) {
        return l;
      }
      node = node.parentElement;
    }
    return null;
  }

  /* ------------------------------------------------------------------ *
   * Registro de seletores                                                *
   * ------------------------------------------------------------------ */

  function medirRegistro(folha) {
    const confirmados = [];
    const ausentes = [];
    for (const seletor of REGISTRO) {
      let elementos;
      try {
        elementos = Array.from(doc.querySelectorAll(seletor));
      } catch {
        ausentes.push({ seletor, motivo: 'seletor inválido' });
        continue;
      }
      if (elementos.length === 0) {
        ausentes.push({ seletor, motivo: 'não encontrado no DOM' });
        continue;
      }
      confirmados.push({
        seletor,
        quantidade: elementos.length,
        dentroDaFolha: dentroDaFolha(elementos[0], folha),
        medido: medir(elementos[0], { comRotulo: false }),
      });
    }
    return { confirmados, ausentes };
  }

  /* ------------------------------------------------------------------ *
   * Varreduras                                                            *
   * ------------------------------------------------------------------ */

  function varrerFaixasClaras(folha) {
    const achados = [];
    for (const el of doc.querySelectorAll('body *')) {
      if (achados.length >= LIMITES.varredura) {
        break;
      }
      const r = el.getBoundingClientRect();
      if (r.width < 8 || r.height < 6 || r.top > ALTURA_REGIAO) {
        continue;
      }
      const cs = g.getComputedStyle(el);
      const l = luminancia(cs.backgroundColor);
      if (l === null || l <= 0.45) {
        continue;
      }
      achados.push({
        tag: el.tagName.toLowerCase(),
        id: el.id || undefined,
        classe:
          typeof el.className === 'string' && el.className.length > 0
            ? limitar(el.className, 140)
            : undefined,
        papel: el.getAttribute('role') || undefined,
        bg: cs.backgroundColor,
        luminancia: Math.round(l * 100) / 100,
        retangulo: [
          Math.round(r.left),
          Math.round(r.top),
          Math.round(r.width),
          Math.round(r.height),
        ],
        dentroDaFolha: dentroDaFolha(el, folha),
        justificativa: dentroDaFolha(el, folha) ? 'folha branca intencional' : undefined,
      });
    }
    return achados;
  }

  function varrerTextosIlegiveis(folha) {
    const achados = [];
    for (const el of doc.querySelectorAll('body *')) {
      if (achados.length >= LIMITES.varredura) {
        break;
      }
      const r = el.getBoundingClientRect();
      if (r.width < 4 || r.height < 4 || r.top > ALTURA_REGIAO) {
        continue;
      }
      const cs = g.getComputedStyle(el);
      const l = luminancia(cs.color);
      if (l === null || l >= 0.3) {
        continue;
      }
      const fundo = fundoEfetivo(el);
      if (fundo === null || fundo >= 0.35) {
        continue;
      }
      achados.push({
        tag: el.tagName.toLowerCase(),
        id: el.id || undefined,
        classe:
          typeof el.className === 'string' && el.className.length > 0
            ? limitar(el.className, 140)
            : undefined,
        papel: el.getAttribute('role') || undefined,
        cor: cs.color,
        luminanciaCor: Math.round(l * 100) / 100,
        fundoEfetivo: Math.round(fundo * 100) / 100,
        dentroDaFolha: dentroDaFolha(el, folha),
        justificativa: dentroDaFolha(el, folha) ? 'folha branca intencional' : undefined,
      });
    }
    return achados;
  }

  function listarSuperficies(folha) {
    const achados = [];
    const larguraJanela = g.innerWidth || 0;
    for (const el of doc.querySelectorAll('body *')) {
      if (achados.length >= LIMITES.superficies) {
        break;
      }
      const r = el.getBoundingClientRect();
      if (r.width < larguraJanela * 0.5 || r.height < 40) {
        continue;
      }
      const cs = g.getComputedStyle(el);
      const l = luminancia(cs.backgroundColor);
      if (l === null || l > 0.6) {
        continue;
      }
      if (dentroDaFolha(el, folha)) {
        continue;
      }
      achados.push({
        tag: el.tagName.toLowerCase(),
        id: el.id || undefined,
        classe:
          typeof el.className === 'string' && el.className.length > 0
            ? limitar(el.className, 160)
            : undefined,
        papel: el.getAttribute('role') || undefined,
        style: el.getAttribute('style') || undefined,
        bg: cs.backgroundColor,
        cor: cs.color,
        retangulo: [
          Math.round(r.left),
          Math.round(r.top),
          Math.round(r.width),
          Math.round(r.height),
        ],
        ancestrais: ancestrais(el),
      });
    }
    return achados;
  }

  /* ------------------------------------------------------------------ *
   * Ícones                                                                *
   * ------------------------------------------------------------------ */

  function coletarIcones(folha) {
    const vistos = new Set();
    const alvos = [];
    for (const seletor of CONTENEDORES_CHROME) {
      const container = doc.querySelector(seletor);
      if (container === null) {
        continue;
      }
      for (const svg of container.querySelectorAll('svg')) {
        if (!vistos.has(svg)) {
          vistos.add(svg);
          alvos.push(svg);
        }
      }
    }
    for (const svg of doc.querySelectorAll('svg')) {
      if (alvos.length >= LIMITES.icones) {
        break;
      }
      if (vistos.has(svg) || !naRegiao(svg) || dentroDaFolha(svg, folha)) {
        continue;
      }
      vistos.add(svg);
      alvos.push(svg);
    }
    const resultado = [];
    for (const svg of alvos.slice(0, LIMITES.icones)) {
      const cs = g.getComputedStyle(svg);
      const corDoHost = cs.color;
      const caminhos = [];
      for (const p of Array.from(svg.querySelectorAll('path')).slice(0, LIMITES.caminhosIcone)) {
        const csP = g.getComputedStyle(p);
        caminhos.push({
          fillAtributo: p.getAttribute('fill') || undefined,
          strokeAtributo: p.getAttribute('stroke') || undefined,
          fillComputado: csP.fill,
          strokeComputado: csP.stroke,
          usaCurrentColor: csP.fill === corDoHost,
        });
      }
      resultado.push({
        host: medir(svg, { comRotulo: false }),
        fillAtributo: svg.getAttribute('fill') || undefined,
        strokeAtributo: svg.getAttribute('stroke') || undefined,
        fillComputado: cs.fill,
        strokeComputado: cs.stroke,
        corDoHost,
        usaCurrentColor: cs.fill === corDoHost,
        caminhos,
      });
    }
    return resultado;
  }

  /* ------------------------------------------------------------------ *
   * Overlays (menus, submenus, diálogos, painéis)                       *
   * ------------------------------------------------------------------ */

  function coletarOverlays(folha) {
    const vistos = new Set();
    const overlays = [];
    for (const seletor of SELETORES_OVERLAY) {
      let elementos;
      try {
        elementos = Array.from(doc.querySelectorAll(seletor));
      } catch {
        continue;
      }
      for (const el of elementos) {
        if (overlays.length >= LIMITES.overlays) {
          break;
        }
        if (vistos.has(el) || !visivel(el)) {
          continue;
        }
        vistos.add(el);
        const itens = [];
        const candidatos = el.querySelectorAll(
          '[role="menuitem"], [role="menuitemcheckbox"], [role="menuitemradio"], [role="option"], [role="tab"]',
        );
        for (const item of Array.from(candidatos).slice(0, LIMITES.itens)) {
          itens.push(medir(item, { comRotulo: true }));
        }
        overlays.push({
          seletor,
          dentroDaFolha: dentroDaFolha(el, folha),
          contêiner: medir(el, { comRotulo: true }),
          itens,
        });
      }
    }
    const paineis = [];
    for (const seletor of SELETORES_PAINEL) {
      let elementos;
      try {
        elementos = Array.from(doc.querySelectorAll(seletor));
      } catch {
        continue;
      }
      for (const el of elementos) {
        if (paineis.length >= LIMITES.overlays || !visivel(el)) {
          continue;
        }
        paineis.push({
          seletor,
          dentroDaFolha: dentroDaFolha(el, folha),
          medido: medir(el, { comRotulo: false }),
        });
      }
    }
    return { overlays, paineis };
  }

  /* ------------------------------------------------------------------ *
   * Detecção de cenário                                                  *
   * ------------------------------------------------------------------ */

  function detectarCenarios(overlays) {
    const detectados = ['base'];
    const itemMenu = doc.querySelector('#docs-file-menu');
    const menuBarAberto =
      itemMenu !== null && itemMenu.getAttribute('aria-expanded') === 'true';
    if (menuBarAberto) {
      detectados.push('menu-arquivo');
    }
    for (const overlay of overlays) {
      const temItem = overlay.itens.length > 0;
      if (!temItem) {
        continue;
      }
      if (overlay.contêiner.papel === 'dialog' || overlay.contêiner.aria.modal === 'true') {
        detectados.push('dialogo');
        continue;
      }
      if (overlay.contêiner.papel === 'menu') {
        if (menuBarAberto) {
          detectados.push('menu-arquivo');
        } else {
          detectados.push('menu-contexto');
        }
      }
    }
    if (detectados.indexOf('submenu') === -1) {
      for (const overlay of overlays) {
        const menuAninhado = overlay.itens.some((item) =>
          item.ancestrais.some((ancestral) => ancestral.papel === 'menu'),
        );
        if (menuAninhado) {
          detectados.push('submenu');
          break;
        }
      }
    }
    return detectados;
  }

  /* ------------------------------------------------------------------ *
   * Medições de cascata (temporárias e revertidas imediatamente)         *
   * ------------------------------------------------------------------ */

  function testarCascata(el) {
    if (!el.id) {
      return null;
    }
    const idEsc = escaparId(el.id);
    const seletorForte = `html[data-ddm-theme='dark'] #${idEsc}`;
    const seletorFraco = '.ddm-probe-fraco';
    const estiloInline = el.getAttribute('style');
    const resultado = {
      id: el.id,
      estiloInline: estiloInline === null ? undefined : estiloInline,
      inlineTemFundo: estiloInline !== null && /background/i.test(estiloInline),
      inlineTemImportant: estiloInline !== null && /!important/i.test(estiloInline),
      antes: g.getComputedStyle(el).backgroundColor,
      testes: [],
      conclusao: undefined,
      inconclusiva: true,
    };

    // A) Declaração normal com a especificidade do tema.
    {
      const folha = criarFolha(`${seletorForte} { background-color: ${COR_ESPECIFICA}; }`);
      const medido = g.getComputedStyle(el).backgroundColor;
      folha.parentNode.removeChild(folha);
      resultado.testes.push({
        nome: 'normal-especificidade-do-tema',
        css: `${seletorForte} { background-color: ${COR_ESPECIFICA}; }`,
        medido,
        venceu: medido === COR_ESPECIFICA,
      });
    }

    // B) Declaração normal de especificidade fraca (classe).
    {
      salvarEstiloInline(el);
      el.classList.add('ddm-probe-fraco');
      const folha = criarFolha(`${seletorFraco} { background-color: ${COR_FRACA}; }`);
      const medido = g.getComputedStyle(el).backgroundColor;
      folha.parentNode.removeChild(folha);
      el.classList.remove('ddm-probe-fraco');
      restaurarEstilosInline();
      estilosAlterados.pop();
      resultado.testes.push({
        nome: 'normal-especificidade-fraca',
        css: `${seletorFraco} { background-color: ${COR_FRACA}; }`,
        medido,
        venceu: medido === COR_FRACA,
      });
    }

    // C) Exceção de especificidade do autor (!important).
    {
      const folha = criarFolha(
        `${seletorForte} { background-color: ${COR_IMPORTANTE} !important; }`,
      );
      const medido = g.getComputedStyle(el).backgroundColor;
      folha.parentNode.removeChild(folha);
      resultado.testes.push({
        nome: 'autor-important',
        css: `${seletorForte} { background-color: ${COR_IMPORTANTE} !important; }`,
        medido,
        venceu: medido === COR_IMPORTANTE,
      });
    }

    // D) Contributions do estilo inline: mede sem ele.
    {
      salvarEstiloInline(el);
      el.removeAttribute('style');
      const medido = g.getComputedStyle(el).backgroundColor;
      restaurarEstilosInline();
      estilosAlterados.pop();
      resultado.testes.push({
        nome: 'sem-estilo-inline',
        css: 'atributo style removido temporariamente',
        medido,
        venceu: medido !== resultado.antes,
      });
    }

    const tA = resultado.testes[0];
    const tB = resultado.testes[1];
    const tC = resultado.testes[2];
    const tD = resultado.testes[3];

    if (!tA.venceu && !tB.venceu && tC.venceu) {
      resultado.inconclusiva = false;
      resultado.conclusao =
        'Uma declaração normal não vence (estilo inline normal ou regra do editor); um !important de autor vence.';
    } else if (!tA.venceu && !tB.venceu && !tC.venceu && tD.venceu) {
      resultado.inconclusiva = false;
      resultado.conclusao =
        'Há um !important inline que a folha não vence: corrigir exigiria outra técnica, não apenas !important.';
    } else if (!tA.venceu && !tB.venceu && !tC.venceu && !tD.venceu) {
      resultado.conclusiva = undefined;
      resultado.conclusao =
        'INCONCLUSIVA: nenhuma das medições distinguiu a origem do valor.';
    } else if (tA.venceu && tB.venceu) {
      resultado.inconclusiva = false;
      resultado.conclusao =
        'Declarações normais vencem neste elemento: o valor observado não é resolvido pelo seletor testado.';
    } else {
      resultado.conclusao =
        'INCONCLUSIVA: as medições produziram um resultado contraditório; repetir a execução.';
    }

    return resultado;
  }

  /* ------------------------------------------------------------------ *
   * Coleta principal                                                     *
   * ------------------------------------------------------------------ */

  function coletar() {
    const folha = acharFolha();
    const saida = {};

    saida.ambiente = {
      host: g.location ? g.location.host : undefined,
      // O identificador do documento é redigido: só o padrão de rota é útil.
      rota: g.location
        ? String(g.location.pathname).replace(/\/d\/[^/]+/, '/d/<id-redigido>')
        : undefined,
      cenario: CENARIO,
      temaPresente: raiz.hasAttribute('data-ddm-theme'),
      temaOriginal: atributoOriginal === null ? undefined : atributoOriginal,
      prefersDark: g.matchMedia
        ? g.matchMedia('(prefers-color-scheme: dark)').matches
        : undefined,
      readyState: doc.readyState,
    };

    saida.folha = folha
      ? {
          tag: folha.tagName.toLowerCase(),
          id: folha.id || undefined,
          classe:
            typeof folha.className === 'string' && folha.className.length > 0
              ? limitar(folha.className, 160)
              : undefined,
          bg: g.getComputedStyle(folha).backgroundColor,
          retangulo: (() => {
            const r = folha.getBoundingClientRect();
            return [
              Math.round(r.left),
              Math.round(r.top),
              Math.round(r.width),
              Math.round(r.height),
            ];
          })(),
        }
      : null;

    saida.seletores = medirRegistro(folha);
    saida.pendencias = PENDENCIAS;

    const overlays = coletarOverlays(folha);
    saida.cenariosDetectados = detectarCenarios(overlays.overlays);
    saida.overlays = overlays.overlays;
    saida.paineis = overlays.paineis;

    saida.icones = coletarIcones(folha);
    saida.varreduras = {
      faixasClaras: varrerFaixasClaras(folha),
      textosIlegiveis: varrerTextosIlegiveis(folha),
    };
    saida.superficies = listarSuperficies(folha);

    saida.cascata = [];
    for (const seletor of ['#docs-toolbar-wrapper', '#docs-titlebar', '#docs-menubar']) {
      const el = doc.querySelector(seletor);
      if (el === null) {
        saida.cascata.push({ id: seletor, ausente: true });
        continue;
      }
      const medido = testarCascata(el);
      if (medido !== null) {
        saida.cascata.push(medido);
      }
    }

    return saida;
  }

  /* ------------------------------------------------------------------ *
   * Execução com restauração garantida                                    *
   * ------------------------------------------------------------------ */

  /**
   * Executa a coleta garantindo a restauração do estado, inclusive em caso
   * de exceção.
   */
  function executar() {
    // As medições de cascata exigem o tema ativo: se ele estiver desligado,
    // ele é ligado apenas durante a execução e restaurado no fim.
    const temaAtivadoTemporariamente = !raiz.hasAttribute('data-ddm-theme');
    if (temaAtivadoTemporariamente) {
      raiz.setAttribute('data-ddm-theme', 'dark');
    }
    try {
      const dados = coletar();
      dados.ambiente.temaAtivadoTemporariamente = temaAtivadoTemporariamente;
      return dados;
    } catch (excecao) {
      return {
        erro: String(excecao && excecao.message ? excecao.message : excecao),
      };
    } finally {
      removerFolhas();
      restaurarEstilosInline();
      restaurarAtributo();
    }
  }

  const resultado = executar();

  const selo = {
    atributoRestaurado:
      raiz.getAttribute('data-ddm-theme') === (atributoPresenteOriginal ? atributoOriginal : null),
    folhasTemporariasRemanescentes: folhasCriadas.filter((f) => f.parentNode !== null).length,
    estilosInlineAlterados: estilosAlterados.filter(
      (registro) => registro.el.getAttribute('style') !== registro.valor,
    ).length,
  };
  resultado.selo = selo;

  const json = JSON.stringify(resultado, null, 1);
  let copiado = false;
  if (typeof g.copy === 'function') {
    try {
      g.copy(json);
      copiado = true;
    } catch {
      copiado = false;
    }
  }

  registrar('=== Docs Dark Mode · diagnóstico (Etapa A) ===');
  registrar(`cenário declarado: ${CENARIO}`);
  registrar(`cenários detectados: ${(resultado.cenariosDetectados || []).join(', ')}`);
  registrar(
    `seletores confirmados: ${resultado.seletores ? resultado.seletores.confirmados.length : 0} | ausentes: ${
      resultado.seletores ? resultado.seletores.ausentes.length : 0
    }`,
  );
  registrar(`overlays visíveis: ${resultado.overlays ? resultado.overlays.length : 0}`);
  registrar(`ícones coletados: ${resultado.icones ? resultado.icones.length : 0}`);
  registrar(
    `SELO: atributo restaurado=${selo.atributoRestaurado} | folhas remanescentes=${selo.folhasTemporariasRemanescentes} | estilos inline alterados=${selo.estilosInlineAlterados}`,
  );
  if (copiado) {
    registrar('JSON copiado para a área de transferência.');
  } else {
    registrar('JSON abaixo (copie manualmente):');
    registrar(json);
  }
})();
