import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../../util/theme/models';

const styleSheet = (_params: { theme: Theme }) =>
  StyleSheet.create({
    container: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
    },

    value: {
      fontSize: 64,
      lineHeight: 70,
    },

    change: {
      fontSize: 20,
      lineHeight: 25,
    },
  });

export default styleSheet;
