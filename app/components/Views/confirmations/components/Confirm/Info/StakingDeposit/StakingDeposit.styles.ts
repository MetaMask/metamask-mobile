import { StyleSheet } from 'react-native';
import Device from '../../../../../../../util/device';

const styleSheet = () =>
  StyleSheet.create({
    container: {
      flex: 1,
      paddingHorizontal: 16,
      paddingVertical: 24,
      paddingBottom: Device.isIphoneX() ? 20 : 0,
    },
  });

export default styleSheet;
