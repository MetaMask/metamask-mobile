import { StyleSheet } from 'react-native';
import type { Theme } from '../../../../../util/theme/models';

const styleSheet = (_params: { theme: Theme }) =>
  StyleSheet.create({
    list: {
      paddingBottom: 16,
    },
  });

export default styleSheet;
