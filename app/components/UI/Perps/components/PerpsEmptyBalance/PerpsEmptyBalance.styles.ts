import { StyleSheet } from 'react-native';
import type { Theme } from '../../../../../util/theme/models';

const styleSheet = (_params: { theme: Theme }) =>
  StyleSheet.create({
    balanceText: {
      fontWeight: '500',
    },
  });

export default styleSheet;
