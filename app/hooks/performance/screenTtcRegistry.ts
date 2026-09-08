import type { OnboardingScreenId } from './onboardingPerformanceIds';
import { isE2EOrPerformanceTest } from '../../util/test/utils';

export interface ScreenTtcRecord {
  screenId: OnboardingScreenId;
  durationMs: number;
  contentState: 'empty' | 'filled';
  /** Bumps on every successful record so Appium can wait for a fresh value. */
  generation: number;
}

const records = new Map<OnboardingScreenId, ScreenTtcRecord>();
const listeners = new Set<() => void>();

let generationCounter = 0;

export function isScreenTtcProbeEnabled(): boolean {
  return isE2EOrPerformanceTest;
}

export function screenTtcTestId(screenId: OnboardingScreenId): string {
  return `perf-ttc-${screenId}`;
}

/**
 * Accessibility label format Appium parses:
 * `ttc:<screen_id>:<durationMs>:<generation>`
 */
export function formatScreenTtcAccessibilityLabel(
  record: ScreenTtcRecord,
): string {
  return `ttc:${record.screenId}:${Math.round(record.durationMs)}:${record.generation}`;
}

export function parseScreenTtcAccessibilityLabel(
  label: string,
): ScreenTtcRecord | null {
  const match = /^ttc:([a-z0-9_]+):(\d+(?:\.\d+)?):(\d+)$/.exec(label.trim());
  if (!match) {
    return null;
  }
  return {
    screenId: match[1] as OnboardingScreenId,
    durationMs: Number(match[2]),
    contentState: 'filled',
    generation: Number(match[3]),
  };
}

export function recordScreenTtc(
  screenId: OnboardingScreenId,
  durationMs: number,
  contentState: 'empty' | 'filled',
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
  screenId: OnboardingScreenId,
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
}
