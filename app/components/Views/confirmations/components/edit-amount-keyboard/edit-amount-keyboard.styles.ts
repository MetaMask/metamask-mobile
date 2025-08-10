import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) =>
  StyleSheet.create({
    additionalButtons: {
      paddingBottom: 4,
    },
    wrapper: {
      backgroundColor: params.theme.colors.background.alternative,
      borderTopLeftRadius: 12,
      borderTopRightRadius: 12,
      padding: 12,
      paddingBottom: 20,
    },
    container: {
      display: 'flex',
      justifyContent: 'space-evenly',
      paddingHorizontal: 0,
      marginInline: -5,
      position: 'relative',
      bottom: 0,
    },
    digitButton: {
      borderRadius: 12,
      backgroundColor: params.theme.colors.background.muted,
      paddingVertical: 6,
      margin: 5,
      padding: 0,
    },
    percentageButton: {
      borderRadius: 12,
      backgroundColor: params.theme.colors.background.muted,
      height: 48,
      flexGrow: 1,
      fontSize: 20,
    },
  });

export default styleSheet;
