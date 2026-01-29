import { StyleSheet } from 'react-native';
import { Theme } from '@metamask/design-tokens';
import { baseStyles, fontStyles } from '../../../styles/common';
import Device from '../../../util/device';

const browserTabSharedStyles = ({ theme: { colors } }: { theme: Theme }) => {
  const getUrlModalContentPaddingTop = () => {
    if (Device.isAndroid()) {
      return 10;
    }
    if (Device.isIphoneX()) {
      return 50;
    }
    return 27;
  };

  const getUrlModalContentHeight = () => {
    if (Device.isAndroid()) {
      return 59;
    }
    if (Device.isIphoneX()) {
      return 87;
    }
    return 65;
  };

  return StyleSheet.create({
    wrapper: {
      ...baseStyles.flexGrow,
      backgroundColor: colors.background.default,
    },
    hide: {
      flex: 0,
      opacity: 0,
      display: 'none',
      width: 0,
      height: 0,
    },
    progressBarWrapper: {
      height: 3,
      width: '100%',
      borderBottomWidth: 1,
      borderBottomColor: colors.border.default,
    },
    webview: {
      ...baseStyles.flexGrow,
      // zIndex: 1,
    },
    urlModalContent: {
      flexDirection: 'row',
      paddingTop: getUrlModalContentPaddingTop(),
      paddingHorizontal: 10,
      height: getUrlModalContentHeight(),
      backgroundColor: colors.background.default,
    },
    searchWrapper: {
      flexDirection: 'row',
      borderRadius: 30,
      backgroundColor: colors.background.alternative,
      height: Device.isAndroid() ? 40 : 30,
      flex: 1,
    },
    clearButton: { paddingHorizontal: 12, justifyContent: 'center' },
    urlModal: {
      justifyContent: 'flex-start',
      margin: 0,
    },
    urlInput: {
      ...fontStyles.normal,
      fontSize: Device.isAndroid() ? 16 : 14,
      paddingLeft: 15,
      flex: 1,
      color: colors.text.default,
    },
    bottomModal: {
      justifyContent: 'flex-end',
      margin: 0,
    },
    fullScreenModal: {
      flex: 1,
    },
    bannerContainer: {
      backgroundColor: colors.background.default,
      position: 'absolute',
      bottom: 16,
      left: 16,
      right: 16,
      borderRadius: 4,
    },
    refreshIndicator: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 9997,
    },
  });
};

export default browserTabSharedStyles;
