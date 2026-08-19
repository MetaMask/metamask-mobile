import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../../util/theme/models';

const styleSheet = (_params: { theme: Theme }) =>
  StyleSheet.create({
    container: {
      marginBottom: 8,
    },
  });

export default styleSheet;
