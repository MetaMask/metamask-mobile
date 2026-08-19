/**
 * Invokes `navigation.goBack()` only when the current screen is focused.
 */
export function goBackIfFocused(navigation: {
  isFocused: () => boolean;
  goBack: () => void;
}): void {
  if (navigation.isFocused()) {
    navigation.goBack();
  }
}
