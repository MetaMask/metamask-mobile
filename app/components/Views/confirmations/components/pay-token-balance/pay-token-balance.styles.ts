import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../util/theme/models';

const styleSheet = (_params: { theme: Theme }) =>
  StyleSheet.create({
    container: {},
    text: {
      textAlign: 'center',
    },
  });

export default styleSheet;
