import { useCallback } from 'react';
import {
  useNavigation,
  type NavigationProp,
  type ParamListBase,
} from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import Routes from '../../../../constants/navigation/Routes';

const MAX_PARENT_WALK = 8;

export const useExitCardFlow = () => {
  const navigation = useNavigation<AppNavigationProp>();

  return useCallback(() => {
    let parent: NavigationProp<ParamListBase> | undefined =
      typeof navigation.getParent === 'function'
        ? navigation.getParent()
        : undefined;
    let depth = 0;

    while (parent && depth < MAX_PARENT_WALK) {
      depth += 1;
      const state = parent.getState();
      const route = state?.routes?.[state.index];

      if (route?.name === Routes.CARD.ROOT) {
        const params = route.params as { returnToCaller?: boolean } | undefined;
        // `canGoBack` is also true when a parent navigator can go back, and
        // `goBack` would then leave this navigator. Only pop when Card root
        // itself has a screen underneath it.
        const canPopCardRoot = (state?.index ?? 0) > 0 && parent.canGoBack();
        if (params?.returnToCaller === true && canPopCardRoot) {
          parent.goBack();
          return;
        }
        break;
      }

      parent =
        typeof parent.getParent === 'function' ? parent.getParent() : undefined;
    }

    navigation.navigate(Routes.WALLET.HOME);
  }, [navigation]);
};
