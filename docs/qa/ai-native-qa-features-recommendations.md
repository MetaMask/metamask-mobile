# Recomendaciones: Features IA nativas para QA (E2E, procesos, MCPs)

Documento de propuestas para mejorar el proceso de QA a nivel de código e2e, pipelines, reporting y herramientas (MCPs). Basado en el estado actual del repo: Detox + Appwright, e2e-ai-analyzer, Cursor rules, workflows CI y MCPs existentes.

---

## 1. Código E2E (tests, framework, Page Objects)

### 1.1 Reglas Cursor / AGENTS.md específicas para QA

- **Objetivo**: Que el agente siga siempre las guías de e2e sin tener que recordarlas.
- **Acción**: Añadir en `.cursor/rules/` una regla `e2e-qa-agent.mdc` que:
  - Referencie `e2e-testing-guidelines.mdc` y `tests/docs/README.md`.
  - Indique: usar solo `tests/framework/index.ts`, POM obligatorio, sin `TestHelpers.delay()`, `description` en assertions/gestures, FixtureBuilder para estado.
  - Incluya un mini checklist pre-commit: no selectores directos en specs, imports desde framework, timeouts con sentido.
- **Beneficio**: Menos violaciones de patrones prohibidos y tests más mantenibles.

### 1.2 Generación/actualización de Page Objects y selectores con IA

- **Objetivo**: Reducir trabajo manual al añadir pantallas o cambiar testIDs.
- **Ideas**:
  - **Cursor rule o skill**: Dado un flujo (ej. “login + enviar ETH”), que el agente proponga o extienda Page Objects y métodos (`tapLogin`, `verifyBalance`) siguiendo el POM del repo.
  - **Script/Modo en e2e-ai-analyzer**: Modo `suggest-page-object` que, dado un spec o un listado de testIDs/selectores, sugiera la estructura de Page Object (getters, métodos de acción/verificación) y dónde colocar selectores (`.testIds.ts` junto al componente).
- **Insumos**: Spec existente, diff de UI (nuevos testIDs), o lista de pantallas del flujo.
- **Salida**: Diff/patch sugerido para Page Object y, si aplica, para selectors.

### 1.3 Detección de anti‑patrones y “lint” E2E con IA

- **Objetivo**: Detectar en PRs uso de `delay()`, selectores directos, assertions sin `description`, etc.
- **Implementación**:
  - **Opción A**: Reglas ESLint/Detox custom donde sea posible (ej. no `TestHelpers.delay`, no `element(by.id(...))` en `tests/smoke|regression`).
  - **Opción B**: Modo en e2e-ai-analyzer, p. ej. `--mode lint-specs`, que analice los specs tocados en el PR y devuelva un informe (violaciones + sugerencias de reemplazo según las guías).
- **CI**: Job opcional o bloqueante en PR que ejecute el linter E2E y/o el modo `lint-specs` y comente en el PR.

### 1.4 Sugerencia de fixtures y mocks por flujo

- **Objetivo**: Que al escribir un test nuevo el agente (o un modo del analyzer) sugiera el `FixtureBuilder` y `testSpecificMock` adecuados.
- **Ideas**:
  - Documentar en un “skill” (como `metamask-core-architecture.md`) los fixtures más usados por flujo (wallet, dapp, tokens, contactos, feature flags).
  - Modo `suggest-fixture`: dado el título del test o los pasos (ej. “send ERC20 to contact”), devolver un snippet de `FixtureBuilder` + mocks recomendados y referencia a `tests/api-mocking` o `setupRemoteFeatureFlagsMock`.
- **Beneficio**: Menos tests que fallan por estado inicial incorrecto o APIs no mockeadas.

---

## 2. Procesos y pipelines (CI/CD, reporting)

### 2.1 Extender el E2E AI Analyzer (select-tags → más modos)

Ya tenéis `select-tags` en CI. Ampliar con modos que den valor en QA:

- **`suggest-regression-scope`**: Dado el diff del PR, sugerir qué carpetas de `tests/regression/` deberían ejecutarse (no solo smoke tags), con reasoning y nivel de confianza.
- **`explain-failure`**: Input: nombre del test, stack trace o log de fallo, y opcionalmente artefactos (screenshot, HAR). Output: resumen legible + hipótesis (selector obsoleto, timing, estado no mockeado, cambio de UI) y enlaces a Page Object / fixture relacionados.
- **`flaky-candidate`**: Integrado con el flaky-test-report: para tests que fallan de forma intermitente, que el analyzer proponga causas probables (animaciones, red, no uso de `executeWithRetry` o `checkStability`) y sugerencias de código.

### 2.2 Comentarios automáticos en PR con resumen IA

- **Objetivo**: Un solo comentario por PR con: tags seleccionados (ya lo tenéis), riesgo, tests recomendados (smoke/regression), y si hay cambios en e2e, resumen de lint/anti‑patrones.
- **Implementación**: Reutilizar `e2e-ai-analysis.json` y, si se añade `lint-specs`, unificar en un reporte que un job de CI publique como comment (GitHub Action que lee los JSON y formatea en markdown).

### 2.3 RCA automático en fallos E2E (no solo issues)

- **Objetivo**: Ante un fallo en run E2E (smoke/regression/performance), generar un borrador de causa raíz.
- **Ideas**:
  - Workflow que se dispare al fallar un job E2E (o desde manual dispatch), que recopile: test name, branch, artefactos (logs, screenshots si los hay), diff reciente del test o del Page Object.
  - Llamar a un modo del e2e-ai-analyzer tipo `explain-failure` y publicar el resultado en un comment en el PR o en un issue de “E2E failure RCA”.
  - Opcional: enlazar con Jira (MCP Atlassian) para crear/actualizar un ticket con ese resumen.

### 2.4 Resúmenes en Slack con contexto IA

- **Objetivo**: Además del resumen actual de performance E2E, incluir una línea por fallo relevante (test, dispositivo, hipótesis breve).
- **Implementación**: En el paso que genera el Slack summary, si hay `failedTestsStats` o equivalente, llamar al analyzer en modo `explain-failure` (o un endpoint interno) por cada fallo (con límite) y añadir al mensaje un “Possible cause: …”. Se puede hacer en lote para no disparar coste de LLM.

---

## 3. MCPs (Model Context Protocol)

### 3.1 MCP “E2E Repo” (interno)

- **Objetivo**: Exponer al agente (Cursor/Claude) operaciones sobre el repo de e2e sin tener que recordar rutas y comandos.
- **Herramientas sugeridas**:
  - `e2e_list_specs` – listar specs por carpeta (smoke/regression), opcionalmente por tag.
  - `e2e_list_page_objects` – listar Page Objects y sus métodos públicos.
  - `e2e_get_test_ids` – dado un componente o ruta, devolver testIDs definidos (p. ej. en `.testIds.ts`).
  - `e2e_run_analyzer` – ejecutar e2e-ai-analyzer con un modo y opciones (select-tags, lint-specs, suggest-fixture) y devolver el resultado en texto/JSON.
  - `e2e_get_fixture_presets` – listar presets de FixtureBuilder y ejemplos de uso desde tests/docs y specs.
- **Implementación**: Servidor MCP (Node/TypeScript) que lea el filesystem y/o ejecute los scripts existentes (`tests/tools/e2e-ai-analyzer`, listados de `tests/smoke`, `tests/regression`, `tests/page-objects`). Se puede alojar en el mismo repo bajo `tests/tools/e2e-mcp-server/` o en un paquete aparte.

### 3.2 Integración Jira (Atlassian MCP) en flujos QA

- Ya tenéis setup Jira MCP. Usarlo de forma explícita en flujos QA:
  - **Crear bug desde fallo E2E**: Tras un run fallido (o desde un comentario “Create Jira bug”), rellenar título, descripción (stack, test, dispositivo), y opcionalmente enlace al run/artefactos.
  - **Etiquetar/transicionar**: Al cerrar un bug vinculado a un test E2E, recordar re-ejecutar ese test o ese tag en el siguiente run.
  - **Documentar en AGENTS.md**: Que el agente sepa que puede “crear/actualizar issues en Jira para fallos E2E” usando el MCP.

### 3.3 iOS Simulator (XcodeBuild MCP) en debugging E2E

- Ya tenéis `setup-ios-simulator-mcp.md`. Para QA:
  - **Flujo**: Reproducir un fallo localmente: el agente puede usar el MCP para arrancar simulador, instalar build, lanzar app y (si el MCP lo permite) capturar screenshot o jerarquía UI en el punto de fallo.
  - **Documentar**: En `docs/readme/e2e-testing.md` o en una sección “Debugging E2E con Cursor/Claude”, indicar que con el iOS Simulator MCP se puede inspeccionar el estado del simulador tras un fallo.
  - **Extensión futura**: Un MCP o script que “replay” los últimos pasos del test (tap en X, type en Y) en el simulador para reproducir el fallo paso a paso.

### 3.4 MCP Browser (cursor-ide-browser / cursor-browser-extension)

- **Uso en QA**:
  - Tests que involucran WebView o dapps: el agente puede abrir la misma URL en el browser MCP para verificar contenido o selectores sin levantar el dispositivo.
  - Revisar reportes HTML de Detox/Appwright si se publican: abrir el report y extraer resúmenes o screenshots.
- **Documentar**: En las reglas de e2e, mencionar que para flujos con dapp se puede usar el browser MCP para inspeccionar la contraparte web.

---

## 4. Documentación y “single source of truth”

### 4.1 Sección “AI E2E Testing System” en tests/docs/README.md

- El TOC ya referencia “AI E2E Testing System” pero no hay contenido. Añadir una sección que describa:
  - Qué es el e2e-ai-analyzer y cómo se invoca (CLI, CI).
  - Modos disponibles (select-tags y los que se añadan).
  - Cómo usar los resultados en local y en PR.
  - Enlace a `tests/tools/e2e-ai-analyzer/README.md` y a las Cursor rules de e2e.

### 4.2 Skills para el analyzer

- Ampliar `e2e-ai-analyzer/skills/` con documentos cortos que el agente cargue en análisis:
  - **e2e-patterns-and-antipatterns.md**: Resumen de patrones obligatorios y prohibidos (extraído de `e2e-testing-guidelines.mdc`).
  - **fixtures-and-mocks.md**: FixtureBuilder típicos, `testSpecificMock`, y dónde están los default mocks.
  - **page-object-conventions.md**: Estructura de Page Objects, ubicación de testIDs, convención de nombres.

Así los modos `suggest-page-object`, `suggest-fixture` y `explain-failure` tendrán contexto alineado con el repo.

---

## 5. Priorización sugerida

| Prioridad | Feature                                                       | Esfuerzo | Impacto                               |
| --------- | ------------------------------------------------------------- | -------- | ------------------------------------- |
| Alta      | Regla Cursor `e2e-qa-agent.mdc` + checklist                   | Bajo     | Alto (menos errores de convención)    |
| Alta      | Completar “AI E2E Testing System” en tests/docs/README.md     | Bajo     | Medio (onboarding y consistencia)     |
| Alta      | Modo `explain-failure` en e2e-ai-analyzer                     | Medio    | Alto (debug más rápido)               |
| Media     | Modo `lint-specs` (anti‑patrones) en analyzer + CI            | Medio    | Alto (calidad de specs en PR)         |
| Media     | MCP “E2E Repo” (list specs, run analyzer, fixture presets)    | Medio    | Alto (mejor uso del agente en Cursor) |
| Media     | Comentario único en PR (tags + lint + riesgo)                 | Bajo     | Medio                                 |
| Media     | Skills (e2e-patterns, fixtures, page-object) para el analyzer | Bajo     | Medio                                 |
| Baja      | `suggest-page-object` / `suggest-fixture`                     | Alto     | Medio                                 |
| Baja      | RCA automático en fallos E2E + Jira                           | Alto     | Medio a largo plazo                   |
| Baja      | Slack con “Possible cause” por fallo (IA)                     | Medio    | Medio                                 |

---

## 6. Resumen

- **Código E2E**: Reglas Cursor específicas para QA, “lint” de specs con IA, sugerencia de Page Objects y fixtures desde el e2e-ai-analyzer.
- **Procesos**: Más modos del analyzer (explain-failure, suggest-regression-scope, flaky-candidate), comentarios en PR unificados, RCA automático y Slack con contexto IA.
- **MCPs**: MCP interno “E2E Repo”, uso explícito de Jira e iOS Simulator en flujos de debugging, y documentación del uso del browser MCP para dapps/reportes.

Con esto se mejora la calidad del código e2e, la velocidad de diagnóstico de fallos y la experiencia de QA al trabajar con el agente (Cursor) y con CI.
