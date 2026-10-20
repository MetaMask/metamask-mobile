import { useEffect, useRef } from 'react';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import Routes from '../../../../../constants/navigation/Routes';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import {
  setApplePayHomeSplashSeen,
  setApplePayHomeSplashShownThisSession,
} from '../../../../../core/redux/slices/card';
import type { ApplePayHomeEligibility } from './useApplePayHomeEligibility';

const hasTestOverrides = process.env.HAS_TEST_OVERRIDES === 'true';

function isRootModalPresented(navigation: AppNavigationProp): boolean {
  let current: { getParent?: () => unknown; getState?: () => unknown } =
    navigation;

  while (current.getParent) {
    const parent = current.getParent() as
      | {
          getParent?: () => unknown;
          getState?: () => {
            index?: number;
            routes?: { name?: string }[];
          };
        }
      | undefined;
    if (!parent?.getState) {
      break;
    }
    const state = parent.getState();
    const route = state?.routes?.[state.index ?? 0];
    if (route?.name === Routes.MODAL.ROOT_MODAL_FLOW) {
      return true;
    }
    current = parent;
  }

  return false;
}

/**
 * Shows the Apple Pay splash on wallet Home once, and only when no other
 * root modal is open. How often it should return is still for Apple and FIME
 * to confirm; until then it shows once per device.
 */
export function usePresentApplePayHomeSplash(
  eligibility: ApplePayHomeEligibility,
): void {
  const navigation = useNavigation<AppNavigationProp>();
  const dispatch = useDispatch();
  const isFocused = useIsFocused();
  const presented = useRef(false);

  useEffect(() => {
    if (
      hasTestOverrides ||
      presented.current ||
      !isFocused ||
      !eligibility.showSplash ||
      isRootModalPresented(navigation)
    ) {
      return;
    }

    presented.current = true;
    dispatch(setApplePayHomeSplashSeen(true));
    dispatch(setApplePayHomeSplashShownThisSession(true));
    navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.MODAL.APPLE_PAY_HOME_SPLASH,
      params: { source: 'home' },
    });
  }, [dispatch, eligibility.showSplash, isFocused, navigation]);
}
