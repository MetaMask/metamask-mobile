export const SWAPS_PERFORMANCE_DIAGNOSTICS_KEY =
  '__SWAPS_PERF_ANALYSIS__' as const;

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

/** Returns the generated, dev-only render probe helper source. */
export function getRenderProbeSource(): string {
  return DIAGNOSTICS_SOURCE;
}
