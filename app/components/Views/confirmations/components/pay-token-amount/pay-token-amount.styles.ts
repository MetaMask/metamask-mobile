import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../util/theme/models';

const styleSheet = (_params: { theme: Theme }) =>
  StyleSheet.create({
    container: {
      alignItems: 'center',
      alignSelf: 'center',
      display: 'flex',
      flexDirection: 'row',
      gap: 4,
      paddingInline: 16,
      paddingVertical: 6,
      marginBottom: 24,
    },

    skeleton: {
      paddingTop: 6,
    },
  });

export default styleSheet;
