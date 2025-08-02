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
      marginBottom: 40,
      paddingInline: 16,
      paddingVertical: 6,
    },
  });

export default styleSheet;
