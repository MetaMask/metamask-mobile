import { StyleSheet } from 'react-native';

export default (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    overlayBackground: {
      backgroundColor: colors.overlay.default,
      ...StyleSheet.absoluteFillObject,
    },
    fill: {
      flex: 1,
    },
  });
