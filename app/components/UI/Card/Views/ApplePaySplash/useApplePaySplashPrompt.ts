import { useCallback, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import Routes from '../../../../../constants/navigation/Routes';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import {
  selectApplePaySplashSeen,
  setApplePaySplashSeen,
} from '../../../../../core/redux/slices/card';
import {
  selectCardActiveProviderId,
  selectIsCardAuthenticated,
} from '../../../../../selectors/cardController';
import { selectPushProvisioningEnabled } from '../../../../../selectors/featureFlagController/card';
import { useCardCapabilities } from '../../hooks/useCardCapabilities';
import { shouldShowApplePaySplash } from './shouldShowApplePaySplash';

interface UseApplePaySplashPromptParams {
  canAddToWallet: boolean;
  isPushProvisioningLoading: boolean;
}

/**
 * Opens the one-time Apple Pay splash when Card Home gains focus.
 * Marks the splash seen before navigating so a later focus does not reopen it.
 * A developer reset applies on the next Card Home visit, not when returning
 * from the splash itself.
 */
export function useApplePaySplashPrompt({
  canAddToWallet,
  isPushProvisioningLoading,
}: UseApplePaySplashPromptParams): void {
  const navigation = useNavigation<AppNavigationProp>();
  const dispatch = useDispatch();
  const seen = useSelector(selectApplePaySplashSeen);
  const isAuthenticated = useSelector(selectIsCardAuthenticated);
  const providerId = useSelector(selectCardActiveProviderId);
  const capabilities = useCardCapabilities();
  const provisioningEnabled = useSelector(
    (state: Parameters<typeof selectPushProvisioningEnabled>[0]) =>
      selectPushProvisioningEnabled(state, providerId, 'apple_wallet'),
  );
  const prompted = useRef(false);
  const openedSplash = useRef(false);

  const shouldShow = shouldShowApplePaySplash({
    isIos: Platform.OS === 'ios',
    isAuthenticated,
    applePayCapability: capabilities?.pushProvisioning?.applePay === true,
    provisioningEnabled,
    seen,
    canAddToWallet,
    isPushProvisioningLoading,
  });

  useEffect(
    () =>
      navigation.addListener('blur', () => {
        // Leaving for the splash is part of this visit. Any other blur means
        // Card Home was left, so a reset can show the splash next time.
        if (openedSplash.current) {
          openedSplash.current = false;
          return;
        }
        prompted.current = false;
      }),
    [navigation],
  );

  useFocusEffect(
    useCallback(() => {
      if (!shouldShow || prompted.current) {
        return;
      }
      prompted.current = true;
      openedSplash.current = true;
      dispatch(setApplePaySplashSeen(true));
      navigation.navigate(Routes.CARD.APPLE_PAY_SPLASH);
    }, [dispatch, navigation, shouldShow]),
  );
}
