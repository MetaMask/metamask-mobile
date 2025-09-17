import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../../util/theme/models';

const styleSheet = (_params: { theme: Theme }) =>
  StyleSheet.create({
    container: {
      minHeight: 46,
      paddingBottom: 8,
    },

    skeleton: {
      borderRadius: 8,
    },
  });

export default styleSheet;
