import { StyleSheet } from 'react-native';
import type { Theme } from '../../../../../util/theme/models';

export const createStyles = (_theme: Theme) =>
  StyleSheet.create({
    contentContainer: {
      paddingHorizontal: 16,
      paddingVertical: 16,
    },
  });
