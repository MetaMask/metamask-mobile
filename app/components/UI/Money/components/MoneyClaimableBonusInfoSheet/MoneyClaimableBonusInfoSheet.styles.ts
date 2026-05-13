import { StyleSheet } from 'react-native';
import type { Theme } from '../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) =>
  StyleSheet.create({
    content: {
      paddingHorizontal: 16,
      paddingBottom: 8,
      gap: 16,
      backgroundColor: params.theme.colors.background.default,
    },
    termsText: {
      textDecorationLine: 'underline',
    },
  });

export default styleSheet;
