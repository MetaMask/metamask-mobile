import { StyleSheet } from 'react-native';
import type { Theme } from '../../../../../util/theme/models';

const styleSheet = (_params: { theme: Theme }) =>
  StyleSheet.create({
    contentContainer: {
      paddingHorizontal: 16,
      paddingVertical: 24,
      minHeight: 100,
    },
    loadingContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 16,
    },
    loadingText: {
      marginTop: 16,
    },
    footerContainer: {
      paddingTop: 16,
    },
  });

export default styleSheet;
