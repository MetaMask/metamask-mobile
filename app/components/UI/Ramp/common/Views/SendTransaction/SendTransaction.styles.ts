import { Theme } from '../../../../../../util/theme/models';
import { StyleSheet } from 'react-native';

const styleSheet = (_params: { theme: Theme }) =>
  // const { theme } = params;
  // const { colors } = theme;

  StyleSheet.create({
    centered: {
      textAlign: 'center',
    },
  });
export default styleSheet;
