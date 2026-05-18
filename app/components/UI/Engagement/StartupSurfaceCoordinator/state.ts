/**
 * Startup surfaces are registered separately in StartupSurfaces.tsx so each
 * surface hook can own its own eligibility logic and presentation.
 *
 * When adding a new id here, also add its descriptor hook to StartupSurfaces.tsx
 * in the intended priority order and update coordinator tests for that order.
 */
export type StartupSurfaceId = 'push-pre-prompt' | 'perps-gtm' | 'predict-gtm';

/**
 * Lifecycle state reported by each startup surface.
 *
 * `resolving` intentionally blocks lower-priority surfaces while async
 * eligibility checks finish, which prevents multiple startup prompts from
 * competing with each other.
 */
export type StartupSurfaceStatus = 'resolving' | 'eligible' | 'ineligible';

export interface StartupSurfaceCandidate {
  id: StartupSurfaceId;
  status: StartupSurfaceStatus;
}

export interface StartupSurfaceState {
  activeSurfaceId: StartupSurfaceId | null;
  completedSurfaceIds: StartupSurfaceId[];
  surfaceOrder: StartupSurfaceId[];
  surfaces: Partial<Record<StartupSurfaceId, StartupSurfaceStatus>>;
}

export type StartupSurfaceAction =
  | {
      type: 'updateSurfaces';
      surfaces: StartupSurfaceCandidate[];
    }
  | {
      type: 'complete';
      surfaceId: StartupSurfaceId;
    };

export const getDefaultStartupSurfaceState = (): StartupSurfaceState => ({
  activeSurfaceId: null,
  completedSurfaceIds: [],
  surfaceOrder: [],
  surfaces: {},
});

/**
 * Returns true when the current active surface should remain mounted without
 * re-running priority selection. All four conditions must hold:
 * - a surface is actually active
 * - it has not yet completed
 * - it is still present in the current surface order
 * - its status is still 'eligible' (not resolving or ineligible)
 */
const isActiveSurfaceRetainable = (
  state: StartupSurfaceState,
): state is StartupSurfaceState & { activeSurfaceId: StartupSurfaceId } =>
  state.activeSurfaceId !== null &&
  !state.completedSurfaceIds.includes(state.activeSurfaceId) &&
  state.surfaceOrder.includes(state.activeSurfaceId) &&
  state.surfaces[state.activeSurfaceId] === 'eligible';

/**
 * Returns the single surface that should be active next.
 *
 * The active eligible surface wins until it completes. Otherwise, the ordered
 * list is scanned from highest to lowest priority; a resolving surface stops
 * the scan so lower-priority prompts do not jump ahead.
 */
export const getNextStartupSurface = (
  state: StartupSurfaceState,
): StartupSurfaceId | null => {
  const { completedSurfaceIds, surfaceOrder, surfaces } = state;

  // Re-affirm the current surface without re-running priority selection.
  // This keeps it mounted until it explicitly completes, preventing it from
  // being displaced if a higher-priority surface becomes eligible mid-display.
  if (isActiveSurfaceRetainable(state)) {
    return state.activeSurfaceId;
  }

  for (const surfaceId of surfaceOrder) {
    // Already shown — do not revisit.
    if (completedSurfaceIds.includes(surfaceId)) {
      continue;
    }

    const status = surfaces[surfaceId];

    // A resolving surface is still running its async eligibility check.
    // Returning null here halts the entire scan: lower-priority surfaces
    // must not jump ahead while a higher-priority one is still deciding.
    if (status === 'resolving') {
      return null;
    }

    if (status === 'eligible') {
      return surfaceId;
    }

    // 'ineligible' (or not yet registered): skip and continue to the next
    // surface in priority order.
  }

  // All surfaces are either ineligible or completed — nothing to show.
  return null;
};

export const startupSurfaceReducer = (
  state: StartupSurfaceState,
  action: StartupSurfaceAction,
): StartupSurfaceState => {
  switch (action.type) {
    case 'updateSurfaces': {
      const surfaceOrder = action.surfaces.map(({ id }) => id);
      const surfaces = action.surfaces.reduce<
        Partial<Record<StartupSurfaceId, StartupSurfaceStatus>>
      >((result, surface) => {
        result[surface.id] = surface.status;
        return result;
      }, {});

      // Bail out early if nothing changed. Returning the same state reference
      // prevents unnecessary downstream re-renders. Order is checked
      // first (length + position) because a changed order also invalidates the
      // status comparison.
      const hasSameSurfaceOrder =
        surfaceOrder.length === state.surfaceOrder.length &&
        surfaceOrder.every(
          (surfaceId, index) => state.surfaceOrder[index] === surfaceId,
        );
      // Status comparison only iterates the new payload's surfaces; dropped
      // surfaces are already caught by the order check above.
      const hasSameSurfaceStatuses = surfaceOrder.every(
        (surfaceId) => state.surfaces[surfaceId] === surfaces[surfaceId],
      );

      if (hasSameSurfaceOrder && hasSameSurfaceStatuses) {
        return state;
      }

      const nextState = { ...state, surfaceOrder, surfaces };

      return {
        ...nextState,
        activeSurfaceId: getNextStartupSurface(nextState),
      };
    }
    case 'complete': {
      const completedSurfaceIds = state.completedSurfaceIds.includes(
        action.surfaceId,
      )
        ? state.completedSurfaceIds
        : [...state.completedSurfaceIds, action.surfaceId];

      // completedSurfaceIds now includes the just-completed surface, so
      // isActiveSurfaceRetainable (inside getNextStartupSurface) will return
      // false for it and trigger a fresh priority scan.
      const nextState = { ...state, completedSurfaceIds };

      return {
        ...nextState,
        activeSurfaceId: getNextStartupSurface(nextState),
      };
    }
    default:
      return state;
  }
};
