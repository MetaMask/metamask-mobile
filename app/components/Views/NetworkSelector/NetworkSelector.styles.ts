// Third party dependencies.
import Device from '../../../util/device';
import { StyleSheet } from 'react-native';
import { fontStyles } from '../../../styles/common';
/**
 * Style sheet function for NetworkSelector screen.
 * @returns StyleSheet object.
 */
const createStyles = (colors: any) =>
  StyleSheet.create({
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
    desc: {
      fontSize: 14,
      color: colors.text.default,
      ...fontStyles.normal,
    },
    blueText: {
      color: colors.primary.default,
      marginTop: 1,
    },
  });

export default createStyles;
