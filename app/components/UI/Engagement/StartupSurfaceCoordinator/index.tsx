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

/**
 * Describes a startup surface candidate.
 *
 * Surfaces that live in the current tree provide an element. Surfaces backed by
 * navigation, such as GTM modals, provide present so they can open once when
 * they become active.
 */
export type StartupSurfaceDescriptor = StartupSurfaceCandidate & {
  element?: React.ReactNode;
  present?: () => void;
};

interface StartupSurfaceOrchestratorProps {
  surfaces: StartupSurfaceDescriptor[];
}

export const StartupSurfaceOrchestrator = ({
  surfaces,
}: StartupSurfaceOrchestratorProps) => {
  const { activeSurfaceId, updateSurfaces } = useStartupSurface();
  const presentedSurfaceIdRef = useRef<StartupSurfaceId | null>(null);

  // Register the latest eligibility state for every surface. The reducer owns
  // the priority decision, so surface hooks only need to report their status.
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

    // Imperative surfaces should open once per activation. Declarative elements
    // can re-render naturally, but navigation must not fire on every render.
    if (presentedSurfaceIdRef.current === activeSurface.id) {
      return;
    }

    presentedSurfaceIdRef.current = activeSurface.id;
    activeSurface.present();
  }, [activeSurface, activeSurfaceId]);

  return <>{activeSurface?.element}</>;
};

interface StartupSurfaceCoordinatorProps {
  children: React.ReactNode;
}

/**
 * Coordinates one startup engagement surface at a time.
 *
 * Surfaces are evaluated in the order provided by StartupSurfaces. A resolving
 * higher-priority surface pauses lower-priority surfaces until eligibility is
 * known, and completed surfaces are not reactivated in the same app session.
 */
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
export { useCompleteSurface } from './useCompleteSurface';
export type { CompleteSurfaceReason, StartupSurfaceId, StartupSurfaceStatus };
