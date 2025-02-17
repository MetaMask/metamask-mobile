import { StyleSheet } from 'react-native';
import Device from '../../../../../../../util/device';
import { Theme } from '../../../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) =>
  StyleSheet.create({
    container: {
      backgroundColor: params.theme.colors.background.alternative,
      flex: 1,
      paddingHorizontal: 16,
      paddingVertical: 24,
      paddingBottom: Device.isIphoneX() ? 20 : 0,
    },
  });

export default styleSheet;
