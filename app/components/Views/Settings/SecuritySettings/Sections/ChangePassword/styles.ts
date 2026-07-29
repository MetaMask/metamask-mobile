import { StyleSheet } from 'react-native';
import type { Theme } from '@metamask/design-tokens';

export const createStyles = ({ theme: { colors } }: { theme: Theme }) =>
  StyleSheet.create({
    setting: {
      marginTop: 0,
      paddingVertical: 16,
    },
    desc: {
      marginTop: 8,
      lineHeight: 20,
    },
    confirm: {
      marginTop: 12,
    },
  });
