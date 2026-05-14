type HeadlessEntryPointerEvents = 'auto' | 'none';

interface NavigationNode {
  getParent?: () => NavigationNode | undefined;
  goBack?: () => void;
  pop?: () => void;
  setOptions?: (options: {
    cardStyle?: {
      backgroundColor: 'transparent';
      pointerEvents: HeadlessEntryPointerEvents;
    };
  }) => void;
}

export const setHeadlessEntryCardTouchThrough = (
  navigation: NavigationNode | undefined,
  touchThrough: boolean,
): boolean => {
  const headlessEntryNavigation = navigation?.getParent?.()?.getParent?.();
  if (!headlessEntryNavigation?.setOptions) {
    return false;
  }

  headlessEntryNavigation.setOptions({
    cardStyle: {
      backgroundColor: 'transparent',
      pointerEvents: touchThrough ? 'none' : 'auto',
    },
  });
  return true;
};

export const dismissHeadlessFlow = (
  navigation: NavigationNode | undefined,
): boolean => {
  const parentNavigation = navigation?.getParent?.();
  const outerNavigation = parentNavigation?.getParent?.();

  if (outerNavigation?.goBack) {
    outerNavigation.goBack();
    return true;
  }
  if (outerNavigation?.pop) {
    outerNavigation.pop();
    return true;
  }
  if (parentNavigation?.pop) {
    parentNavigation.pop();
    return true;
  }
  if (navigation?.goBack) {
    navigation.goBack();
    return true;
  }
  return false;
};
