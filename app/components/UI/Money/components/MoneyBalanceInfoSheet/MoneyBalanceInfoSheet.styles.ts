import { StyleSheet } from 'react-native';
import type { Theme } from '../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) =>
  StyleSheet.create({
    content: {
      paddingHorizontal: 16,
      paddingBottom: 16,
      gap: 16,
    },
  });

export default styleSheet;
