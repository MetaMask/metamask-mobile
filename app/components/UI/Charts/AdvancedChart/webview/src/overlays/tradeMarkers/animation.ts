// Pulse animation for a specific trade marker.
//
// Ported from chartLogic.js `handlePulseTradeMarker` (~lines 2915-3001).
// Decaying |sin| envelope over ~1.1s, two humps that shrink back to the
// base size. A generation token cancels an in-flight pulse when a newer
// pulse (or a full marker rebuild) starts, so we never leave a shape
// stuck at the peak size.

import { reportErrorToRN } from '../../core/bridge';
import { getWidget, isChartReady } from '../../core/state';
import { registerHandler } from '../../messages/handler';
import type { TVActiveChart, TVShape } from '../../core/types';
import type { PulseTradeMarkerMessage } from '../../messages/contract';
import {
  bumpPulseGeneration,
  getPulseGeneration,
  getShapesByMarkerId,
} from './state';
import { TRADE_MARKER_RING_SIZE, TRADE_MARKER_SIZE } from './index';

/** Pulse duration (ms). */
const PULSE_MS = 1100;
/** Peak (colored-circle) size at the crest of a pulse. */
const PULSE_PEAK = 22;
/** Number of grow/shrink humps over the animation. */
const PULSE_CYCLES = 2;

function getShape(chart: TVActiveChart, id: string | null): TVShape | null {
  if (id == null || typeof chart.getShapeById !== 'function') return null;
  try {
    return chart.getShapeById(id);
  } catch {
    return null;
  }
}

function setSize(shape: TVShape | null, size: number): void {
  if (!shape) return;
  try {
    shape.setProperties({ size: Math.round(size) });
  } catch {
    // TV shape may have been destroyed between frames — swallow.
  }
}

export function handlePulseTradeMarker(
  payload: PulseTradeMarkerMessage['payload'],
): void {
  const widget = getWidget();
  if (!widget || !isChartReady()) return;
  if (payload?.id == null) return;

  const markerId = String(payload.id);
  const record = getShapesByMarkerId().get(markerId);
  if (!record) return;
  const { fill: fillId, ring: ringId } = record;
  if (fillId == null && ringId == null) return;

  let chart: TVActiveChart;
  try {
    chart = widget.activeChart();
  } catch (error) {
    reportErrorToRN(error);
    return;
  }
  const fillShape = getShape(chart, fillId);
  const ringShape = getShape(chart, ringId);
  if (!fillShape && !ringShape) return;

  const gen = bumpPulseGeneration();
  const startTs = Date.now();
  // Ring grows proportionally so the rim stays even.
  const ringRatio = TRADE_MARKER_RING_SIZE / TRADE_MARKER_SIZE;

  const applySize = (fillSize: number): void => {
    setSize(fillShape, fillSize);
    setSize(ringShape, fillSize * ringRatio);
  };

  const step = (): void => {
    if (gen !== getPulseGeneration()) return;
    if (!getWidget() || !isChartReady()) return;
    // Abort if the markers were rebuilt — record ids now point elsewhere.
    const current = getShapesByMarkerId().get(markerId);
    if (current?.fill !== fillId || current?.ring !== ringId) return;

    const t = (Date.now() - startTs) / PULSE_MS;
    if (t >= 1) {
      applySize(TRADE_MARKER_SIZE);
      return;
    }
    const envelope = Math.abs(Math.sin(Math.PI * PULSE_CYCLES * t)) * (1 - t);
    applySize(TRADE_MARKER_SIZE + (PULSE_PEAK - TRADE_MARKER_SIZE) * envelope);
    try {
      requestAnimationFrame(step);
    } catch {
      setTimeout(step, 16);
    }
  };

  try {
    requestAnimationFrame(step);
  } catch {
    applySize(TRADE_MARKER_SIZE);
  }
}

/** Registers the PULSE_TRADE_MARKER message handler. Called from bootstrap. */
export function registerTradeMarkerPulseHandler(): void {
  registerHandler('PULSE_TRADE_MARKER', (payload) => {
    handlePulseTradeMarker(payload);
  });
}
