import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) =>
  StyleSheet.create({
    message: {
      color: params.theme.colors.error.default,
      textAlign: 'center',
    },
  });

export default styleSheet;
