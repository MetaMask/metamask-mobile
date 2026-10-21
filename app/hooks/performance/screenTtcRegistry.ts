import type { DeferredRenderProbeId } from './deferredRenderPerformanceIds';
import type { OnboardingScreenId } from './onboardingPerformanceIds';
import { isE2EOrPerformanceTest } from '../../util/test/utils';

export type ScreenTtcId = OnboardingScreenId | DeferredRenderProbeId;

export type ScreenTtcContentState = 'empty' | 'filled' | 'error';

export interface ScreenTtcRecord {
  screenId: ScreenTtcId;
  durationMs: number;
  contentState: ScreenTtcContentState;
  /** Bumps on every successful record so Appium can wait for a fresh value. */
  generation: number;
}

const records = new Map<ScreenTtcId, ScreenTtcRecord>();
const listeners = new Set<() => void>();

let generationCounter = 0;
/** Test-only override for `isE2EOrPerformanceTest` (undefined = use real flag). */
let probeEnabledOverride: boolean | undefined;

export function isScreenTtcProbeEnabled(): boolean {
  if (probeEnabledOverride !== undefined) {
    return probeEnabledOverride;
  }
  return isE2EOrPerformanceTest;
}

export function screenTtcTestId(screenId: ScreenTtcId): string {
  return `perf-ttc-${screenId}`;
}

/**
 * Accessibility label format Appium parses:
 * `ttc:<screen_id>:<durationMs>:<generation>`
 * A non-filled outcome appends `:<empty|error>` so a rep can be excluded.
 */
export function formatScreenTtcAccessibilityLabel(
  record: ScreenTtcRecord,
): string {
  const base = `ttc:${record.screenId}:${Math.round(record.durationMs)}:${record.generation}`;
  return record.contentState === 'filled'
    ? base
    : `${base}:${record.contentState}`;
}

export function parseScreenTtcAccessibilityLabel(
  label: string,
): ScreenTtcRecord | null {
  const match =
    /^ttc:([a-z0-9_]+):(\d+(?:\.\d+)?):(\d+)(?::(empty|error|filled))?$/.exec(
      label.trim(),
    );
  if (!match) {
    return null;
  }
  return {
    screenId: match[1] as ScreenTtcId,
    durationMs: Number(match[2]),
    contentState: (match[4] as ScreenTtcContentState | undefined) ?? 'filled',
    generation: Number(match[3]),
  };
}

export function recordScreenTtc(
  screenId: ScreenTtcId,
  durationMs: number,
  contentState: ScreenTtcContentState,
): void {
  if (!isScreenTtcProbeEnabled()) {
    return;
  }

  generationCounter += 1;
  records.set(screenId, {
    screenId,
    durationMs: Math.max(0, durationMs),
    contentState,
    generation: generationCounter,
  });
  listeners.forEach((listener) => listener());
}

export function getScreenTtc(
  screenId: ScreenTtcId,
): ScreenTtcRecord | undefined {
  return records.get(screenId);
}

export function getAllScreenTtc(): ScreenTtcRecord[] {
  return Array.from(records.values());
}

export function subscribeScreenTtc(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Test-only reset. */
export function _resetScreenTtcRegistryForTesting(): void {
  records.clear();
  listeners.clear();
  generationCounter = 0;
  probeEnabledOverride = undefined;
}

/** Test-only probe enable override (`undefined` restores production flag). */
export function _setScreenTtcProbeEnabledForTesting(
  enabled: boolean | undefined,
): void {
  probeEnabledOverride = enabled;
}
