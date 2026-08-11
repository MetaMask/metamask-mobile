/* eslint-disable import-x/no-nodejs-modules */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { dirname, resolve } from 'node:path';

const INSTRUMENTATION_MARKER = 'SWAPS_PERF_ANALYSIS';
const DIAGNOSTICS_RELATIVE_PATH =
  'app/components/UI/Bridge/utils/swapsPerformanceDiagnostics.ts';

interface SourceReplacement {
  label: string;
  before: string;
  after: string;
}

interface InstrumentationTarget {
  relativePath: string;
  replacements: SourceReplacement[];
}

export type InstrumentationStatus = 'clean' | 'prepared' | 'partial';

export interface InstrumentationResult {
  status: InstrumentationStatus;
  changedFiles: string[];
}

const DIAGNOSTICS_SOURCE = `export const SWAPS_PERFORMANCE_DIAGNOSTICS_KEY =
  '__SWAPS_PERF_ANALYSIS__' as const;

export type SwapsPerformanceRenderTarget =
  | 'BridgeView'
  | 'BridgeViewContent'
  | 'QuoteDetailsCard'
  | 'SwapsConfirmButton'
  | 'TokenInputArea';

interface SwapsPerformanceRenderEntry {
  count: number;
  timestamps: number[];
}

interface SwapsPerformanceDiagnosticsRuntime {
  enabled: boolean;
  renders: Partial<
    Record<SwapsPerformanceRenderTarget, SwapsPerformanceRenderEntry>
  >;
}

declare global {
  // eslint-disable-next-line no-var
  var __SWAPS_PERF_ANALYSIS__: SwapsPerformanceDiagnosticsRuntime | undefined;
}

const MAX_RENDER_TIMESTAMPS = 200;

/**
 * Records an opt-in render event for the temporary Swaps analysis runtime.
 *
 * @param target - Stable component label used in the generated artifact.
 */
export function recordSwapsPerformanceRender(
  target: SwapsPerformanceRenderTarget,
): void {
  if (!__DEV__) {
    return;
  }

  const diagnostics = globalThis[SWAPS_PERFORMANCE_DIAGNOSTICS_KEY];
  if (!diagnostics?.enabled) {
    return;
  }

  const entry = diagnostics.renders[target] ?? {
    count: 0,
    timestamps: [],
  };

  entry.count += 1;
  if (entry.timestamps.length < MAX_RENDER_TIMESTAMPS) {
    entry.timestamps.push(Date.now());
  }

  diagnostics.renders[target] = entry;
}
`;

const TARGETS: InstrumentationTarget[] = [
  {
    relativePath: 'app/components/UI/Bridge/Views/BridgeView/index.tsx',
    replacements: [
      {
        label: 'BridgeView diagnostics import',
        before: `} from '../../utils/postTradeNotifications';\n`,
        after: `} from '../../utils/postTradeNotifications';\nimport { recordSwapsPerformanceRender } from '../../utils/swapsPerformanceDiagnostics'; // ${INSTRUMENTATION_MARKER}\n`,
      },
      {
        label: 'BridgeViewContent render probe',
        before:
          'const BridgeViewContent = ({ latestSourceBalance }: BridgeViewContentProps) => {\n',
        after: `const BridgeViewContent = ({ latestSourceBalance }: BridgeViewContentProps) => {\n  // ${INSTRUMENTATION_MARKER}:start BridgeViewContent\n  recordSwapsPerformanceRender('BridgeViewContent');\n  // ${INSTRUMENTATION_MARKER}:end BridgeViewContent\n`,
      },
      {
        label: 'BridgeView render probe',
        before: 'const BridgeView = () => {\n',
        after: `const BridgeView = () => {\n  // ${INSTRUMENTATION_MARKER}:start BridgeView\n  recordSwapsPerformanceRender('BridgeView');\n  // ${INSTRUMENTATION_MARKER}:end BridgeView\n`,
      },
    ],
  },
  {
    relativePath:
      'app/components/UI/Bridge/components/QuoteDetailsCard/QuoteDetailsCard.tsx',
    replacements: [
      {
        label: 'QuoteDetailsCard diagnostics import',
        before: `import AppConstants from '../../../../../core/AppConstants';\n`,
        after: `import AppConstants from '../../../../../core/AppConstants';\nimport { recordSwapsPerformanceRender } from '../../utils/swapsPerformanceDiagnostics'; // ${INSTRUMENTATION_MARKER}\n`,
      },
      {
        label: 'QuoteDetailsCard render probe',
        before: `}) => {\n  const bridgeFeatureFlags = useSelector(selectBridgeFeatureFlags);\n`,
        after: `}) => {\n  // ${INSTRUMENTATION_MARKER}:start QuoteDetailsCard\n  recordSwapsPerformanceRender('QuoteDetailsCard');\n  // ${INSTRUMENTATION_MARKER}:end QuoteDetailsCard\n  const bridgeFeatureFlags = useSelector(selectBridgeFeatureFlags);\n`,
      },
    ],
  },
  {
    relativePath:
      'app/components/UI/Bridge/components/SwapsConfirmButton/index.tsx',
    replacements: [
      {
        label: 'SwapsConfirmButton diagnostics import',
        before: `import { AppThemeKey } from '../../../../../util/theme/models';\n`,
        after: `import { AppThemeKey } from '../../../../../util/theme/models';\nimport { recordSwapsPerformanceRender } from '../../utils/swapsPerformanceDiagnostics'; // ${INSTRUMENTATION_MARKER}\n`,
      },
      {
        label: 'SwapsConfirmButton render probe',
        before: `}: Props) => {\n  const { variant: ctaButtonColorVariant } = useABTest(\n`,
        after: `}: Props) => {\n  // ${INSTRUMENTATION_MARKER}:start SwapsConfirmButton\n  recordSwapsPerformanceRender('SwapsConfirmButton');\n  // ${INSTRUMENTATION_MARKER}:end SwapsConfirmButton\n  const { variant: ctaButtonColorVariant } = useABTest(\n`,
      },
    ],
  },
  {
    relativePath:
      'app/components/UI/Bridge/components/TokenInputArea/index.tsx',
    replacements: [
      {
        label: 'TokenInputArea diagnostics import',
        before: `import Engine from '../../../../../core/Engine';\n`,
        after: `import Engine from '../../../../../core/Engine';\nimport { recordSwapsPerformanceRender } from '../../utils/swapsPerformanceDiagnostics'; // ${INSTRUMENTATION_MARKER}\n`,
      },
      {
        label: 'TokenInputArea render probe',
        before: `  ) => {\n    const currentCurrency = useSelector(selectCurrentCurrency);\n`,
        after: `  ) => {\n    // ${INSTRUMENTATION_MARKER}:start TokenInputArea\n    recordSwapsPerformanceRender('TokenInputArea');\n    // ${INSTRUMENTATION_MARKER}:end TokenInputArea\n    const currentCurrency = useSelector(selectCurrentCurrency);\n`,
      },
    ],
  },
];

/**
 * Returns the write order used while preparing instrumentation.
 *
 * The generated helper must exist before Metro observes any source file that
 * imports it. Otherwise Metro can attempt a bundle during the brief interval
 * between those writes and cache a missing-module error.
 */
export function getPrepareWriteOrder(): string[] {
  return [
    DIAGNOSTICS_RELATIVE_PATH,
    ...TARGETS.map((target) => target.relativePath),
  ];
}

function countOccurrences(source: string, search: string): number {
  let count = 0;
  let offset = 0;

  while (offset < source.length) {
    const index = source.indexOf(search, offset);
    if (index === -1) {
      break;
    }
    count += 1;
    offset = index + search.length;
  }

  return count;
}

/**
 * Applies exact, single-occurrence source replacements.
 *
 * @param source - Original source text.
 * @param replacements - Ordered source replacements.
 * @param direction - Whether to add or remove instrumentation.
 * @returns Updated source text.
 */
export function applyExactReplacements(
  source: string,
  replacements: SourceReplacement[],
  direction: 'prepare' | 'cleanup',
): string {
  return replacements.reduce((currentSource, replacement) => {
    const search =
      direction === 'prepare' ? replacement.before : replacement.after;
    const replacementText =
      direction === 'prepare' ? replacement.after : replacement.before;
    const occurrences = countOccurrences(currentSource, search);

    if (occurrences !== 1) {
      throw new Error(
        `${replacement.label} expected exactly one source anchor; found ${occurrences}`,
      );
    }

    return currentSource.replace(search, replacementText);
  }, source);
}

function readTargetSources(
  repoRoot: string,
): Map<InstrumentationTarget, string> {
  return new Map(
    TARGETS.map((target) => [
      target,
      readFileSync(resolve(repoRoot, target.relativePath), 'utf8'),
    ]),
  );
}

/**
 * Returns whether the repository instrumentation is clean, prepared, or
 * partially modified.
 *
 * @param repoRoot - Absolute or relative MetaMask Mobile repository root.
 */
export function getInstrumentationStatus(
  repoRoot: string,
): InstrumentationStatus {
  const sources = readTargetSources(repoRoot);
  const diagnosticsPath = resolve(repoRoot, DIAGNOSTICS_RELATIVE_PATH);
  const markerCount = [...sources.values()].filter((source) =>
    source.includes(INSTRUMENTATION_MARKER),
  ).length;
  const diagnosticsExists = existsSync(diagnosticsPath);

  if (markerCount === 0 && !diagnosticsExists) {
    return 'clean';
  }

  const targetsPrepared = [...sources.entries()].every(([target, source]) =>
    target.replacements.every(
      (replacement) => countOccurrences(source, replacement.after) === 1,
    ),
  );
  const diagnosticsPrepared =
    diagnosticsExists &&
    readFileSync(diagnosticsPath, 'utf8') === DIAGNOSTICS_SOURCE;

  return targetsPrepared && diagnosticsPrepared ? 'prepared' : 'partial';
}

/**
 * Inserts temporary, opt-in Swaps render probes into development source.
 *
 * @param repoRoot - Absolute or relative MetaMask Mobile repository root.
 */
export function prepareInstrumentation(
  repoRoot: string,
): InstrumentationResult {
  const status = getInstrumentationStatus(repoRoot);
  if (status === 'prepared') {
    return { status, changedFiles: [] };
  }
  if (status === 'partial') {
    throw new Error(
      `Found partial ${INSTRUMENTATION_MARKER} instrumentation; clean it manually before preparing`,
    );
  }

  const sources = readTargetSources(repoRoot);
  const updatedSources = new Map(
    [...sources.entries()].map(([target, source]) => [
      target,
      applyExactReplacements(source, target.replacements, 'prepare'),
    ]),
  );
  const diagnosticsPath = resolve(repoRoot, DIAGNOSTICS_RELATIVE_PATH);
  const preparedSources = new Map<string, string>([
    [DIAGNOSTICS_RELATIVE_PATH, DIAGNOSTICS_SOURCE],
    ...[...updatedSources.entries()].map(
      ([target, source]): [string, string] => [target.relativePath, source],
    ),
  ]);

  try {
    for (const relativePath of getPrepareWriteOrder()) {
      const source = preparedSources.get(relativePath);
      if (source === undefined) {
        throw new Error(`Missing prepared source for ${relativePath}`);
      }
      const absolutePath = resolve(repoRoot, relativePath);
      mkdirSync(dirname(absolutePath), { recursive: true });
      writeFileSync(absolutePath, source);
    }
  } catch (error) {
    for (const [target, source] of sources) {
      writeFileSync(resolve(repoRoot, target.relativePath), source);
    }
    if (
      existsSync(diagnosticsPath) &&
      readFileSync(diagnosticsPath, 'utf8') === DIAGNOSTICS_SOURCE
    ) {
      rmSync(diagnosticsPath);
    }
    throw error;
  }

  return {
    status: 'prepared',
    changedFiles: [
      ...TARGETS.map((target) => target.relativePath),
      DIAGNOSTICS_RELATIVE_PATH,
    ],
  };
}

/**
 * Removes only the exact temporary Swaps render probes inserted by prepare.
 *
 * @param repoRoot - Absolute or relative MetaMask Mobile repository root.
 */
export function cleanupInstrumentation(
  repoRoot: string,
): InstrumentationResult {
  const status = getInstrumentationStatus(repoRoot);
  if (status === 'clean') {
    return { status, changedFiles: [] };
  }
  if (status === 'partial') {
    throw new Error(
      `Found partial ${INSTRUMENTATION_MARKER} instrumentation; refusing to overwrite source edits`,
    );
  }

  const sources = readTargetSources(repoRoot);
  const updatedSources = new Map(
    [...sources.entries()].map(([target, source]) => [
      target,
      applyExactReplacements(source, target.replacements, 'cleanup'),
    ]),
  );
  const diagnosticsPath = resolve(repoRoot, DIAGNOSTICS_RELATIVE_PATH);

  try {
    for (const [target, source] of updatedSources) {
      writeFileSync(resolve(repoRoot, target.relativePath), source);
    }
    rmSync(diagnosticsPath);
  } catch (error) {
    for (const [target, source] of sources) {
      writeFileSync(resolve(repoRoot, target.relativePath), source);
    }
    if (!existsSync(diagnosticsPath)) {
      writeFileSync(diagnosticsPath, DIAGNOSTICS_SOURCE);
    }
    throw error;
  }

  return {
    status: 'clean',
    changedFiles: [
      ...TARGETS.map((target) => target.relativePath),
      DIAGNOSTICS_RELATIVE_PATH,
    ],
  };
}

/**
 * Returns the generated diagnostics helper for focused contract tests.
 */
export function getDiagnosticsSource(): string {
  return DIAGNOSTICS_SOURCE;
}
