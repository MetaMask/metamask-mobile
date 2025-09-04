import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../../util/theme/models';

const styleSheet = (_params: { theme: Theme }) =>
  StyleSheet.create({
    container: {
      paddingInline: 8,
      paddingVertical: 4,
    },

    spinner: {
      paddingInline: 8,
      paddingVertical: 4,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });

export default styleSheet;
