import { StyleSheet } from 'react-native';
import { Theme } from '../../../util/theme/models';

export const stylesheet = (_params: { theme: Theme; vars: unknown }) =>
  StyleSheet.create({
    header: {
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
  });
