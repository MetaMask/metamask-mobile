import { StyleSheet } from 'react-native';
import Device from '../../../../../util/device';
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
      marginBottom: 0,
      paddingBottom: Device.isIos() ? 20 : 12,
    },
    percentageButton: {
      borderRadius: 12,
      color: params.theme.colors.text.default,
      backgroundColor: params.theme.colors.background.muted,
      height: 48,
      flexGrow: 1,
    },
  });

export default styleSheet;
