import { createContext, useContext } from 'react';
import type { StartupSurfaceCandidate, StartupSurfaceId } from './state';

export type CompleteSurfaceReason =
  | 'dismiss'
  | 'engage'
  | 'decline'
  | 'unmount'
  | 'ineligible'
  | 'complete';

/**
 * Context shared by startup surface providers and consumers.
 *
 * Surfaces report eligibility through updateSurfaces and call completeSurface
 * when their flow is finished so the coordinator can advance the queue.
 */
export interface StartupSurfaceCoordinatorContextValue {
  activeSurfaceId: StartupSurfaceId | null;
  completeSurface: (
    surfaceId: StartupSurfaceId,
    reason?: CompleteSurfaceReason,
  ) => void;
  isSurfaceActive: (surfaceId: StartupSurfaceId) => boolean;
  updateSurfaces: (surfaces: StartupSurfaceCandidate[]) => void;
}

const defaultContextValue: StartupSurfaceCoordinatorContextValue = {
  activeSurfaceId: null,
  completeSurface: () => undefined,
  isSurfaceActive: () => false,
  updateSurfaces: () => undefined,
};

export const StartupSurfaceCoordinatorContext =
  createContext<StartupSurfaceCoordinatorContextValue>(defaultContextValue);

export const useStartupSurface = () =>
  useContext(StartupSurfaceCoordinatorContext);
