type HeadlessEntryPointerEvents = 'auto' | 'none';

interface NavigationNode {
  getParent?: () => NavigationNode | undefined;
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
