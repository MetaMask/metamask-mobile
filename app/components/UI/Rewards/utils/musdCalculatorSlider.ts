/**
 * Pure helpers for the Rewards mUSD calculator slider (amount ↔ track percent,
 * snapping, and clamping). Ported from the standalone mUSD calculator prototype.
 */

import { MUSD_CONVERSION_APY } from '../../Earn/constants/musd';

export const MIN_AMOUNT = 100;
export const MAX_AMOUNT = 10000;
/**
 * Annual yield as a decimal fraction for earnings math (e.g. 0.03 for 3%).
 * Derived from {@link MUSD_CONVERSION_APY} so Earn conversion and Rewards stay aligned.
 */
export const MUSD_CALCULATOR_APY = MUSD_CONVERSION_APY / 100;

export const SNAP_POINTS = [100, 1000, 10000] as const;
export const SNAP_THRESHOLD_PCT = 2;

/**
 * Maps a dollar amount to a 0–100 slider position. The mapping is piecewise-linear
 * with extra resolution between $100 and $1,000 (first half of the track).
 */
export function amountToPercent(amount: number): number {
  if (amount <= MIN_AMOUNT) {
    return 0;
  }
  if (amount >= MAX_AMOUNT) {
    return 100;
  }
  if (amount <= 1000) {
    return ((amount - 100) / (1000 - 100)) * 50;
  }
  return 50 + ((amount - 1000) / (MAX_AMOUNT - 1000)) * 50;
}

/**
 * Converts a 0–100 track position to a dollar amount, including rounding and snap
 * points at {@link SNAP_POINTS}.
 */
export function percentToAmount(pct: number): number {
  let raw: number;
  if (pct <= 50) {
    raw = 100 + (pct / 50) * (1000 - 100);
  } else {
    raw = 1000 + ((pct - 50) / 50) * (MAX_AMOUNT - 1000);
  }

  if (raw <= 500) {
    raw = Math.round(raw / 10) * 10;
  } else if (raw <= 2000) {
    raw = Math.round(raw / 50) * 50;
  } else {
    raw = Math.round(raw / 100) * 100;
  }

  for (const snap of SNAP_POINTS) {
    const snapPct = amountToPercent(snap);
    if (Math.abs(pct - snapPct) < SNAP_THRESHOLD_PCT) {
      return snap;
    }
  }

  return raw;
}

export function clampAmount(value: number): number {
  return Math.max(MIN_AMOUNT, Math.min(MAX_AMOUNT, value));
}
