import { useCallback } from 'react';
import {
  useNavigation,
  type NavigationProp,
  type ParamListBase,
} from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import Routes from '../../../../constants/navigation/Routes';
import { findCardPostAuthRedirect } from './useCardPostAuthRedirect';

const MAX_PARENT_WALK = 8;

export interface ExitCardFlowOptions {
  /**
   * Where to go when setup was not opened on top of another screen.
   * `card-home-pending` resets to Card home with the KYC-pending param,
   * which is what the processing screen did when its poll timed out.
   */
  fallback?: 'card-home-pending';
}

export const useExitCardFlow = () => {
  const navigation = useNavigation<AppNavigationProp>();

  return useCallback(
    (options?: ExitCardFlowOptions) => {
      let parent: NavigationProp<ParamListBase> | undefined =
        typeof navigation.getParent === 'function'
          ? navigation.getParent()
          : undefined;
      let depth = 0;

      while (parent && depth < MAX_PARENT_WALK) {
        depth += 1;
        const state = parent.getState();
        const routeIndex = state?.index ?? 0;
        const route = state?.routes?.[routeIndex];

        // Setup opened on top of Card home lands back on Card home. That wins
        // over a Money home return, so the screen underneath is where the user
        // was when they opened this step.
        if (
          route?.name === Routes.CARD.ONBOARDING.ROOT &&
          state?.routes?.[routeIndex - 1]?.name === Routes.CARD.HOME
        ) {
          parent.goBack();
          return;
        }

        if (route?.name === Routes.CARD.ROOT) {
          const params = route.params as
            | { returnToCaller?: boolean }
            | undefined;
          // `canGoBack` is also true when a parent navigator can go back, and
          // `goBack` would then leave this navigator. Only pop when Card root
          // itself has a screen underneath it.
          const canPopCardRoot = routeIndex > 0 && parent.canGoBack();
          const openedFromMoneyHome =
            findCardPostAuthRedirect(navigation)?.screen === Routes.HOME_TABS;
          if (
            (params?.returnToCaller === true || openedFromMoneyHome) &&
            canPopCardRoot
          ) {
            parent.goBack();
            return;
          }
          break;
        }

        parent =
          typeof parent.getParent === 'function'
            ? parent.getParent()
            : undefined;
      }

      if (options?.fallback === 'card-home-pending') {
        navigation.reset({
          index: 0,
          routes: [
            { name: Routes.CARD.HOME, params: { fromKycPending: true } },
          ],
        });
        return;
      }

      navigation.navigate(Routes.WALLET.HOME);
    },
    [navigation],
  );
};
