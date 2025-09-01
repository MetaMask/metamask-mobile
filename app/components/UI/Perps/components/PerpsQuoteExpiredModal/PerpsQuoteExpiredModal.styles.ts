import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../util/theme/models';

const createStyles = (_params: { theme: Theme }) =>
  StyleSheet.create({
    container: {
      paddingHorizontal: 16,
      paddingVertical: 24,
    },
    footer: {
      paddingHorizontal: 16,
      paddingBottom: 16,
    },
  });

export default createStyles;
