// Third party dependencies.
import Device from '../../../util/device';
import { StyleSheet } from 'react-native';
import { fontStyles } from '../../../styles/common';
import { Colors } from '../../../util/theme/models';
import { isNetworkUiRedesignEnabled } from '../../../util/networks/isNetworkUiRedesignEnabled';

/**
 * Style sheet function for NetworkSelector screen.
 * @returns StyleSheet object.
 */
const createStyles = (colors: Colors) =>
  StyleSheet.create({
    addNetworkButton: {
      marginHorizontal: 16,
      marginBottom: Device.isAndroid()
        ? 16
        : isNetworkUiRedesignEnabled()
        ? 12
        : 0,
    },
    networkMenu: {
      alignItems: 'center',
    },
    rpcMenu: {
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
    },
    cellBorder: { borderWidth: 0, paddingVertical: 4 },
    baseHeader: { paddingVertical: 8 },
    rpcText: {
      width: '100%',
    },
    textWrapper: {
      display: 'flex',
      alignSelf: 'center',
      borderWidth: 2,
      height: 'auto',
    },
    alternativeText: {
      color: colors.text.alternative,
    },
    containerDeleteText: {
      paddingLeft: 16,
      paddingRight: 8,
      alignItems: 'center',
    },
    textCentred: {
      textAlign: 'center',
    },
    buttonWrapper: {
      flexDirection: 'row',
      flex: 1,
      width: '80%',
    },
    button: {
      width: '100%',
    },
    container: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      alignItems: 'center',
      backgroundColor: colors.background.default,
    },
    item: {
      paddingLeft: 8,
    },
    buttonMenu: {
      backgroundColor: colors.background.alternative,
    },
    switchContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginVertical: 16,
      marginHorizontal: 16,
    },
    popularNetworkTitleContainer: {
      flexDirection: 'row',
      justifyContent: 'flex-start',
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
    networkCellDisabled: {
      alignItems: 'center',
      opacity: 0.5,
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
    networkListContainer: {
      height: isNetworkUiRedesignEnabled() ? '100%' : undefined,
    },
    networkIcon: {
      width: 20,
      height: 20,
      borderRadius: 10,
      marginTop: 2,
      marginRight: 16,
    },
    network: {
      flex: 1,
      flexDirection: 'row',
      paddingVertical: 12,
      alignItems: 'center',
    },
    networkLabel: {
      fontSize: 16,
      color: colors.text.default,
      ...fontStyles.normal,
    },
    inputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 10,
      borderRadius: 5,
      borderWidth: 1,
      borderColor: colors.border.default,
      color: colors.text.default,
      marginLeft: 16,
      marginRight: 16,
      marginBottom: 8,
    },
    input: {
      flex: 1,
      fontSize: 14,
      color: colors.text.default,
      ...fontStyles.normal,
      paddingLeft: 10,
    },
    icon: {
      marginLeft: 8,
    },
    no_match_text: {
      marginVertical: 10,
    },
    text: {
      textAlign: 'center',
      color: colors.text.default,
      fontSize: 10,
      marginTop: 4,
    },
    screen: { justifyContent: 'flex-end' },
    keyboardView: {
      minHeight: Device.getDeviceHeight() * 0.5,
    },
    scrollableDescription: {
      maxHeight: Device.getDeviceHeight() * 0.7,
    },
    sheet: {
      backgroundColor: colors.background.default,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
    },
    title: {
      textAlign: 'center',
      marginTop: 8,
      marginBottom: 8,
    },
    notch: {
      width: 48,
      height: 5,
      borderRadius: 4,
      backgroundColor: colors.border.default,
      marginTop: 8,
      alignSelf: 'center',
    },
    searchContainer: {
      marginLeft: 16,
      marginRight: 16,
      marginBottom: 8,
    },
    gasInfoContainer: {
      paddingHorizontal: 4,
    },
    gasInfoIcon: {
      color: colors.icon.alternative,
    },
    hitSlop: {
      top: 10,
      left: 10,
      bottom: 10,
      right: 10,
    },
  });

export default createStyles;
