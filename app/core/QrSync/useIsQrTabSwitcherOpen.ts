import { useNavigation } from '@react-navigation/native';
import { useEffect, useState } from 'react';

import Routes from '../../constants/navigation/Routes';

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
  const navigation = useNavigation();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const updateIsOpen = () => {
      let currentNavigation: ReturnType<typeof useNavigation> | undefined =
        navigation;

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

    const unsubscribe = navigation.addListener('state', updateIsOpen);
    return unsubscribe;
  }, [navigation]);

  return isOpen;
};
