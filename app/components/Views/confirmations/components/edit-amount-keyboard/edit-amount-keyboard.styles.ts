import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) =>
  StyleSheet.create({
    additionalButtons: {
      paddingBottom: 12,
    },
    wrapper: {
      backgroundColor: params.theme.colors.background.alternative,
      borderTopLeftRadius: 12,
      borderTopRightRadius: 12,
      padding: 12,
      paddingBottom: 20,
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
