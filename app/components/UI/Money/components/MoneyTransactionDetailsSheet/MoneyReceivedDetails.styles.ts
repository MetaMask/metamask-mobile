import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../util/theme/models';

const styleSheet = (_params: { theme: Theme }) =>
  StyleSheet.create({
    container: {
      paddingInline: 16,
    },
    hero: {
      marginVertical: 12,
    },
  });

export default styleSheet;
