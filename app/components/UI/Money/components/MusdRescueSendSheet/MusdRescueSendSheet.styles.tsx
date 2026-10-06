import { StyleSheet } from 'react-native';
import type { Theme } from '../../../../../util/theme/models';

const styleSheet = (_params: { theme: Theme }) =>
  StyleSheet.create({
    container: {
      flex: 1,
      gap: 16,
      padding: 16,
    },
  });

export default styleSheet;
