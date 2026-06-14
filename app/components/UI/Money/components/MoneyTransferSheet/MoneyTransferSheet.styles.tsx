import { StyleSheet } from 'react-native';
import type { Theme } from '../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) =>
  StyleSheet.create({
    list: {
      paddingBottom: 16,
      backgroundColor: params.theme.colors.background.default,
    },
  });

export default styleSheet;
