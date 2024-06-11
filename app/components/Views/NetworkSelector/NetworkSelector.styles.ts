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
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 16,
    marginHorizontal: 16,
  },
  addtionalNetworksContainer: {
    marginHorizontal: 16,
  },
  networkCell: {
    alignItems: 'center',
  },
  titleContainer: {
    margin: 16,
  },
});

export default styleSheet;
