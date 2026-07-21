import React, { useCallback } from 'react';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import Routes from '../../../../../constants/navigation/Routes';
import PerpsModeTransition from '../../components/PerpsModeTransition';
import { PerpsMode } from '../../components/PerpsModeToggle';
import type { PerpsNavigationParamList } from '../../types/navigation';

/**
 * Route wrapper for the Lite ⇄ Pro mode-switch interstitial (TAT-3551).
 *
 * Reads the destination `mode` from route params, shows the full-screen
 * {@link PerpsModeTransition} for its default duration, then redirects to the
 * Perps home screen.
 *
 * TODO(TAT-3551/TAT-3582): AC #4 asks Pro to land on the BTC market screen when
 * the user is not already on a Market page. That destination depends on the
 * shared mode state shipping in TAT-3582, so for now both directions redirect
 * to the Perps home screen.
 */
const PerpsModeTransitionView: React.FC = () => {
  const navigation = useNavigation();
  const { params } =
    useRoute<RouteProp<PerpsNavigationParamList, 'PerpsModeTransition'>>();

  const mode = params?.mode === 'pro' ? PerpsMode.Pro : PerpsMode.Lite;

  const handleDone = useCallback(() => {
    // The interstitial is always pushed on top of an existing Perps screen, so
    // popping it off reliably returns to the previous (Perps home) screen. Fall
    // back to an explicit navigate if for some reason there is nothing to pop.
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate(Routes.PERPS.PERPS_HOME);
    }
  }, [navigation]);

  return <PerpsModeTransition mode={mode} onDone={handleDone} />;
};

export default PerpsModeTransitionView;
