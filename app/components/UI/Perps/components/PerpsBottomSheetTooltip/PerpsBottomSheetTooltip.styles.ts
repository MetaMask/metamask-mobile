import { Platform, StyleSheet } from 'react-native';
import { Theme } from '../../../../../util/theme/models';

const createStyles = (_params: { theme: Theme }) =>
  StyleSheet.create({
    contentContainer: {
      paddingHorizontal: 16,
    },
    footerContainer: {
      paddingHorizontal: 16,
      paddingTop: 24,
      paddingBottom: Platform.OS === 'android' ? 0 : 24,
    },
  });

export default createStyles;
