# PRD --- Docs Dark Mode

## Extensão de modo escuro completo para Google Docs no Brave

**Versão:** 1.0\
**Status:** Documento-base para implementação\
**Plataforma-alvo:** Brave Browser (Chromium)\
**Tipo de produto:** Extensão de navegador\
**Stack:** TypeScript, CSS, HTML, Manifest V3\
**Idioma inicial da interface:** Português (Brasil)

------------------------------------------------------------------------

## 1. Visão geral

### 1.1 Nome provisório

**Docs Dark Mode** --- nome interno/provisório. O nome final poderá ser
alterado sem afetar a arquitetura.

### 1.2 Resumo

Desenvolver uma extensão para o navegador Brave que aplique um tema
escuro ao Google Docs, cobrindo a interface do editor --- barras, menus,
painéis, caixas de diálogo e áreas auxiliares --- e, quando tecnicamente
viável, a página do documento e o texto exibido nela.

A extensão deverá oferecer um controle simples para ativar ou desativar
o tema, preservar a preferência do usuário entre sessões e evitar
modificar o conteúdo real do documento. O tema é uma camada visual local
no navegador: não deverá alterar o arquivo armazenado no Google Drive
nem afetar o documento quando aberto por outras pessoas.

### 1.3 Problema

A interface clara do Google Docs pode ser desconfortável em ambientes
escuros ou durante sessões prolongadas. O produto busca oferecer uma
alternativa escura consistente e controlável sem exigir que o usuário
altere manualmente estilos ou configurações a cada documento.

### 1.4 Objetivos

-   Aplicar modo escuro à interface do Google Docs.
-   Escurecer visualmente a página de edição e adaptar a cor de exibição
    do texto, respeitando as limitações técnicas do editor.
-   Permitir ativar e desativar o tema por meio de um popup da extensão.
-   Persistir a preferência do usuário.
-   Manter separação clara entre interface, estado, regras de negócio,
    integração com o navegador e estilos injetados.
-   Ser seguro, previsível, testável e simples de manter.
-   Funcionar no Brave desktop atual, respeitando as APIs disponíveis do
    Chromium.

### 1.5 Não objetivos

A primeira versão não deverá:

-   Modificar o conteúdo persistido do documento no Google Drive.
-   Substituir a funcionalidade nativa do Google Docs.
-   Oferecer sincronização de preferências entre dispositivos.
-   Coletar telemetria, histórico de navegação ou conteúdo dos
    documentos.
-   Injetar scripts em sites que não sejam o Google Docs.
-   Prometer que o tema escurecerá todos os componentes internos, caso o
    Google Docs altere a estrutura ou utilize áreas que não aceitem a
    técnica aplicada.
-   Alterar a aparência de impressão ou exportação do documento. A
    impressão/exportação deverá preservar o resultado original do Google
    Docs, salvo comportamento nativo próprio do serviço.
-   Fornecer um editor de temas avançado ou uma paleta customizável na
    versão inicial.

------------------------------------------------------------------------

## 2. Público-alvo e cenário principal

### 2.1 Público-alvo

Pessoas que usam o Google Docs no Brave desktop e preferem uma interface
escura.

### 2.2 Jornada principal

1.  O usuário instala a extensão no Brave.
2.  Abre um documento em `docs.google.com`.
3.  Clica no ícone da extensão.
4.  Ativa o interruptor de modo escuro.
5.  A extensão aplica o tema à aba atual, quando compatível.
6.  A preferência é salva e reaplicada em páginas compatíveis abertas
    posteriormente.
7.  O usuário pode desativar o tema pelo mesmo popup.

### 2.3 Cenários alternativos

-   O usuário abre o popup fora do Google Docs: mostrar o estado da
    extensão e uma mensagem clara de que é necessário abrir o Google
    Docs; não tentar alterar a página atual.
-   O usuário desativa o tema: remover os estilos/classes da extensão e
    restaurar a aparência anterior sempre que possível.
-   A página ainda está carregando: informar estado de aplicação
    pendente ou tentar novamente de forma limitada e segura.
-   O Google Docs muda sua estrutura interna: a extensão deve falhar de
    forma controlada, sem quebrar a edição do documento, e a limitação
    deve ser documentada.

------------------------------------------------------------------------

## 3. Escopo funcional

### 3.1 Incluído na versão 1.0

-   Manifest V3.
-   Popup HTML/CSS com interruptor de ativação.
-   Estado global de preferência salvo via `chrome.storage`/API
    compatível com Chromium.
-   Content script restrito ao domínio e às páginas necessárias do
    Google Docs.
-   Aplicação e remoção reversível de estilos.
-   Tema escuro para a interface principal.
-   Tentativa controlada de escurecer a página do documento e adaptar a
    cor de visualização do texto, sem modificar o conteúdo armazenado.
-   Estados visuais de carregamento, ativo, inativo, indisponível e
    erro.
-   Tratamento de mensagens entre popup e content script.
-   Testes automatizados para regras puras e testes de integração/mocks
    para APIs do navegador.
-   Instruções para build, testes, instalação local e depuração.
-   Documentação das limitações e manutenção dos seletores CSS.

### 3.2 Fora do escopo inicial

-   Suporte oficial a Firefox ou Safari.
-   Aplicação a Google Sheets, Slides, Drive ou outros sites.
-   Controles independentes para cada área do editor.
-   Temas claros alternativos, agendamento ou detecção automática de
    horário.
-   Conta de usuário, backend, banco de dados ou conexão externa.
-   Analytics ou coleta de dados.
-   Publicação automática na Chrome Web Store.

------------------------------------------------------------------------

## 4. Requisitos funcionais

### RF-01 --- Ativar e desativar o tema

O popup deverá exibir um controle acessível para ligar/desligar o modo
escuro.

**Critérios de aceitação** - O controle apresenta claramente o estado
atual. - Ao ativar, o estado é persistido e a aba compatível recebe a
atualização. - Ao desativar, os estilos da extensão são removidos ou
desativados sem recarregar o documento, sempre que tecnicamente
viável. - A operação deve funcionar repetidamente sem duplicar estilos,
listeners ou observadores.

### RF-02 --- Persistir preferência

A preferência deverá ser armazenada com a API de storage da extensão.

**Critérios de aceitação** - O estado permanece após fechar e reabrir o
popup. - Novas abas compatíveis recebem a preferência atual. - Se não
houver valor salvo, usar o padrão definido: **modo escuro
desativado**. - Falhas de leitura/gravação são tratadas e comunicadas
sem encerrar abruptamente o popup.

### RF-03 --- Detectar contexto compatível

A extensão deverá identificar se a aba ativa pertence a uma URL
permitida do Google Docs.

**Critérios de aceitação** - O controle reconhece páginas compatíveis em
`docs.google.com/document/`. - Não tenta injetar o tema em domínios não
autorizados. - Para páginas não compatíveis, o popup mostra uma mensagem
informativa e não apresenta falso sucesso.

### RF-04 --- Aplicar tema à interface

Aplicar uma paleta escura consistente a áreas visuais do editor que
possam ser estilizadas com segurança, incluindo, quando presentes:

-   Fundo da aplicação e áreas laterais.
-   Cabeçalho e barras de ferramentas.
-   Menus, submenus e menus de contexto estilizados pelo DOM.
-   Painéis, diálogos e caixas de configuração.
-   Campos de entrada, áreas de pesquisa e controles.
-   Bordas, separadores, ícones e estados de foco/hover.
-   Barras de rolagem quando o navegador e o componente permitirem.

**Critérios de aceitação** - Texto e ícones continuam legíveis. - O tema
não esconde controles essenciais. - Componentes adicionados
dinamicamente são tratados sem varreduras infinitas ou alto consumo de
CPU. - Os seletores ficam centralizados e documentados, não espalhados
por diversos arquivos.

### RF-05 --- Tema da página do documento

A extensão deverá implementar e testar uma estratégia para escurecer
visualmente a página do documento e ajustar a cor do texto exibido no
editor.

**Regras** - Não editar o texto ou a formatação persistida no
documento. - Não executar comandos de edição, não simular digitação e
não alterar o conteúdo via API do Google Docs. - Não aplicar filtros
globais cegamente que invertam fotos, diagramas, emojis ou cores
intencionais. - Preferir classes CSS e variáveis isoladas da extensão,
com escopo claro. - Se a renderização do documento impedir uma solução
confiável, manter a melhor cobertura de interface possível e documentar
exatamente o que não é viável. Não alegar suporte completo sem validação
manual.

**Critérios de aceitação** - Testar documentos de texto simples,
títulos, listas, links, tabelas, imagens e texto colorido. - A
ativação/desativação não pode inserir, apagar ou reformatar conteúdo
salvo. - As limitações de cores de texto e de fundo devem estar
documentadas.

### RF-06 --- Atualização dinâmica

A extensão deverá lidar com elementos criados após o carregamento
inicial, como menus, diálogos e painéis.

**Critérios de aceitação** - Usar `MutationObserver` somente se
necessário e com escopo restrito. - Desconectar observadores quando não
forem mais necessários. - Evitar observadores que reescrevam
repetidamente o DOM ou provoquem loops. - Não depender de temporizadores
em loop contínuo. - Ser idempotente: múltiplas solicitações de aplicação
produzem o mesmo resultado sem duplicação.

### RF-07 --- Estado e feedback no popup

O popup deverá representar pelo menos os estados:

-   Carregando estado.
-   Ativo.
-   Inativo.
-   Página não compatível.
-   Falha ao comunicar com a aba.
-   Preferência salva, mas aplicação pendente, quando aplicável.

As mensagens devem ser curtas, compreensíveis e não exibir stack traces
ao usuário.

### RF-08 --- Comunicação popup/content script

Definir um protocolo de mensagens tipado.

**Critérios de aceitação** - Tipos de mensagem e respostas ficam
centralizados. - Validar mensagens recebidas em runtime, não confiar
apenas no TypeScript. - Tratar ausência de content script, aba fechada,
navegação e erro de permissão. - Não manter estado duplicado e
divergente entre popup, storage e página. O storage é a fonte
persistente da preferência; a página reflete o estado aplicado.

### RF-09 --- Acessibilidade

-   O interruptor deve ser operável por teclado.
-   O foco deve ser visível.
-   Usar rótulo acessível e estado anunciado (`aria-checked` ou elemento
    semântico equivalente).
-   Contraste legível para texto, estados e controles.
-   Não depender somente da cor para comunicar ativo/inativo.
-   Respeitar preferências de redução de movimento; não adicionar
    animações desnecessárias.

### RF-10 --- Diagnóstico para desenvolvimento

-   Erros técnicos podem ser registrados no console durante
    desenvolvimento, sem incluir conteúdo do documento, URLs completas
    sensíveis ou dados pessoais.
-   Não usar `console.log` disperso em produção.
-   Preferir tratamento de erro centralizado e mensagens úteis.
-   Não adicionar telemetria remota.

------------------------------------------------------------------------

## 5. Requisitos não funcionais

### RNF-01 --- Segurança e privacidade

-   Solicitar apenas permissões indispensáveis.
-   Restringir `host_permissions` e `content_scripts.matches` ao Google
    Docs necessário.
-   Não pedir acesso a todo o histórico de navegação.
-   Não usar `eval`, `new Function` ou scripts remotos.
-   Não carregar código executável de CDN.
-   Não transmitir dados do usuário para servidores externos.
-   Não ler o conteúdo do documento para aplicar o tema.
-   Seguir Content Security Policy compatível com Manifest V3.
-   Manter popup, content script e service worker separados conforme a
    necessidade real do produto.

### RNF-02 --- Desempenho

-   Não atrasar perceptivelmente a abertura ou edição de documentos.
-   Evitar consultas DOM globais repetidas em alta frequência.
-   Evitar polling contínuo.
-   Aplicar CSS em lote e observar apenas áreas necessárias.
-   Limpar listeners e observadores quando apropriado.

### RNF-03 --- Manutenibilidade

-   Separar responsabilidades por módulo.
-   Usar TypeScript em modo estrito.
-   Proibir `any` explícito; preferir `unknown` com validação quando o
    tipo não for conhecido.
-   Evitar funções enormes, arquivos monolíticos e dependências
    circulares.
-   Não duplicar constantes, seletores ou regras de estado.
-   Manter funções pequenas, coesas e com nomes claros.
-   Comentar decisões técnicas não óbvias, não cada linha de código.

### RNF-04 --- Compatibilidade

-   Alvo: Brave desktop baseado em Chromium com suporte a Manifest V3.
-   Não depender de APIs exclusivas do Chrome sem verificar sua
    disponibilidade no Brave.
-   Documentar a versão mínima testada.
-   Verificar o comportamento em uma instalação limpa da extensão.

### RNF-05 --- Confiabilidade

-   Desativar a extensão deve restaurar a aparência anterior o máximo
    possível.
-   Falhas de aplicação não podem impedir a edição do documento.
-   A extensão deve tolerar navegação SPA e recarregamento da aba.
-   Não assumir que seletores internos do Google Docs são estáveis.
-   Ter um procedimento de regressão visual manual após alterações de
    seletores.

### RNF-06 --- Qualidade

-   Build reproduzível.
-   Lint e testes executáveis por scripts documentados.
-   Nenhum erro de TypeScript ou lint nas verificações obrigatórias.
-   Testes não devem depender de uma sessão pessoal autenticada no
    Google.
-   Testes manuais reais devem ser documentados separadamente dos testes
    automatizados.

------------------------------------------------------------------------

## 6. UX/UI

### 6.1 Popup

Interface compacta e direta:

1.  Nome e ícone da extensão.
2.  Texto curto explicando a função.
3.  Interruptor "Modo escuro".
4.  Estado atual em texto.
5.  Mensagem contextual quando o usuário não estiver no Google Docs.
6.  Link ou texto discreto para "Sobre / limitações" se necessário.

Evitar configurações avançadas, menus aninhados e elementos decorativos
desnecessários.

### 6.2 Diretrizes visuais

-   Tema escuro coerente, sem preto puro obrigatório em todas as
    superfícies.
-   Definir tokens CSS para fundo principal, superfície, superfície
    elevada, texto primário, texto secundário, borda, foco e realce.
-   Contraste suficiente e estados de interação claros.
-   Estilos do popup separados dos estilos injetados no Google Docs.
-   Usar nomes de classes próprios com prefixo, por exemplo `ddm-`, para
    reduzir colisões.
-   Não sobrescrever indiscriminadamente estilos globais de todos os
    elementos.

### 6.3 Estados de erro

-   "Abra um documento do Google Docs para usar esta extensão."
-   "Não foi possível comunicar com esta página. Tente recarregar o
    documento."
-   "A preferência foi salva, mas o tema ainda não pôde ser aplicado."
-   "Esta página não é compatível com a extensão."

As mensagens finais podem ser refinadas durante a implementação,
mantendo o sentido.

------------------------------------------------------------------------

## 7. Arquitetura e divisão de responsabilidades

### 7.1 Princípios

-   Separação entre apresentação, regras de aplicação do tema e
    integração com APIs do navegador.
-   Dependências apontam para abstrações simples quando isso reduz
    acoplamento.
-   Não introduzir arquitetura excessiva para uma extensão pequena.
-   Regras de estado e validação devem ser testáveis sem abrir o
    navegador.
-   O CSS de tema não deve conter lógica de persistência.
-   O popup não deve manipular diretamente o DOM interno do Google Docs.
-   O content script não deve implementar a interface do popup.
-   A camada de armazenamento não deve depender de componentes visuais.

### 7.2 Estrutura sugerida

``` text
docs-dark-mode/
├── manifest.json
├── package.json
├── tsconfig.json
├── eslint.config.js
├── .gitignore
├── README.md
├── docs/
│   ├── PRD.md
│   ├── ARCHITECTURE.md
│   ├── TESTING.md
│   └── LIMITATIONS.md
├── src/
│   ├── background/
│   │   └── service-worker.ts
│   ├── popup/
│   │   ├── popup.html
│   │   ├── popup.ts
│   │   ├── popup.css
│   │   ├── popup-controller.ts
│   │   └── popup-view.ts
│   ├── content/
│   │   ├── content-entry.ts
│   │   ├── theme-controller.ts
│   │   ├── theme-applier.ts
│   │   ├── dom-observer.ts
│   │   └── styles/
│   │       ├── docs-theme.css
│   │       └── document-theme.css
│   ├── shared/
│   │   ├── constants.ts
│   │   ├── messages.ts
│   │   ├── types.ts
│   │   ├── validators.ts
│   │   └── errors.ts
│   └── platform/
│       ├── storage.ts
│       ├── tabs.ts
│       └── messaging.ts
├── tests/
│   ├── unit/
│   ├── integration/
│   └── fixtures/
└── dist/                 # gerado pelo build; não versionar
```

A estrutura é uma proposta inicial. O OpenCode poderá simplificá-la se
justificar a decisão, mas não deve misturar toda a lógica em um único
arquivo.

### 7.3 Responsabilidades

**`manifest.json`** - Declarar Manifest V3, popup, scripts, permissões
mínimas e recursos. - Não conter permissões genéricas sem justificativa.

**`background/service-worker.ts`** - Coordenar operações que realmente
precisem do contexto de background. - Lidar com eventos de instalação ou
mudanças de preferência, se necessário. - Não deve existir apenas por
hábito: se o produto puder funcionar sem service worker, justificar sua
inclusão ou removê-lo.

**`popup.html` / `popup.css`** - Estrutura semântica e aparência do
popup. - Não implementar regras de negócio no HTML/CSS.

**`popup.ts`** - Ponto de entrada da interface; conecta eventos e
inicializa o controlador. - Não deve conter lógica complexa de
armazenamento ou manipulação do DOM do Google Docs.

**`popup-controller.ts`** - Coordena ações do usuário, leitura da
preferência, validação da aba ativa e envio de comandos. - Não deve ser
responsável por estilos CSS.

**`popup-view.ts`** - Atualiza textos, estados, interruptor, foco e
mensagens do popup. - Recebe dados e apresenta o estado; não acessa
storage diretamente.

**`content/content-entry.ts`** - Inicializa o content script, carrega o
estado e conecta mensagens. - Não deve concentrar regras de tema.

**`theme-controller.ts`** - Decide quando aplicar/remover o tema e
mantém o estado aplicado sincronizado. - Deve ser idempotente.

**`theme-applier.ts`** - Responsável por aplicar/remover classes e
folhas de estilo próprias. - Não deve persistir preferência nem desenhar
o popup.

**`dom-observer.ts`** - Detecta apenas mudanças relevantes em elementos
dinâmicos. - Deve ser usado somente se os testes mostrarem que CSS
estático não basta. - Deve permitir iniciar/parar e evitar ciclos de
mutação.

**`docs-theme.css` / `document-theme.css`** - Contêm os estilos
separados para interface e documento. - Usar tokens, seletores escopados
e comentários para seletores frágeis. - Nunca conter regras para sites
fora do escopo.

**`platform/storage.ts`** - Encapsula a API de armazenamento. - Fornece
operações tipadas de leitura e gravação. - Define comportamento de valor
ausente e tratamento de falhas.

**`platform/tabs.ts`** - Encapsula a leitura e validação da aba ativa e
das URLs compatíveis.

**`platform/messaging.ts`** - Encapsula envio/recepção de mensagens e
normaliza erros de comunicação.

**`shared/messages.ts` / `types.ts`** - Contratos de mensagens, estado
da preferência e respostas tipadas.

**`shared/validators.ts`** - Valida em runtime mensagens e dados vindos
de APIs externas ao código tipado.

**`tests/`** - Testa lógica de domínio, adaptadores e comportamento da
interface. - Não deve exigir login real do Google nos testes unitários.

### 7.4 Fluxo de dependências

-   Popup → controlador → serviços de plataforma → storage/mensageria.
-   Content entry → controlador do tema → aplicador do tema.
-   Controladores dependem de contratos e funções coesas, não de
    detalhes de apresentação.
-   CSS é carregado pela camada de apresentação apropriada.
-   O módulo `shared` não importa módulos de `popup`, `content` ou
    `platform`.

Evitar criar interfaces e classes artificiais para toda função. Usar
abstrações quando facilitarem testes ou isolarem APIs do navegador.

------------------------------------------------------------------------

## 8. Estado e sincronização

### 8.1 Estado persistente

Modelo conceitual:

``` ts
type ThemePreference = {
  enabled: boolean;
};
```

O formato definitivo deve ser simples e versionável, sem armazenar
informações pessoais ou conteúdo do documento.

### 8.2 Fonte da verdade

-   `storage`: preferência persistente do usuário.
-   Popup: visualização temporária da preferência e do contexto da aba
    ativa.
-   Content script: estado de aplicação na página atual.
-   A classe/atributo no DOM não deve ser tratada como fonte
    persistente.

### 8.3 Atualização

Ao ativar/desativar: 1. Validar o contexto da aba. 2. Atualizar a
preferência persistida. 3. Enviar a mudança para a aba compatível. 4.
Aplicar/remover o tema. 5. Atualizar o popup com o resultado. 6. Tratar
separadamente falha de persistência e falha de aplicação.

Não indicar sucesso de aplicação antes de receber uma confirmação. Se a
preferência for salva mas a aplicação falhar, comunicar essa diferença.

### 8.4 Concorrência e múltiplas abas

-   A mudança de preferência deve ser refletida nas abas compatíveis
    abertas, quando viável.
-   Usar o evento de mudança do storage ou estratégia equivalente, sem
    polling.
-   Uma aba que não possua content script deve ser ignorada com
    segurança.
-   Evitar estados contraditórios se duas abas forem ativadas quase
    simultaneamente.

------------------------------------------------------------------------

## 9. Estratégia de tema e limitações do Google Docs

### 9.1 Abordagem

1.  Inspecionar a estrutura real do Google Docs em uma sessão de teste.
2.  Identificar seletores necessários para a interface.
3.  Criar tokens CSS e classes com prefixo próprio.
4.  Aplicar estilos por uma única camada responsável.
5.  Tratar menus e diálogos dinâmicos somente quando necessário.
6.  Testar ativação e remoção em diferentes tipos de documento.

### 9.2 Página e conteúdo do documento

O Google Docs pode representar partes do documento por estruturas
internas e renderização que não se comportam como HTML convencional. Por
isso:

-   Não presumir que alterar `background-color` do `body` escurecerá a
    página.
-   Não presumir que `color` CSS alterará o texto de um documento em
    edição.
-   Não alterar atributos internos de edição sem evidência de que é
    seguro.
-   Não tentar resolver tudo com `filter: invert(1)` aplicado à página
    inteira.
-   Não modificar o conteúdo via clipboard, comandos de edição ou API
    externa.
-   Separar "tema da interface" de "tema visual da página de edição" no
    código e nos testes.
-   Documentar a cobertura real e qualquer componente que não aceite o
    tema.

### 9.3 Estratégia de degradação

Se o tema da página causar inversão de cores de imagens, texto ilegível
ou comportamento de edição incorreto: 1. Remover a regra problemática.
2. Manter o tema das áreas da interface que funcionem corretamente. 3.
Registrar a limitação na documentação. 4. Criar teste de regressão para
impedir a reintrodução do problema.

### 9.4 Manutenção de seletores

-   Centralizar seletores frágeis em arquivo ou módulo dedicado.
-   Marcar seletores que dependem da implementação interna do Google.
-   Não depender de nomes minificados sem necessidade.
-   Manter checklist manual para validar menus, comentários, seleção,
    zoom, rolagem e diálogo de impressão.
-   Mudanças de layout do Google Docs devem ser tratadas como risco
    conhecido.

------------------------------------------------------------------------

## 10. Modelo de dados e permissões

### 10.1 Dados armazenados

Somente a preferência de tema e, se estritamente necessário, uma versão
de configuração.

Não armazenar: - Texto de documentos. - Nomes de arquivos. - Histórico
de navegação. - E-mails ou dados de conta. - Telemetria de uso.

### 10.2 Permissões

Usar apenas as permissões necessárias, por exemplo: - `storage` para
preferência persistente. - Permissões de host restritas a
`https://docs.google.com/document/*` ou ao padrão mínimo exigido pela
implementação.

A necessidade de `activeTab`, `tabs` ou de um service worker deve ser
avaliada conforme a arquitetura final. Não adicionar permissões
preventivamente. A implementação deve confirmar quais permissões são
indispensáveis para consultar a aba ativa, enviar mensagens e aplicar o
content script.

------------------------------------------------------------------------

## 11. Stack e ferramentas de desenvolvimento

### Obrigatório

-   TypeScript com `strict: true`.
-   HTML semântico.
-   CSS moderno, sem framework visual obrigatório.
-   Manifest V3.
-   Bundler adequado para gerar os artefatos de extensão, por exemplo
    Vite ou esbuild, escolhido após avaliar compatibilidade com content
    scripts e popup.
-   ESLint com regras para TypeScript.
-   Framework de testes unitários, por exemplo Vitest.
-   Tipos adequados para APIs de extensão Chromium.

### Diretrizes

-   Usar gerenciador de pacotes consistente e documentado.
-   Fixar versões compatíveis no lockfile.
-   Separar build de desenvolvimento e build de produção.
-   Garantir que `manifest.json` e todos os recursos referenciados sejam
    copiados para `dist/`.
-   Não carregar TypeScript diretamente no navegador; compilar para
    JavaScript.
-   Não incluir dependências desnecessárias.
-   Evitar React ou outro framework de UI para um popup simples, a menos
    que exista uma justificativa concreta.
-   Não usar `any`, `@ts-ignore` ou desativação ampla de lint para
    contornar erros.
-   Não incluir secrets, credenciais ou arquivos pessoais no
    repositório.

------------------------------------------------------------------------

## 12. Plano de testes

### 12.1 Testes unitários

Testar pelo menos: - Validação de URL compatível. - Estado padrão quando
não existe preferência salva. - Conversão/validação de mensagens. -
Decisão de aplicar ou remover tema. - Tratamento de erros dos
adaptadores. - Idempotência do aplicador (com DOM simulado quando
aplicável). - Estados e mensagens exibidos pelo popup.

### 12.2 Testes de integração

-   Popup lê a preferência.
-   Ativação grava preferência e envia mensagem.
-   Desativação remove o tema.
-   Erros de comunicação são tratados.
-   Mudança de storage sincroniza as abas.
-   Página não compatível não recebe estilos.
-   A inicialização repetida não duplica estilos ou observadores.

### 12.3 Testes manuais no Brave

Executar em perfil de teste do navegador:

1.  Instalar a extensão por "Carregar sem compactação".
2.  Abrir documento novo e documento existente.
3.  Ativar e desativar o tema várias vezes.
4.  Recarregar a página com o tema ligado.
5.  Abrir outra aba do Google Docs.
6.  Testar menus, submenus, comentários, compartilhamento e diálogos.
7.  Testar edição, seleção de texto, copiar/colar, desfazer/refazer e
    rolagem.
8.  Testar títulos, listas, links, tabelas, imagens, emojis e texto
    colorido.
9.  Verificar que nenhuma alteração é salva no conteúdo por causa da
    extensão.
10. Abrir outra página fora do Docs e confirmar que nada foi alterado.
11. Desativar a extensão e confirmar que o tema é removido.
12. Verificar console e erros de permissão.

### 12.4 Critérios mínimos de qualidade

-   TypeScript compila sem erros.
-   Lint passa.
-   Testes automatizados passam.
-   Nenhuma permissão sem justificativa.
-   Nenhuma solicitação de rede externa.
-   Nenhum acesso deliberado ao conteúdo do documento.
-   Aplicação e remoção são reversíveis nos componentes suportados.
-   Limitações visuais observadas são documentadas.
-   README permite que outra pessoa instale e teste sem depender do
    autor.

------------------------------------------------------------------------

## 13. Critérios de aceitação do produto

A versão 1.0 é aceitável quando:

1.  A extensão é carregada no Brave sem erro de Manifest.
2.  O popup exibe um interruptor acessível.
3.  A preferência é persistida e reaplicada.
4.  O tema pode ser ligado/desligado sem duplicações.
5.  O tema é restrito às páginas permitidas do Google Docs.
6.  As áreas da interface que foram declaradas como suportadas são
    legíveis em modo escuro.
7.  A estratégia para a página de edição foi testada e suas limitações
    são explícitas.
8.  A extensão não modifica o conteúdo persistido do documento.
9.  Erros de comunicação e páginas incompatíveis são tratados.
10. Build, lint e testes têm comandos documentados.
11. A documentação explica instalação local, permissões, testes,
    arquitetura e limitações.
12. Não há coleta ou transmissão de dados pessoais.

------------------------------------------------------------------------

## 14. Riscos e mitigação

  -----------------------------------------------------------------------
  Risco                   Impacto                 Mitigação
  ----------------------- ----------------------- -----------------------
  Google Docs muda o DOM  Alguns estilos deixam   Seletores centralizados
                          de funcionar            e checklist de
                                                  regressão

  Documento usa           Página/texto não aceita Validar em navegador
  renderização não        CSS esperado            real e documentar
  convencional                                    limitações

  Inversão de             Conteúdo ilegível       Evitar filtros globais;
  imagens/cores                                   testar vários tipos de
                                                  documento

  Conteúdo dinâmico       Menus novos ficam       Usar CSS estático
                          claros                  primeiro; observer
                                                  restrito se necessário

  Permissões excessivas   Risco de privacidade e  Revisar cada permissão
                          menor confiança         e limitar hosts

  Popup e página ficam    Estado inconsistente    Storage como
  dessincronizados                                preferência persistente
                                                  e mensagens tipadas

  Desativação não         Experiência quebrada    Aplicação reversível e
  restaura visual                                 testes de ida/volta
  -----------------------------------------------------------------------

------------------------------------------------------------------------

## 15. Documentação obrigatória

O repositório deverá conter:

-   `README.md`: visão geral, pré-requisitos, instalação, comandos e
    uso.
-   `docs/PRD.md`: este documento.
-   `docs/ARCHITECTURE.md`: módulos, dependências, fluxo de mensagens e
    decisões arquiteturais.
-   `docs/TESTING.md`: testes automatizados e checklist manual.
-   `docs/LIMITATIONS.md`: limitações conhecidas do Google Docs e
    cobertura visual validada.

A documentação deve refletir o comportamento real implementado, não
promessas futuras.

------------------------------------------------------------------------

## 16. Fases de implementação

### Fase 0 --- Inspeção e planejamento

-   Verificar o repositório atual antes de criar ou alterar arquivos.
-   Identificar ferramentas e dependências já existentes.
-   Confirmar versão do Node.js e gerenciador de pacotes.
-   Investigar a estrutura observável do Google Docs para definir
    estratégia CSS.
-   Entregar plano com arquivos previstos, permissões propostas e
    riscos.
-   Não implementar antes de apresentar o plano, se o usuário estiver
    usando o modo PLAN do OpenCode.

**Saída:** plano técnico aprovado, estrutura inicial e decisões
registradas.

### Fase 1 --- Fundação

-   Configurar TypeScript estrito, build, lint e testes.
-   Criar Manifest V3 mínimo.
-   Garantir que o artefato em `dist/` possa ser carregado no Brave.
-   Implementar armazenamento da preferência e validação de URLs.
-   Criar testes para lógica básica.

**Saída:** extensão carregável, ainda sem tema completo.

### Fase 2 --- Popup e comunicação

-   Implementar popup acessível.
-   Implementar contratos de mensagens.
-   Sincronizar preferência e aba ativa.
-   Tratar página não compatível e falhas.

**Saída:** controle funcional para ativar/desativar e persistir estado.

### Fase 3 --- Tema da interface

-   Criar tokens CSS.
-   Aplicar tema a interface principal, menus e diálogos suportados.
-   Testar elementos dinâmicos.
-   Corrigir contrastes e colisões de seletores.

**Saída:** tema escuro da interface validado manualmente.

### Fase 4 --- Página do documento

-   Testar técnicas específicas para a página de edição.
-   Preservar imagens, cores e legibilidade sempre que possível.
-   Garantir que o conteúdo não seja alterado.
-   Descartar abordagens que causem regressões.
-   Documentar cobertura e limitações.

**Saída:** comportamento real documentado e aprovado nos testes
definidos.

### Fase 5 --- Qualidade e entrega

-   Executar build, lint, testes e checklist manual.
-   Corrigir erros e remover código morto.
-   Revisar permissões e privacidade.
-   Atualizar documentação.
-   Fornecer resumo dos arquivos alterados, comandos executados,
    resultados e limitações restantes.

**Saída:** versão 1.0 pronta para uso local.

------------------------------------------------------------------------

## 17. Definição de pronto (Definition of Done)

Uma tarefa só é considerada concluída quando:

-   Implementação corresponde ao requisito.
-   Tipos são seguros e não usam `any`.
-   Erros relevantes são tratados.
-   Testes apropriados foram adicionados ou atualizados.
-   Lint e build passam.
-   Não foram adicionadas dependências ou permissões sem justificativa.
-   A documentação foi atualizada.
-   O comportamento visual foi validado quando a tarefa envolve CSS/DOM.
-   O OpenCode informa claramente o que testou, o que não pôde testar e
    quais limitações restam.

Não declarar que a extensão funciona perfeitamente no Google Docs apenas
porque o build foi concluído.

------------------------------------------------------------------------

## 18. Instruções para o OpenCode

O OpenCode deverá trabalhar de maneira incremental, preservando a
simplicidade do produto.

### Regras de execução

1.  **Inspecionar antes de alterar:** listar a estrutura existente,
    identificar scripts, dependências e arquivos já presentes.
2.  **Não sobrescrever sem conferir:** se houver código, documentação ou
    configuração, analisar e preservar o que for aproveitável.
3.  **Planejar primeiro:** apresentar arquitetura, dependências,
    permissões e plano por fases antes de executar a implementação
    ampla.
4.  **Implementar por etapas pequenas:** fundação, popup, comunicação,
    tema da interface, página do documento e validação.
5.  **Separar lógica e visual:** não colocar regras de negócio em
    arquivos CSS/HTML nem concentrar tudo no ponto de entrada.
6.  **Evitar overengineering:** não adicionar backend, banco de dados,
    framework de UI ou abstrações sem necessidade.
7.  **Não inventar sucesso:** se uma área do Google Docs não puder ser
    estilizada de forma confiável, explicar e documentar.
8.  **Testar de verdade:** executar os scripts disponíveis e distinguir
    testes automatizados de validação manual no Brave.
9.  **Não ignorar erros:** não desativar TypeScript/lint para fazer o
    build passar.
10. **Entregar relatório final:** mudanças realizadas, estrutura final,
    comandos executados e resultados, passos para carregar a extensão no
    Brave e limitações conhecidas.

### Formato esperado do relatório final

-   Resumo do que foi implementado.
-   Arquitetura e responsabilidades.
-   Arquivos principais criados/modificados.
-   Dependências e permissões adicionadas com justificativas.
-   Comandos executados e resultados reais.
-   Instruções de instalação local no Brave.
-   Checklist de testes concluídos e pendentes.
-   Limitações do tema no Google Docs.
-   Próximos passos estritamente necessários, sem uma lista extensa de
    funcionalidades opcionais.

------------------------------------------------------------------------

## 19. Decisões de produto registradas

-   Navegador principal: Brave desktop.
-   Plataforma técnica: Chromium Extensions, Manifest V3.
-   Linguagens: TypeScript, CSS e HTML.
-   Experiência desejada: modo escuro completo da interface e tentativa
    validada de tema para a página e o texto do documento.
-   Preferência padrão: desativada.
-   Persistência: armazenamento local da extensão.
-   Privacidade: sem backend, analytics ou transmissão de conteúdo.
-   Arquitetura: módulos com responsabilidades claras, separação de
    lógica e apresentação e complexidade proporcional ao produto.
-   Estratégia de entrega: primeiro funcionar localmente no Brave;
    publicação em loja é etapa futura e não requisito da versão 1.0.

**Nota final:** "Modo escuro completo" é o objetivo do produto, mas a
cobertura da página de edição depende de como o Google Docs renderiza
internamente o documento. O critério de sucesso deve ser definido por
testes reais e transparência sobre limitações, nunca por uma promessa
abstrata de que CSS consegue controlar toda a renderização.
