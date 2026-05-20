import { useEffect, useRef } from 'react';
import {
  useNavigation,
  type NavigationProp,
  type ParamListBase,
} from '@react-navigation/native';
import { useSelector } from 'react-redux';
import Routes from '../../../../constants/navigation/Routes';
import { selectActiveStartupSurfaceId } from '../../../../reducers/engagement/selectors';
import type { StartupSurfaceId } from './registry';

/**
 * Maps imperative surface ids to their navigation targets.
 * Inline surfaces (e.g. push-pre-prompt) are handled by InlineStartupSurface
 * and are not listed here.
 */
const IMPERATIVE_SURFACE_ROUTES: Partial<
  Record<StartupSurfaceId, { screen: string; params: { screen: string } }>
> = {
  'perps-gtm': {
    screen: Routes.PERPS.MODALS.ROOT,
    params: { screen: Routes.PERPS.MODALS.GTM_MODAL },
  },
  'predict-gtm': {
    screen: Routes.PREDICT.MODALS.ROOT,
    params: { screen: Routes.PREDICT.MODALS.GTM_MODAL },
  },
};

/**
 * Watches the active startup surface and imperatively navigates to
 * navigation-backed surfaces (Perps GTM, Predict GTM) exactly once per
 * activation. Must be mounted inside a NavigationContainer (i.e. inside
 * MainNavigator).
 */
export const useStartupSurfacePresenter = () => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const activeSurfaceId = useSelector(selectActiveStartupSurfaceId);
  const presentedSurfaceIdRef = useRef<StartupSurfaceId | null>(null);

  useEffect(() => {
    if (!activeSurfaceId) {
      return;
    }

    const route = IMPERATIVE_SURFACE_ROUTES[activeSurfaceId];
    if (!route) {
      // Inline surface — presentation is handled by InlineStartupSurface.
      presentedSurfaceIdRef.current = activeSurfaceId;
      return;
    }

    // Only navigate once per activation to avoid reopening on re-renders.
    if (presentedSurfaceIdRef.current === activeSurfaceId) {
      return;
    }

    presentedSurfaceIdRef.current = activeSurfaceId;
    navigation.navigate(route.screen, route.params);
  }, [activeSurfaceId, navigation]);
};
