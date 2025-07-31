import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../util/theme/models';

const styleSheet = (_params: { theme: Theme }) =>
  StyleSheet.create({
    container: {
      paddingTop: 40,
      paddingBottom: 40,
    },
    input: {
      textAlign: 'center',
      fontSize: 64,
      fontWeight: '500',
    },
  });

export default styleSheet;
