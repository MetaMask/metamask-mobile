import { Platform, StyleSheet } from 'react-native';
import { Theme } from '../../../../../util/theme/models';

const createStyles = (_params: { theme: Theme }) =>
  StyleSheet.create({
    container: {
      paddingHorizontal: 16,
    },
    optionsContainer: {
      marginTop: 16,
    },
    segmentedControl: {
      gap: 8,
    },
    footer: {
      paddingHorizontal: 0,
      paddingTop: 24,
      paddingBottom: Platform.OS === 'android' ? 0 : 16,
    },
  });

export default createStyles;
