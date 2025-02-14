import { StyleSheet } from 'react-native';
import { Theme } from '@metamask/design-tokens';

const styleSheet = ({ theme: { colors } }: { theme: Theme }) =>
  StyleSheet.create({
    bannerContainer: {
      backgroundColor: colors.background.default,
      position: 'absolute',
      bottom: 16,
      left: 16,
      right: 16,
      borderRadius: 4,
    },
  });

export default styleSheet;
