import {
  useNavigation,
  type NavigationProp,
  type ParamListBase,
} from '@react-navigation/native';
import { useEffect, useState } from 'react';

import Routes from '../../constants/navigation/Routes';

type NavigatorWithParent = Pick<
  NavigationProp<ParamListBase>,
  'getState' | 'getParent' | 'addListener'
>;

const navigatorHasQrTabSwitcher = (
  routes: { name: string }[] | undefined,
): boolean =>
  routes?.some((route) => route.name === Routes.QR_TAB_SWITCHER) ?? false;

/**
 * True when `QR_TAB_SWITCHER` is present on this navigator or any parent.
 *
 * `useNavigationState` is navigator-local, so screens inside `OnboardingNav`
 * cannot see a scanner modal registered on `OnboardingRootNav`. Walking
 * parent navigators keeps add-device deferral working in both onboarding and
 * existing-user flows.
 */
export const useIsQrTabSwitcherOpen = (): boolean => {
  const navigation = useNavigation<NavigatorWithParent>();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const updateIsOpen = () => {
      let currentNavigation: NavigatorWithParent | undefined = navigation;

      while (currentNavigation) {
        const { routes } = currentNavigation.getState();
        if (navigatorHasQrTabSwitcher(routes)) {
          setIsOpen(true);
          return;
        }
        currentNavigation = currentNavigation.getParent();
      }

      setIsOpen(false);
    };

    updateIsOpen();

    const unsubscribes: (() => void)[] = [];
    let currentNavigation: NavigatorWithParent | undefined = navigation;

    while (currentNavigation) {
      unsubscribes.push(currentNavigation.addListener('state', updateIsOpen));
      currentNavigation = currentNavigation.getParent();
    }

    return () => {
      unsubscribes.forEach((unsubscribe) => {
        unsubscribe();
      });
    };
  }, [navigation]);

  return isOpen;
};
