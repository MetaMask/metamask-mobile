import { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { selectActiveStartupSurfaceId } from '../../../../reducers/engagement/selectors';
import NavigationService from '../../../../core/NavigationService';
import type { StartupSurfaceId } from './registry';

interface StartupSurfaceRoute {
  screen: string;
  params: { screen: string };
}

/**
 * Maps startup-surface ids to navigation targets.
 */
const NAVIGATION_BACKED_SURFACE_ROUTES: Record<
  StartupSurfaceId,
  StartupSurfaceRoute | null
> = {
  'push-pre-prompt': null,
  'perps-gtm': null,
  'predict-gtm': null,
};

/**
 * Presents navigation-backed startup surfaces once per activation.
 */
export const useStartupSurfacePresenter = () => {
  const activeSurfaceId = useSelector(selectActiveStartupSurfaceId);
  const presentedSurfaceIdRef = useRef<StartupSurfaceId | null>(null);

  useEffect(() => {
    if (!activeSurfaceId) {
      return;
    }

    const route = NAVIGATION_BACKED_SURFACE_ROUTES[activeSurfaceId];
    if (!route) {
      presentedSurfaceIdRef.current = activeSurfaceId;
      return;
    }

    // Only navigate once per activation to avoid reopening on re-renders.
    if (presentedSurfaceIdRef.current === activeSurfaceId) {
      return;
    }

    presentedSurfaceIdRef.current = activeSurfaceId;
    NavigationService.navigation.navigate(route.screen, route.params);
  }, [activeSurfaceId]);
};
