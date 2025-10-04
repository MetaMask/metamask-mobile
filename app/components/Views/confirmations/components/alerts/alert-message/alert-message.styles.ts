import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) =>
  StyleSheet.create({
    message: {
      textAlign: 'center',
      marginTop: 16,
      color: params.theme.colors.error.default,
    },
  });

export default styleSheet;
