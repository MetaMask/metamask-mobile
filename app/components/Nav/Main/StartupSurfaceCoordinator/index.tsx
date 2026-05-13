import React, {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from 'react';
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
      presentedSurfaceIdRef.current = activeSurfaceId;
      return;
    }

    if (presentedSurfaceIdRef.current === activeSurface.id) {
      return;
    }

    presentedSurfaceIdRef.current = activeSurface.id;
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

  const updateSurfaces = useCallback((surfaces: StartupSurfaceCandidate[]) => {
    dispatch({ surfaces, type: 'updateSurfaces' });
  }, []);

  const completeSurface = useCallback(
    (
      surfaceId: StartupSurfaceId,
      _reason: CompleteSurfaceReason = 'complete',
    ) => {
      dispatch({ surfaceId, type: 'complete' });
    },
    [],
  );

  const isSurfaceActive = useCallback(
    (surfaceId: StartupSurfaceId) => state.activeSurfaceId === surfaceId,
    [state.activeSurfaceId],
  );

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
