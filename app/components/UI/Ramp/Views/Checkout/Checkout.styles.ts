import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../util/theme/models';

const styleSheet = (_params: { theme: Theme }) =>
  StyleSheet.create({
    headerWithoutPadding: {
      paddingVertical: 0,
    },
  });

export default styleSheet;
