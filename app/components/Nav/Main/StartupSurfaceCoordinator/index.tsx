import React, {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from 'react';
import { markPushPrePromptPerformance } from '../../../../util/notifications/utils/push-pre-prompt-performance';
import {
  getDefaultStartupSurfaceState,
  startupSurfaceReducer,
  type StartupSurfaceCandidate,
  type StartupSurfaceId,
  type StartupSurfaceStatus,
} from './state';
import {
  StartupSurfaceCoordinatorContext,
  useStartupSurface,
  type CompleteSurfaceReason,
} from './context';

interface StartupSurfacePresentationArgs {
  completeSurface: (
    surfaceId: StartupSurfaceId,
    reason?: CompleteSurfaceReason,
  ) => void;
}

export type StartupSurfaceDescriptor = StartupSurfaceCandidate & {
  present?: (args: StartupSurfacePresentationArgs) => void;
  render?: (args: StartupSurfacePresentationArgs) => React.ReactNode;
};

interface StartupSurfaceOrchestratorProps {
  surfaces: StartupSurfaceDescriptor[];
}

export const StartupSurfaceOrchestrator = ({
  surfaces,
}: StartupSurfaceOrchestratorProps) => {
  const { activeSurfaceId, completeSurface, updateSurfaces } =
    useStartupSurface();
  const presentedSurfaceIdRef = useRef<StartupSurfaceId | null>(null);

  useEffect(() => {
    updateSurfaces(surfaces.map(({ id, status }) => ({ id, status })));
  }, [surfaces, updateSurfaces]);

  const activeSurface = useMemo(
    () => surfaces.find(({ id }) => id === activeSurfaceId),
    [activeSurfaceId, surfaces],
  );

  useEffect(() => {
    if (!activeSurface?.present) {
      if (
        activeSurface?.render &&
        presentedSurfaceIdRef.current !== activeSurface.id
      ) {
        markPushPrePromptPerformance('startup_surface.render.start', {
          surfaceId: activeSurface.id,
        });
      }
      presentedSurfaceIdRef.current = activeSurfaceId;
      return;
    }

    if (presentedSurfaceIdRef.current === activeSurface.id) {
      return;
    }

    presentedSurfaceIdRef.current = activeSurface.id;

    markPushPrePromptPerformance('startup_surface.navigation.start', {
      surfaceId: activeSurface.id,
    });
    activeSurface.present({ completeSurface });
  }, [activeSurface, activeSurfaceId, completeSurface]);

  return <>{activeSurface?.render?.({ completeSurface })}</>;
};

interface StartupSurfaceCoordinatorProps {
  children: React.ReactNode;
}

const StartupSurfaceCoordinator = ({
  children,
}: StartupSurfaceCoordinatorProps) => {
  const [state, dispatch] = useReducer(
    startupSurfaceReducer,
    getDefaultStartupSurfaceState(),
  );
  const activeSurfaceIdRef = useRef<StartupSurfaceId | null>(null);
  const surfaceStatusesRef = useRef<
    Partial<Record<StartupSurfaceId, StartupSurfaceStatus>>
  >({});

  useEffect(() => {
    state.surfaceOrder.forEach((surfaceId) => {
      const status = state.surfaces[surfaceId];

      if (surfaceStatusesRef.current[surfaceId] === status) {
        return;
      }

      surfaceStatusesRef.current[surfaceId] = status;
      markPushPrePromptPerformance('startup_surface.candidate_status.changed', {
        status,
        surfaceId,
      });
    });
  }, [state.surfaceOrder, state.surfaces]);

  const updateSurfaces = useCallback((surfaces: StartupSurfaceCandidate[]) => {
    dispatch({ surfaces, type: 'updateSurfaces' });
  }, []);

  const completeSurface = useCallback(
    (
      surfaceId: StartupSurfaceId,
      reason: CompleteSurfaceReason = 'complete',
    ) => {
      markPushPrePromptPerformance('startup_surface.completed', {
        reason,
        surfaceId,
      });
      dispatch({ surfaceId, type: 'complete' });
    },
    [],
  );

  const isSurfaceActive = useCallback(
    (surfaceId: StartupSurfaceId) => state.activeSurfaceId === surfaceId,
    [state.activeSurfaceId],
  );

  useEffect(() => {
    if (activeSurfaceIdRef.current === state.activeSurfaceId) {
      return;
    }

    activeSurfaceIdRef.current = state.activeSurfaceId;
    markPushPrePromptPerformance('startup_surface.active.changed', {
      surfaceId: state.activeSurfaceId ?? 'null',
    });
  }, [state.activeSurfaceId]);

  const contextValue = useMemo(
    () => ({
      activeSurfaceId: state.activeSurfaceId,
      completeSurface,
      isSurfaceActive,
      updateSurfaces,
    }),
    [completeSurface, isSurfaceActive, state.activeSurfaceId, updateSurfaces],
  );

  return (
    <StartupSurfaceCoordinatorContext.Provider value={contextValue}>
      {children}
    </StartupSurfaceCoordinatorContext.Provider>
  );
};

export default StartupSurfaceCoordinator;
export { useStartupSurface } from './context';
export type { CompleteSurfaceReason, StartupSurfaceId, StartupSurfaceStatus };
