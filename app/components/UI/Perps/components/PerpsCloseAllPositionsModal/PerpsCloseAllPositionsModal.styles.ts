import { StyleSheet } from 'react-native';
import type { Theme } from '../../../../../util/theme/models';

const styleSheet = (_params: { theme: Theme }) =>
  StyleSheet.create({
    contentContainer: {
      paddingHorizontal: 16,
      paddingVertical: 16,
    },
    description: {
      marginBottom: 24,
    },
    loadingContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 32,
    },
    loadingText: {
      marginTop: 16,
    },
    footerContainer: {
      paddingTop: 16,
    },
  });

export default styleSheet;
