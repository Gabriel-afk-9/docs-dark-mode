<div align="center">

<img src="assets/icons/icon-128.png" width="96" alt="Docs Dark Mode">

# Docs Dark Mode

**Modo escuro para a interface do Google Docs — sem invertê-la.**
A folha do documento continua branca, editável e pronta para imprimir.

[Instalação](#instalação) · [Uso](#uso) · [Como funciona](#como-funciona) · [Desenvolvimento](#desenvolvimento) · [Roadmap](#roadmap) · [Privacidade](#privacidade-e-permissões)

![Manifest V3](https://img.shields.io/badge/Manifest-V3-4285F4?logo=googlechrome&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)
![Testes](https://img.shields.io/badge/testes-145%20passando-2EA043)
![Licença](https://img.shields.io/badge/licen%C3%A7a-MIT-green)
![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen)

<sub>Feito para <strong>Brave</strong> · funciona também no <strong>Chrome</strong> e no <strong>Edge</strong></sub>

</div>

> 🚧 **Versão 0.1.0 — em desenvolvimento ativo.** O tema da interface está na Fase 3.
> A página do documento é intocada por design: o tema escuro nunca inverte texto, imagens ou a folha.

<!--
## Capturas

| Antes — Docs padrão | Depois — Docs Dark Mode |
|:---:|:---:|
| <img src="docs/img/showcase-antes.png" alt="Google Docs no tema claro" width="480"> | <img src="docs/img/showcase-depois.png" alt="Google Docs com o tema escuro" width="480"> |

<p align="center">
  <img src="docs/img/popup.png" alt="Popup do Docs Dark Mode" width="320">
</p>
-->

## Destaques

- 🌙 **Interface escura completa** — cabeçalho, barra de menus, barra de ferramentas, régua, campos e controles em uma paleta consistente.
- 📄 **Só a interface muda** — a folha branca do documento é preservada: editável, legível e segura para imprimir. Sem `filter: invert()`, sem distorcer imagens.
- 🔒 **Privacidade por design** — nenhuma requisição de rede, nenhum analytics. A única permissão é `storage`, para lembrar sua preferência.
- ⚡ **MV3 enxuto** — um CSS único ancorado em um atributo de estado (`data-ddm-theme`) + um content script mínimo. Zero dependências em runtime.
- 🧪 **Verificado de verdade** — o contrato estático do CSS é coberto por testes unitários e a interface é validada em sessão real do navegador.

## Instalação

> Pré-requisitos: **Node.js ≥ 20** e **npm**. A extensão é construída localmente — ainda não está na Chrome Web Store.

1. Gere o build a partir do código-fonte:

   ```bash
   npm ci
   npm run build
   ```

2. Abra a página de extensões: `brave://extensions` (ou `chrome://extensions` / `edge://extensions`)
3. Ative o **Modo do desenvolvedor**
4. Clique em **Carregar sem compactação** e selecione a pasta **`dist/`**
5. Abra um documento em `docs.google.com` — o tema entra sozinho. 🌙

## Uso

- Clique no ícone **🌙** na barra do navegador → o popup **liga/desliga** o tema. A preferência fica sincronizada entre as abas.
- Após atualizar a extensão, **recarregue a aba do documento** — o CSS é injetado no carregamento da página.

## Como funciona

1. O content script grava `data-ddm-theme="dark"` no elemento `<html>` quando a preferência está ligada (e remove quando desligada).
2. Um único arquivo CSS (`content/docs-theme.css`) reescreve a interface, sempre ancorado nesse atributo:

   ```css
   html[data-ddm-theme='dark'] #docs-menubar {
     background-color: var(--ddm-surface);
     color: var(--ddm-text);
   }
   ```

3. O conteúdo do documento não é tocado: nenhum estilo entra na folha, nenhum observador pesado roda continuamente.
4. A preferência vive no `chrome.storage` e acompanha todas as janelas abertas.

## Desenvolvimento

```bash
npm run dev        # build contínuo durante o desenvolvimento
npm test           # suíte de testes (Vitest)
npm run typecheck  # verificação de tipos (strict)
npm run lint       # ESLint
npm run icons      # regenera os ícones da extensão
```

| Ferramenta | Papel |
|---|---|
| TypeScript + esbuild | content script MV3, sem dependências de runtime |
| Vitest + jsdom | contrato estático do CSS e lógica de ativação |
| `scripts/diagnose/dom-probe.js` | instrumento que mede o DOM real do Google Docs (cole no Console do navegador) |
| `docs/PRD_Docs_Dark_Mode.md` | requisitos, restrições de segurança e fases do projeto |

```text
src/content/   content script, aplicador de tema e styles/docs-theme.css
src/shared/    constantes e strings tipadas compartilhadas
scripts/       build (esbuild), geração de ícones, diagnóstico de DOM
tests/unit/    contrato do CSS + comportamento da extensão
```

## Roadmap

- ✅ **Fase 1** — fundação: estrutura, MV3, ícones, popup
- ✅ **Fase 2** — persistência e sincronização (storage + protocolo tipado)
- 🔨 **Fase 3** — tema da interface: cabeçalho, menus, toolbar, régua *(em andamento)*
- ⬜ **Fase 4** — menus abertos, submenus, diálogos e painéis
- ⬜ **Fase 5** — tema visual da página (opcional) + publicação na Chrome Web Store

## Privacidade e permissões

| Permissão | Por quê |
|---|---|
| `storage` | guardar se o tema está ligado ou desligado |
| `https://docs.google.com/document/*` | injetar o CSS nas páginas do Docs |

- ❌ Nenhuma requisição de rede
- ❌ Nenhum analytics ou telemetria
- ❌ Não lê nem modifica o texto do seu documento

## Contribuindo

Contribuições são bem-vindas! Antes de mexer no tema, leia `docs/PRD_Docs_Dark_Mode.md` — as regras de segurança do CSS (reversibilidade, impressão, legibilidade) vêm de lá. Rode `npm test`, `npm run typecheck` e `npm run lint` antes de enviar o PR.

## Licença

Distribuído sob a licença [MIT](LICENSE). © 2026 [Gabriel-afk-9](https://github.com/Gabriel-afk-9).

---

<div align="center">
  <sub>Se este projeto te ajudou, deixe uma ⭐ — isso ajuda outras pessoas a encontrá-lo.</sub>
</div>
