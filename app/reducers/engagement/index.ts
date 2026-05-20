import { createSlice, PayloadAction, Action } from '@reduxjs/toolkit';
import {
  STARTUP_SURFACE_ORDER,
  type StartupSurfaceId,
  type StartupSurfaceStatus,
} from '../../components/UI/Engagement/startupSurfaces/registry';

export interface StartupSurfacesState {
  statuses: Partial<Record<StartupSurfaceId, StartupSurfaceStatus>>;
  completed: StartupSurfaceId[];
  /**
   * The surface currently presenting to the user.
   */
  activeSurfaceId: StartupSurfaceId | null;
}

export interface EngagementState {
  startupSurfaces: StartupSurfacesState;
}

export const initialState: EngagementState = {
  startupSurfaces: {
    statuses: {},
    completed: [],
    activeSurfaceId: null,
  },
};

/**
 * Scans STARTUP_SURFACE_ORDER for the next eligible surface.
 * Rules:
 * - Completed surfaces are always skipped.
 * - A resolving surface blocks all lower-priority surfaces.
 * - The first eligible, non-completed surface wins.
 */
function computeNextActiveSurface(
  statuses: Partial<Record<StartupSurfaceId, StartupSurfaceStatus>>,
  completed: StartupSurfaceId[],
): StartupSurfaceId | null {
  for (const id of STARTUP_SURFACE_ORDER) {
    if (completed.includes(id)) continue;

    const status = statuses[id];
    if (status === 'resolving') return null; // blocks lower-priority
    if (status === 'eligible') return id;
    // 'ineligible' or not yet reported → continue
  }
  return null;
}

interface RehydrateAction extends Action<'persist/REHYDRATE'> {
  payload?: {
    engagement?: EngagementState;
  };
}

const engagementSlice = createSlice({
  name: 'engagement',
  initialState,
  reducers: {
    surfaceStatusReported: (
      state,
      action: PayloadAction<{
        id: StartupSurfaceId;
        status: StartupSurfaceStatus;
      }>,
    ) => {
      state.startupSurfaces.statuses[action.payload.id] = action.payload.status;

      const { activeSurfaceId, completed, statuses } = state.startupSurfaces;

      if (activeSurfaceId !== null) {
        // Only completion advances an active surface.
        return;
      }

      // No active surface yet — see if there's one ready now.
      state.startupSurfaces.activeSurfaceId = computeNextActiveSurface(
        statuses,
        completed,
      );
    },

    surfaceCompleted: (
      state,
      action: PayloadAction<{ id: StartupSurfaceId; reason?: string }>,
    ) => {
      const { id } = action.payload;
      if (!state.startupSurfaces.completed.includes(id)) {
        state.startupSurfaces.completed.push(id);
      }

      // If this was the active surface, advance to the next one.
      if (state.startupSurfaces.activeSurfaceId === id) {
        state.startupSurfaces.activeSurfaceId = computeNextActiveSurface(
          state.startupSurfaces.statuses,
          state.startupSurfaces.completed,
        );
      }
    },
  },
  extraReducers: (builder) => {
    // Engagement state is session-only and resets on cold start.
    builder.addCase('persist/REHYDRATE', (state, action: RehydrateAction) => {
      if (action.payload?.engagement) {
        return {
          ...initialState,
          ...action.payload.engagement,
        };
      }
      return state;
    });
  },
});

export const { surfaceStatusReported, surfaceCompleted } =
  engagementSlice.actions;

export default engagementSlice.reducer;
