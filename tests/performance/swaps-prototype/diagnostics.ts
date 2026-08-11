export const SWAPS_PERFORMANCE_DIAGNOSTICS_KEY =
  '__SWAPS_PERF_ANALYSIS__' as const;

export interface ScenarioPhase {
  name: 'open-swaps' | 'select-destination' | 'fetch-first-quote';
  startedAt: number;
  endedAt: number;
  durationMs: number;
}

export interface RuntimeMarker {
  name: string;
  timestamp: number;
}

export interface RuntimeNetworkEntry {
  timestamp: number;
  method: string;
  host: string;
  path: string;
  status?: number;
  durationMs?: number;
  rpcMethod?: string;
  error?: string;
}

export interface RuntimeConsoleEntry {
  timestamp: number;
  level: 'error' | 'warn';
  message: string;
}

export interface RuntimeRenderEntry {
  count: number;
  timestamps: number[];
}

export interface RuntimeCapture {
  enabled: boolean;
  startedAt: number;
  markers: RuntimeMarker[];
  renders: Record<string, RuntimeRenderEntry>;
  network: RuntimeNetworkEntry[];
  console: RuntimeConsoleEntry[];
}

export interface ScenarioSummary {
  networkRequests: number;
  failedNetworkRequests: number;
  consoleErrors: number;
  renders: Record<string, number>;
  networkRequestsByPhase: Record<string, number>;
  slowestNetworkRequests: RuntimeNetworkEntry[];
}

export interface SwapsPerformanceArtifact {
  schemaVersion: 1;
  run: {
    id: string;
    scenario: 'open-swaps-fetch-one-eth-quote';
    createdAt: string;
    commit: string;
    platform: 'ios-simulator';
    metroPort: number;
    status: 'passed' | 'failed';
  };
  preconditions: {
    walletUnlocked: boolean;
    sourceTokenText: string | null;
    destinationToken: 'USDC';
    sourceAmount: '1';
  };
  phases: ScenarioPhase[];
  capture: RuntimeCapture | null;
  summary: ScenarioSummary | null;
  failure: string | null;
}

export interface ScenarioFinding {
  severity: 'high' | 'medium' | 'info';
  message: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isRuntimeMarker(value: unknown): value is RuntimeMarker {
  return (
    isRecord(value) &&
    typeof value.name === 'string' &&
    typeof value.timestamp === 'number'
  );
}

function isRuntimeNetworkEntry(value: unknown): value is RuntimeNetworkEntry {
  return (
    isRecord(value) &&
    typeof value.timestamp === 'number' &&
    typeof value.method === 'string' &&
    typeof value.host === 'string' &&
    typeof value.path === 'string'
  );
}

function isRuntimeConsoleEntry(value: unknown): value is RuntimeConsoleEntry {
  return (
    isRecord(value) &&
    typeof value.timestamp === 'number' &&
    (value.level === 'error' || value.level === 'warn') &&
    typeof value.message === 'string'
  );
}

function isRuntimeRenderEntry(value: unknown): value is RuntimeRenderEntry {
  return (
    isRecord(value) &&
    typeof value.count === 'number' &&
    Array.isArray(value.timestamps) &&
    value.timestamps.every((timestamp) => typeof timestamp === 'number')
  );
}

function parseRuntimeRenders(
  value: unknown,
): Record<string, RuntimeRenderEntry> | null {
  if (!isRecord(value)) {
    return null;
  }

  const renders: Record<string, RuntimeRenderEntry> = {};
  for (const [name, entry] of Object.entries(value)) {
    if (!isRuntimeRenderEntry(entry)) {
      return null;
    }
    renders[name] = entry;
  }
  return renders;
}

function parseNumberRecord(value: unknown): Record<string, number> | null {
  if (!isRecord(value)) {
    return null;
  }

  const numbers: Record<string, number> = {};
  for (const [name, entry] of Object.entries(value)) {
    if (typeof entry !== 'number') {
      return null;
    }
    numbers[name] = entry;
  }
  return numbers;
}

function isScenarioPhase(value: unknown): value is ScenarioPhase {
  return (
    isRecord(value) &&
    (value.name === 'open-swaps' ||
      value.name === 'select-destination' ||
      value.name === 'fetch-first-quote') &&
    typeof value.startedAt === 'number' &&
    typeof value.endedAt === 'number' &&
    typeof value.durationMs === 'number'
  );
}

function parseScenarioSummary(value: unknown): ScenarioSummary | null {
  if (
    !isRecord(value) ||
    typeof value.networkRequests !== 'number' ||
    typeof value.failedNetworkRequests !== 'number' ||
    typeof value.consoleErrors !== 'number' ||
    !Array.isArray(value.slowestNetworkRequests) ||
    !value.slowestNetworkRequests.every(isRuntimeNetworkEntry)
  ) {
    return null;
  }

  const renders = parseNumberRecord(value.renders);
  const networkRequestsByPhase = parseNumberRecord(
    value.networkRequestsByPhase,
  );
  if (!renders || !networkRequestsByPhase) {
    return null;
  }

  return {
    networkRequests: value.networkRequests,
    failedNetworkRequests: value.failedNetworkRequests,
    consoleErrors: value.consoleErrors,
    renders,
    networkRequestsByPhase,
    slowestNetworkRequests: value.slowestNetworkRequests,
  };
}

/**
 * Builds the opt-in Hermes collector used by the Swaps performance prototype.
 * Network URLs are reduced to host and normalized path before storage.
 *
 * @returns A self-contained JavaScript expression for Runtime.evaluate.
 */
export function buildInstallDiagnosticsExpression(): string {
  return `(function(){
    var key=${JSON.stringify(SWAPS_PERFORMANCE_DIAGNOSTICS_KEY)};
    var root=globalThis;
    root[key]={enabled:true,startedAt:Date.now(),markers:[],renders:{},network:[],console:[]};
    function sanitizePath(path){
      return String(path||'/').split('/').map(function(segment){
        if(!segment){return segment;}
        if(segment.length>24||/^(0x)?[0-9a-f]{16,}$/i.test(segment)||/^[A-Za-z0-9_-]{24,}$/.test(segment)){return ':id';}
        return segment;
      }).join('/');
    }
    function sanitizeUrl(input){
      var raw=typeof input==='string'?input:(input&&input.url)||String(input);
      try{var parsed=new URL(raw);return {host:parsed.host,path:sanitizePath(parsed.pathname)};}catch(error){
        var match=/^https?:\\/\\/([^/?#]+)([^?#]*)/.exec(raw);
        return match?{host:match[1],path:sanitizePath(match[2])}:{host:'unknown',path:'/unparseable'};
      }
    }
    function sanitizeMessage(message){
      return String(message).replace(/https?:\\/\\/\\S+/g,'[url]').replace(/0x[0-9a-f]{16,}/gi,'[hex]').slice(0,240);
    }
    if(!root.fetch.__swapsPerfPrototypeWrapped){
      var originalFetch=root.fetch;
      var wrappedFetch=function(){
        var args=arguments;
        var capture=root[key];
        if(!capture||!capture.enabled){return originalFetch.apply(root,args);}
        var input=args[0];
        var options=args[1]||{};
        var sanitized=sanitizeUrl(input);
        var entry={timestamp:Date.now(),method:options.method||(input&&input.method)||'GET',host:sanitized.host,path:sanitized.path};
        if(options.body){try{var body=typeof options.body==='string'?JSON.parse(options.body):options.body;if(body&&body.method){entry.rpcMethod=String(body.method);}}catch(error){}}
        capture.network.push(entry);
        if(capture.network.length>1000){capture.network=capture.network.slice(-750);}
        return originalFetch.apply(root,args).then(function(response){entry.status=response.status;entry.durationMs=Date.now()-entry.timestamp;return response;}).catch(function(error){entry.error=sanitizeMessage(error);entry.durationMs=Date.now()-entry.timestamp;throw error;});
      };
      wrappedFetch.__swapsPerfPrototypeWrapped=true;
      root.fetch=wrappedFetch;
    }
    ['warn','error'].forEach(function(level){
      var original=root.console[level];
      if(original.__swapsPerfPrototypeWrapped){return;}
      var wrapped=function(){
        var capture=root[key];
        if(capture&&capture.enabled){
          var message=Array.prototype.slice.call(arguments).map(sanitizeMessage).join(' ');
          capture.console.push({timestamp:Date.now(),level:level,message:message});
          if(capture.console.length>500){capture.console=capture.console.slice(-350);}
        }
        return original.apply(root.console,arguments);
      };
      wrapped.__swapsPerfPrototypeWrapped=true;
      root.console[level]=wrapped;
    });
    return JSON.stringify({installed:true,startedAt:root[key].startedAt});
  })()`;
}

/**
 * Builds a runtime marker expression aligned to the network and render clock.
 *
 * @param name - Stable phase boundary name.
 * @returns A self-contained JavaScript expression for Runtime.evaluate.
 */
export function buildMarkerExpression(name: string): string {
  return `(function(){var capture=globalThis[${JSON.stringify(
    SWAPS_PERFORMANCE_DIAGNOSTICS_KEY,
  )}];if(!capture){return false;}capture.markers.push({name:${JSON.stringify(
    name,
  )},timestamp:Date.now()});return true;})()`;
}

/**
 * Builds the expression used to disable and serialize the runtime collector.
 *
 * @returns A self-contained JavaScript expression for Runtime.evaluate.
 */
export function buildDrainDiagnosticsExpression(): string {
  return `(function(){var capture=globalThis[${JSON.stringify(
    SWAPS_PERFORMANCE_DIAGNOSTICS_KEY,
  )}]||null;if(capture){capture.enabled=false;}return JSON.stringify(capture);})()`;
}

/**
 * Extracts a Runtime.evaluate return value from the nested mm CDP response.
 *
 * @param output - Parsed JSON printed by `yarn mm cdp`.
 * @returns The first nested CDP `value`, or undefined when absent.
 */
export function extractCdpEvaluationValue(output: unknown): unknown {
  if (!isRecord(output)) {
    return undefined;
  }

  if ('value' in output) {
    return output.value;
  }

  for (const key of ['result', 'data']) {
    const nested = extractCdpEvaluationValue(output[key]);
    if (nested !== undefined) {
      return nested;
    }
  }

  return undefined;
}

/**
 * Validates and normalizes the JSON serialized by the Hermes collector.
 *
 * @param value - Parsed JSON from the Runtime.evaluate string value.
 * @returns A typed runtime capture, or null when the payload is incomplete.
 */
export function parseRuntimeCapture(value: unknown): RuntimeCapture | null {
  if (
    !isRecord(value) ||
    typeof value.enabled !== 'boolean' ||
    typeof value.startedAt !== 'number' ||
    !Array.isArray(value.markers) ||
    !Array.isArray(value.network) ||
    !Array.isArray(value.console)
  ) {
    return null;
  }

  const renders = parseRuntimeRenders(value.renders);
  if (!renders) {
    return null;
  }

  if (
    !value.markers.every(isRuntimeMarker) ||
    !value.network.every(isRuntimeNetworkEntry) ||
    !value.console.every(isRuntimeConsoleEntry)
  ) {
    return null;
  }

  return {
    enabled: value.enabled,
    startedAt: value.startedAt,
    markers: value.markers,
    renders,
    network: value.network,
    console: value.console,
  };
}

/**
 * Validates a persisted Swaps performance artifact before analysis.
 *
 * @param value - Parsed JSON artifact.
 * @returns A typed artifact, or null when required fields are invalid.
 */
export function parseSwapsPerformanceArtifact(
  value: unknown,
): SwapsPerformanceArtifact | null {
  if (
    !isRecord(value) ||
    value.schemaVersion !== 1 ||
    !isRecord(value.run) ||
    typeof value.run.id !== 'string' ||
    value.run.scenario !== 'open-swaps-fetch-one-eth-quote' ||
    typeof value.run.createdAt !== 'string' ||
    typeof value.run.commit !== 'string' ||
    value.run.platform !== 'ios-simulator' ||
    typeof value.run.metroPort !== 'number' ||
    (value.run.status !== 'passed' && value.run.status !== 'failed') ||
    !isRecord(value.preconditions) ||
    typeof value.preconditions.walletUnlocked !== 'boolean' ||
    (value.preconditions.sourceTokenText !== null &&
      typeof value.preconditions.sourceTokenText !== 'string') ||
    value.preconditions.destinationToken !== 'USDC' ||
    value.preconditions.sourceAmount !== '1' ||
    !Array.isArray(value.phases) ||
    !value.phases.every(isScenarioPhase) ||
    (value.failure !== null && typeof value.failure !== 'string')
  ) {
    return null;
  }

  const capture =
    value.capture === null ? null : parseRuntimeCapture(value.capture);
  const summary =
    value.summary === null ? null : parseScenarioSummary(value.summary);
  if (
    (value.capture !== null && capture === null) ||
    (value.summary !== null && summary === null)
  ) {
    return null;
  }

  return {
    schemaVersion: 1,
    run: {
      id: value.run.id,
      scenario: 'open-swaps-fetch-one-eth-quote',
      createdAt: value.run.createdAt,
      commit: value.run.commit,
      platform: 'ios-simulator',
      metroPort: value.run.metroPort,
      status: value.run.status,
    },
    preconditions: {
      walletUnlocked: value.preconditions.walletUnlocked,
      sourceTokenText: value.preconditions.sourceTokenText,
      destinationToken: 'USDC',
      sourceAmount: '1',
    },
    phases: value.phases,
    capture,
    summary,
    failure: value.failure,
  };
}

function extractTextForTestId(output: unknown, testId: string): string | null {
  if (Array.isArray(output)) {
    for (const value of output) {
      const text = extractTextForTestId(value, testId);
      if (text !== null) {
        return text;
      }
    }
    return null;
  }

  if (!isRecord(output)) {
    return null;
  }

  if (output.testId === testId && typeof output.text === 'string') {
    return output.text;
  }

  for (const value of Object.values(output)) {
    const text = extractTextForTestId(value, testId);
    if (text !== null) {
      return text;
    }
  }

  return null;
}

/**
 * Extracts visible element text from the structured mm interaction response.
 *
 * @param output - Parsed JSON or plain command output.
 * @param testId - Exact test ID whose text takes precedence in screen output.
 * @returns The visible text when present.
 */
export function extractInteractionText(
  output: unknown,
  testId?: string,
): string | null {
  if (testId) {
    const targetText = extractTextForTestId(output, testId);
    if (targetText !== null) {
      return targetText;
    }
  }

  if (typeof output === 'string') {
    return output;
  }
  if (!isRecord(output)) {
    return null;
  }

  for (const key of ['text', 'value', 'result']) {
    const text = extractInteractionText(output[key]);
    if (text !== null) {
      return text;
    }
  }

  return null;
}

/**
 * Determines whether an element text contains a positive numeric quote.
 *
 * @param text - Destination amount text from the Swaps view.
 * @returns True when at least one parsed numeric value is greater than zero.
 */
export function hasPositiveNumericValue(text: string | null): boolean {
  if (!text) {
    return false;
  }

  const matches = text.match(/[0-9][0-9,.]*/gu) ?? [];
  return matches.some((match) => Number(match.replaceAll(',', '')) > 0);
}

/**
 * Produces a compact analysis for one prototype artifact.
 *
 * @param capture - Runtime render/network/console capture.
 * @param phases - Scenario phase boundaries using the same wall clock.
 * @returns Summary fields suitable for terminal and Markdown reporting.
 */
export function summarizeCapture(
  capture: RuntimeCapture,
  phases: ScenarioPhase[],
): ScenarioSummary {
  const renders = Object.fromEntries(
    Object.entries(capture.renders).map(([name, entry]) => [name, entry.count]),
  );
  const networkRequestsByPhase = Object.fromEntries(
    phases.map((phase) => [
      phase.name,
      capture.network.filter(
        (entry) =>
          entry.timestamp >= phase.startedAt &&
          entry.timestamp <= phase.endedAt,
      ).length,
    ]),
  );
  const slowestNetworkRequests = [...capture.network]
    .filter((entry) => entry.durationMs !== undefined)
    .sort((first, second) => (second.durationMs ?? 0) - (first.durationMs ?? 0))
    .slice(0, 5);

  return {
    networkRequests: capture.network.length,
    failedNetworkRequests: capture.network.filter(
      (entry) =>
        entry.error !== undefined ||
        (entry.status !== undefined && entry.status >= 400),
    ).length,
    consoleErrors: capture.console.filter((entry) => entry.level === 'error')
      .length,
    renders,
    networkRequestsByPhase,
    slowestNetworkRequests,
  };
}

/**
 * Produces conservative findings for a single scenario run.
 *
 * @param artifact - Validated scenario artifact.
 * @returns Findings that distinguish failures from single-run observations.
 */
export function findScenarioFindings(
  artifact: SwapsPerformanceArtifact,
): ScenarioFinding[] {
  const findings: ScenarioFinding[] = [];

  if (artifact.failure) {
    findings.push({
      severity: 'high',
      message: `Scenario failed: ${artifact.failure}`,
    });
  }
  if (!artifact.capture || !artifact.summary) {
    findings.push({
      severity: 'high',
      message: 'Runtime capture or summary is missing.',
    });
  } else {
    if (Object.keys(artifact.summary.renders).length === 0) {
      findings.push({
        severity: 'high',
        message:
          'No render probes were captured; run the prepare step before Metro bundles the scenario.',
      });
    }
    if (artifact.summary.failedNetworkRequests > 0) {
      findings.push({
        severity: 'high',
        message: `${artifact.summary.failedNetworkRequests} network request(s) failed.`,
      });
    }
    if (artifact.summary.consoleErrors > 0) {
      findings.push({
        severity: 'high',
        message: `${artifact.summary.consoleErrors} console error(s) were captured.`,
      });
    }

    const slowRequests = artifact.summary.slowestNetworkRequests.filter(
      (entry) => (entry.durationMs ?? 0) > 5_000,
    );
    if (slowRequests.length > 0) {
      findings.push({
        severity: 'medium',
        message: `${slowRequests.length} network request(s) took longer than 5000 ms.`,
      });
    }
  }

  findings.push({
    severity: 'info',
    message:
      'This is one development-build run. Compare repeated runs on the same simulator before attributing a regression.',
  });

  return findings;
}

/**
 * Formats the single-run prototype result as a reviewable Markdown report.
 *
 * @param artifact - Completed or failed scenario artifact.
 * @returns Markdown report text.
 */
export function formatArtifactMarkdown(
  artifact: SwapsPerformanceArtifact,
): string {
  const findings = findScenarioFindings(artifact);
  const lines = [
    '# Swaps performance prototype',
    '',
    `Status: **${artifact.run.status}**`,
    `Run: \`${artifact.run.id}\``,
    `Commit: \`${artifact.run.commit}\``,
    '',
    '## Phase timings',
    '',
    '| Phase | Duration | Network requests |',
    '| --- | ---: | ---: |',
  ];

  for (const phase of artifact.phases) {
    lines.push(
      `| ${phase.name} | ${phase.durationMs} ms | ${
        artifact.summary?.networkRequestsByPhase[phase.name] ?? '—'
      } |`,
    );
  }

  lines.push('', '## Render counts', '');
  const renders = Object.entries(artifact.summary?.renders ?? {});
  if (renders.length === 0) {
    lines.push('No render data captured.');
  } else {
    lines.push('| Component | Renders |', '| --- | ---: |');
    for (const [name, count] of renders) {
      lines.push(`| ${name} | ${count} |`);
    }
  }

  lines.push('', '## Network', '');
  lines.push(
    `Requests: ${artifact.summary?.networkRequests ?? 0} · Failures: ${
      artifact.summary?.failedNetworkRequests ?? 0
    } · Console errors: ${artifact.summary?.consoleErrors ?? 0}`,
  );

  lines.push('', '## Findings', '');
  for (const finding of findings) {
    lines.push(`- **${finding.severity.toUpperCase()}** — ${finding.message}`);
  }

  const slowestRequests = artifact.summary?.slowestNetworkRequests ?? [];
  if (slowestRequests.length > 0) {
    lines.push(
      '',
      '## Slowest network requests',
      '',
      '| Request | Status | Duration |',
      '| --- | ---: | ---: |',
    );
    for (const entry of slowestRequests) {
      lines.push(
        `| ${entry.method} ${entry.host}${entry.path} | ${
          entry.status ?? entry.error ?? '—'
        } | ${entry.durationMs ?? '—'} ms |`,
      );
    }
  }

  if (artifact.failure) {
    lines.push('', '## Failure', '', artifact.failure);
  }

  return `${lines.join('\n')}\n`;
}
