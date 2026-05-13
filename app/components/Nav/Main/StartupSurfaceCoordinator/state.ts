export type StartupSurfaceId = 'push-pre-prompt' | 'perps-gtm' | 'predict-gtm';

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

export const getNextStartupSurface = ({
  activeSurfaceId,
  completedSurfaceIds,
  surfaceOrder,
  surfaces,
}: StartupSurfaceState): StartupSurfaceId | null => {
  if (activeSurfaceId && !completedSurfaceIds.includes(activeSurfaceId)) {
    return activeSurfaceId;
  }

  for (const surfaceId of surfaceOrder) {
    if (completedSurfaceIds.includes(surfaceId)) {
      continue;
    }

    const status = surfaces[surfaceId];

    if (status === 'resolving') {
      return null;
    }

    if (status === 'eligible') {
      return surfaceId;
    }
  }

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

      const hasSameSurfaceOrder =
        surfaceOrder.length === state.surfaceOrder.length &&
        surfaceOrder.every(
          (surfaceId, index) => state.surfaceOrder[index] === surfaceId,
        );
      const hasSameSurfaceStatuses = surfaceOrder.every(
        (surfaceId) => state.surfaces[surfaceId] === surfaces[surfaceId],
      );

      if (hasSameSurfaceOrder && hasSameSurfaceStatuses) {
        return state;
      }

      const activeStatus = state.activeSurfaceId
        ? surfaces[state.activeSurfaceId]
        : null;
      const activeSurfaceId =
        state.activeSurfaceId &&
        surfaceOrder.includes(state.activeSurfaceId) &&
        activeStatus === 'eligible'
          ? state.activeSurfaceId
          : null;

      const nextState = {
        ...state,
        activeSurfaceId,
        surfaceOrder,
        surfaces,
      };

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

      const nextState = {
        ...state,
        activeSurfaceId:
          state.activeSurfaceId === action.surfaceId
            ? null
            : state.activeSurfaceId,
        completedSurfaceIds,
      };

      return {
        ...nextState,
        activeSurfaceId: getNextStartupSurface(nextState),
      };
    }
    default:
      return state;
  }
};
