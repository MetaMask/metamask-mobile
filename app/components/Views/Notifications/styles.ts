import { Platform, StyleSheet } from 'react-native';
import type { Theme } from '@metamask/design-tokens';

const createStyles = ({ colors }: Theme) =>
  StyleSheet.create({
    wrapper: {
      flex: 1,
    },
    stickyButtonContainer: {
      paddingTop: 24,
      paddingHorizontal: 16,
      paddingBottom: Platform.OS === 'android' ? 0 : 16,
      backgroundColor: colors.background.default,
    },
    icon: { marginHorizontal: 16 },
    title: { alignSelf: 'center' },
  });

export default createStyles;
