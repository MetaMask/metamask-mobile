import { StyleSheet } from 'react-native';
import type { screen } from '@testing-library/react-native';

/** The backdrop's fade opacity, read from the nearest view above its gradient. */
export const backdropFadeOpacity = (
  gradient: ReturnType<typeof screen.getByTestId>,
) => {
  let node = gradient.parent;
  while (node) {
    const opacity = StyleSheet.flatten(node.props.style)?.opacity;
    if (opacity !== undefined) {
      return opacity;
    }
    node = node.parent;
  }
  return undefined;
};
