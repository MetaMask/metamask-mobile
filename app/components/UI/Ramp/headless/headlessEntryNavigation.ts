interface NavigationNode {
  getParent?: () => NavigationNode | undefined;
  goBack?: () => void;
  pop?: () => void;
  setOptions?: (options: Record<string, unknown>) => void;
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
  const dismiss =
    outerNavigation?.goBack ??
    outerNavigation?.pop ??
    parentNavigation?.pop ??
    navigation?.goBack;

  if (!dismiss) {
    return false;
  }
  dismiss();
  return true;
};
