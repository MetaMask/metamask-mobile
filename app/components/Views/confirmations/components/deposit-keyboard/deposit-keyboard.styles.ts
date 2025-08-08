import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) =>
  StyleSheet.create({
    container: {
      paddingHorizontal: 0,
      marginInline: -5,
      justifyContent: 'center',
    },
    digitButton: {
      borderRadius: 12,
      backgroundColor: params.theme.colors.background.default,
      paddingVertical: 6,
      margin: 5,
      padding: 0,
    },
    percentageButton: {
      borderRadius: 12,
      backgroundColor: params.theme.colors.background.default,
      height: 48,
      flexGrow: 1,
      fontSize: 20,
      marginBottom: 5,
    },
  });

export default styleSheet;
