import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../util/theme/models';

const createStyles = (_params: { theme: Theme }) =>
  StyleSheet.create({
    contentContainer: {
      paddingHorizontal: 16,
    },
    footerContainer: {
      paddingHorizontal: 16,
      paddingVertical: 24,
    },
  });

export default createStyles;
