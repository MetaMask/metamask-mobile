import type { HardwareTier } from '../../util/deviceCapability/types';
import type { ActivityPhase, ActivityPhaseInput } from './types';

export const ACTIVITY_PHASE_EXIT_HYSTERESIS_DP = 32;

export function activityMarginForHardwareTier(
  tier: HardwareTier | null,
  viewportHeight: number,
): number {
  if (tier === 'LOW') {
    return 0;
  }
  if (tier === 'HIGH') {
    return viewportHeight;
  }
  return viewportHeight / 2;
}

function intersects(
  slotTop: number,
  slotBottom: number,
  regionTop: number,
  regionBottom: number,
): boolean {
  return slotBottom > regionTop && slotTop < regionBottom;
}

function rawPhase(
  slotTop: number,
  slotBottom: number,
  viewportTop: number,
  viewportBottom: number,
  marginTop: number,
  marginBottom: number,
): ActivityPhase {
  if (intersects(slotTop, slotBottom, viewportTop, viewportBottom)) {
    return 'active';
  }
  if (intersects(slotTop, slotBottom, marginTop, marginBottom)) {
    return 'paused';
  }
  return 'dormant';
}

/**
 * Resolves one slot phase from content coordinates.
 * Exit hysteresis applies only when leaving the current phase.
 * A null current phase uses the raw boundaries.
 */
export function resolveActivityPhase(input: ActivityPhaseInput): ActivityPhase {
  const { scrollY, viewportHeight, slotTop, slotHeight, margin, currentPhase } =
    input;
  const slotBottom = slotTop + slotHeight;
  const viewportTop = scrollY;
  const viewportBottom = scrollY + viewportHeight;
  const marginTop = viewportTop - margin;
  const marginBottom = viewportBottom + margin;
  const next = rawPhase(
    slotTop,
    slotBottom,
    viewportTop,
    viewportBottom,
    marginTop,
    marginBottom,
  );

  if (currentPhase === null || next === currentPhase) {
    return next;
  }

  const hysteresis = ACTIVITY_PHASE_EXIT_HYSTERESIS_DP;

  if (currentPhase === 'active') {
    const stillActive = intersects(
      slotTop,
      slotBottom,
      viewportTop - hysteresis,
      viewportBottom + hysteresis,
    );
    if (stillActive) {
      return 'active';
    }
    return next;
  }

  if (currentPhase === 'paused') {
    if (next === 'active') {
      return 'active';
    }
    const stillPaused = intersects(
      slotTop,
      slotBottom,
      marginTop - hysteresis,
      marginBottom + hysteresis,
    );
    if (stillPaused) {
      return 'paused';
    }
    return 'dormant';
  }

  return next;
}
