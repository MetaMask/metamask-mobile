// Slide-to-center-on-a-time overlay used by Social's "tap a trade row →
// center the chart on that trade" interaction.
//
// Ported from chartLogic.js `handleFocusTime` (~lines 3103-3205),
// including the ease-in-out-quart timing, the "already comfortably
// visible → don't move" inset check, and the generation token that
// cancels an in-flight slide when a newer FOCUS_TIME arrives.
//
// Since chrome / custom-crosshair suppression is gone in Phase 4, there
// is no `suppressChartUserInteraction` counterpart here — analytics
// gating during the animation lived in the deleted line-chrome path.

import { reportErrorToRN } from '../../core/bridge';
import {
  getOhlcvData,
  getSlbMode,
  getVisibleFromMs,
  getVisibleToMs,
  getWidget,
  isChartReady,
} from '../../core/state';
import {
  getApproxBarDurationSec,
  normalizeChartUnixSec,
} from '../../core/timeUtils';
import { registerHandler } from '../../messages/handler';
import type { TVActiveChart } from '../../core/types';
import type { FocusTimePayload } from '../../messages/contract';

const ANIM_MS = 600;
const FALLBACK_BARS = 60;
/** A target inside this fraction of the visible span from either edge is "already visible". */
const VISIBLE_INSET = 0.08;

let animGeneration = 0;

function easeInOutQuart(t: number): number {
  return t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;
}

interface VisibleRangeSec {
  from: number;
  to: number;
}

function readVisibleRangeSec(chart: TVActiveChart): VisibleRangeSec | null {
  if (typeof chart.getVisibleRange !== 'function') return null;
  try {
    const vr = chart.getVisibleRange();
    if (!vr) return null;
    const from = normalizeChartUnixSec(vr.from);
    const to = normalizeChartUnixSec(vr.to);
    if (from === null || to === null || to <= from) return null;
    return { from, to };
  } catch {
    return null;
  }
}

function applyRange(chart: TVActiveChart, from: number, to: number): void {
  try {
    chart.setVisibleRange({ from, to });
  } catch {
    // TV may refuse a range while a resolution switch is mid-flight; drop.
  }
}

export function handleFocusTime(payload: FocusTimePayload): void {
  const widget = getWidget();
  if (!widget || !isChartReady()) return;
  if (!payload || !Number.isFinite(payload.timeMs)) return;

  let chart: TVActiveChart;
  try {
    chart = widget.activeChart();
  } catch (error) {
    reportErrorToRN(error);
    return;
  }
  if (!chart || typeof chart.setVisibleRange !== 'function') return;

  const centerSec = payload.timeMs / 1000;
  const current = readVisibleRangeSec(chart);

  // Already comfortably visible → don't move (caller pulses separately).
  if (current) {
    const inset = (current.to - current.from) * VISIBLE_INSET;
    if (centerSec >= current.from + inset && centerSec <= current.to - inset) {
      return;
    }
  }

  let spanSec: number;
  if (Number.isFinite(payload.spanMs) && (payload.spanMs as number) > 0) {
    spanSec = (payload.spanMs as number) / 1000;
  } else if (getSlbMode()) {
    // SLB: default span covers the entire trade window so the focused
    // trade stays in context with all other trades visible.
    const slbFromMs = getVisibleFromMs();
    const slbToMs = getVisibleToMs();
    if (slbFromMs != null && slbToMs != null) {
      spanSec = (slbToMs - slbFromMs) / 1000;
    } else if (current) {
      spanSec = current.to - current.from;
    } else {
      spanSec = getApproxBarDurationSec(getOhlcvData()) * FALLBACK_BARS;
    }
  } else if (current) {
    spanSec = current.to - current.from;
  } else {
    spanSec = getApproxBarDurationSec(getOhlcvData()) * FALLBACK_BARS;
  }

  const targetFrom = centerSec - spanSec / 2;
  const targetTo = centerSec + spanSec / 2;

  animGeneration += 1;
  const gen = animGeneration;

  // Jump when animation is disabled or we have no start range to lerp from.
  if (payload.animate === false || !current) {
    applyRange(chart, targetFrom, targetTo);
    return;
  }

  const startFrom = current.from;
  const startTo = current.to;
  const startTs = Date.now();

  const step = (): void => {
    if (gen !== animGeneration) return;
    if (!getWidget() || !isChartReady()) return;
    const elapsed = Date.now() - startTs;
    const progress = elapsed >= ANIM_MS ? 1 : elapsed / ANIM_MS;
    const eased = easeInOutQuart(progress);
    applyRange(
      chart,
      startFrom + (targetFrom - startFrom) * eased,
      startTo + (targetTo - startTo) * eased,
    );
    if (progress < 1) {
      try {
        requestAnimationFrame(step);
      } catch {
        setTimeout(step, 16);
      }
    }
  };

  try {
    requestAnimationFrame(step);
  } catch {
    applyRange(chart, targetFrom, targetTo);
  }
}

export function registerFocusTimeOverlay(): void {
  registerHandler('FOCUS_TIME', (payload) => {
    handleFocusTime(payload);
  });
}

/** Test-only: reset the animation generation counter. */
export function __resetFocusTimeForTests(): void {
  animGeneration = 0;
}
