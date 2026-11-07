import { StyleSheet } from 'react-native';
import { Theme } from '@metamask/design-tokens';

const styleSheet = ({ theme: { colors } }: { theme: Theme }) =>
  StyleSheet.create({
    // The in-app browser webview composites above a transparent sibling, so
    // the card needs its own opaque surface and a radius that matches the alert.
    bannerContainer: {
      position: 'absolute',
      bottom: 16,
      left: 16,
      right: 16,
      zIndex: 2,
      borderRadius: 12,
      overflow: 'hidden',
      backgroundColor: colors.background.default,
    },
  });

export default styleSheet;
