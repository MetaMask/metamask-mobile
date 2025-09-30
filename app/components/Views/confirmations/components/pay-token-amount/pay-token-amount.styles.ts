import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) =>
  StyleSheet.create({
    container: {
      alignItems: 'center',
      alignSelf: 'center',
      backgroundColor: params.theme.colors.background.subsection,
      borderRadius: 99,
      display: 'flex',
      flexDirection: 'row',
      gap: 4,
      paddingInline: 16,
      paddingVertical: 6,
      marginBottom: 64,
    },

    skeleton: {
      alignItems: 'center',
      alignSelf: 'center',
      borderRadius: 99,
      display: 'flex',
      flexDirection: 'row',
      gap: 4,
      paddingInline: 16,
      paddingVertical: 6,
      marginBottom: 64,
    },
  });

export default styleSheet;
