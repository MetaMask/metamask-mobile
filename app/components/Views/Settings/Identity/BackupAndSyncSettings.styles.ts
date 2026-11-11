import { StyleSheet } from 'react-native';
import { Theme } from '../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) =>
  StyleSheet.create({
    wrapper: {
      backgroundColor: params.theme.colors.background.default,
      flex: 1,
      padding: 16,
      paddingBottom: 48,
    },
  });

export default styleSheet;
