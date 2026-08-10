import { StyleSheet } from 'react-native';
import type { Theme } from '../../../../../../util/theme/models';

export const createStyles = (_: { theme: Theme }) =>
  StyleSheet.create({
    panel: {
      width: '100%',
      alignSelf: 'flex-start',
      paddingTop: 16,
    },
  });
