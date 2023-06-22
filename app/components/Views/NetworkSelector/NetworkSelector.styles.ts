// Third party dependencies.
import Device from '../../../util/device';
import { StyleSheet } from 'react-native';

/**
 * Style sheet function for NetworkSelector screen.
 * @returns StyleSheet object.
 */
const styleSheet = StyleSheet.create({
  addNetworkButton: {
    marginHorizontal: 16,
    marginBottom: Device.isAndroid() ? 16 : 0,
  },
  networkCell: {
    alignItems: 'center',
  },
});

export default styleSheet;
