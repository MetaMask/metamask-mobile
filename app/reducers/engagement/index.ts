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
   * The surface that is currently presenting to the user.
   *
   * Absolute sticky: once a surface is active it stays active until
   * surfaceCompleted is dispatched for it. Status updates from resolvers
   * cannot displace it. This prevents lower-priority surfaces from jumping in
   * while the active surface is mid-flow (OS permission prompt, etc.).
   */
  activeSurfaceId: StartupSurfaceId | null;
}

export interface EngagementState {
  startupSurfaces: StartupSurfacesState;
}

const initialState: EngagementState = {
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
        // Absolute sticky: once a surface is presenting it cannot be displaced
        // by a status update. Only surfaceCompleted can advance the queue.
        // This prevents lower-priority surfaces from jumping in while the active
        // surface is mid-flow (e.g. OS permission prompt, marketing consent
        // sheet) even if the eligibility hook transiently re-evaluates.
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
    // The engagement slice is blacklisted from persistence so completed/activeSurfaceId
    // resets on every cold start. The REHYDRATE handler is here for convention
    // consistency with other slices; in practice it will never receive a payload.
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
