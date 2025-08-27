import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../util/theme/models';

const styleSheet = (_params: { theme: Theme }) =>
  StyleSheet.create({
    percentageButton: {
      borderRadius: 12,
      height: 48,
      flexGrow: 1,
      fontSize: 20,
      marginBottom: 12,
    },
  });

export default styleSheet;
