import { useEffect, useRef } from 'react';
import {
  TabActions,
  useNavigation,
  useNavigationState,
} from '@react-navigation/native';
import Routes from '../../../../../../constants/navigation/Routes';

/**
 * Focuses the Money tab under VBA onboarding once that tab exists. After a
 * cold-start resume the tabs mount before geolocation loads, so Money is
 * missing and Wallet is focused; leaving onboarding would otherwise land there.
 * Runs once, from a screen of the stack that holds the tabs.
 */
export const useFocusMoneyTabBelow = (): void => {
  const navigation = useNavigation();
  const tabsKey = useNavigationState(
    (state) =>
      state?.routes.find((route) => route.name === Routes.HOME_TABS)?.state
        ?.key,
  );
  const hasMoneyTab = useNavigationState((state) =>
    Boolean(
      state?.routes
        .find((route) => route.name === Routes.HOME_TABS)
        ?.state?.routeNames?.includes(Routes.MONEY.ROOT),
    ),
  );
  const doneRef = useRef(false);

  useEffect(() => {
    if (doneRef.current || !tabsKey || !hasMoneyTab) {
      return;
    }
    doneRef.current = true;
    navigation.dispatch({
      ...TabActions.jumpTo(Routes.MONEY.ROOT),
      target: tabsKey,
    });
  }, [hasMoneyTab, navigation, tabsKey]);
};
