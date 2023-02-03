/* eslint-disable react/display-name */
import React from 'react';
import NavbarTitle from '../NavbarTitle';
import ModalNavbarTitle from '../ModalNavbarTitle';
import AccountRightButton from '../AccountRightButton';
import {
  Alert,
  Text,
  TouchableOpacity,
  View,
  StyleSheet,
  Image,
  InteractionManager,
  Platform,
} from 'react-native';
import { fontStyles, colors as importedColors } from '../../../styles/common';
import IonicIcon from 'react-native-vector-icons/Ionicons';
import AntIcon from 'react-native-vector-icons/AntDesign';
import EvilIcons from 'react-native-vector-icons/EvilIcons';
import MaterialCommunityIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import { scale } from 'react-native-size-matters';
import { strings } from '../../../../locales/i18n';
import AppConstants from '../../../core/AppConstants';
import DeeplinkManager from '../../../core/DeeplinkManager';
import Analytics from '../../../core/Analytics/Analytics';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { importAccountFromPrivateKey } from '../../../util/address';
import Device from '../../../util/device';
import PickerNetwork from '../../../component-library/components/Pickers/PickerNetwork';
import BrowserUrlBar from '../BrowserUrlBar';
import generateTestId from '../../../../wdio/utils/generateTestId';
import {
  WALLET_VIEW_BURGER_ICON_ID,
  HAMBURGER_MENU_BUTTON,
  NAVBAR_NETWORK_BUTTON,
} from '../../../../wdio/screen-objects/testIDs/Screens/WalletView.testIds';
import {
  NAV_ANDROID_BACK_BUTTON,
  NETWORK_BACK_ARROW_BUTTON_ID,
  NETWORK_SCREEN_CLOSE_ICON,
} from '../../../../wdio/screen-objects/testIDs/Screens/NetworksScreen.testids';
import { SEND_CANCEL_BUTTON } from '../../../../wdio/screen-objects/testIDs/Screens/SendScreen.testIds';
import { CONTACT_EDIT_BUTTON } from '../../../../wdio/screen-objects/testIDs/Screens/Contacts.testids';
import { ASSET_BACK_BUTTON } from '../../../../wdio/screen-objects/testIDs/Screens/AssetSearch.testIds';
import {
  PAYMENT_REQUEST_CLOSE_BUTTON,
  REQUEST_SEARCH_RESULTS_BACK_BUTTON,
} from '../../../../wdio/screen-objects/testIDs/Screens/RequestToken.testIds';

const trackEvent = (event) => {
  InteractionManager.runAfterInteractions(() => {
    Analytics.trackEvent(event);
  });
};

const trackEventWithParameters = (event, params) => {
  InteractionManager.runAfterInteractions(() => {
    Analytics.trackEventWithParameters(event, params);
  });
};

const styles = StyleSheet.create({
  metamaskName: {
    width: 122,
    height: 15,
  },
  metamaskFox: {
    width: 40,
    height: 40,
    marginRight: 10,
  },
  backIconIOS: {
    marginHorizontal: 4,
    marginTop: -4,
  },
  shareIconIOS: {
    marginHorizontal: -5,
  },
  hamburgerButton: {
    paddingLeft: Device.isAndroid() ? 22 : 18,
    paddingRight: Device.isAndroid() ? 22 : 18,
    paddingTop: Device.isAndroid() ? 14 : 10,
    paddingBottom: Device.isAndroid() ? 14 : 10,
  },
  backButton: {
    paddingLeft: Device.isAndroid() ? 22 : 18,
    paddingRight: Device.isAndroid() ? 22 : 18,
    marginTop: 5,
  },
  closeButton: {
    paddingHorizontal: Device.isAndroid() ? 22 : 18,
    paddingVertical: Device.isAndroid() ? 14 : 8,
  },
  infoButton: {
    paddingLeft: Device.isAndroid() ? 22 : 18,
    paddingRight: Device.isAndroid() ? 22 : 18,
    marginTop: 5,
  },
  disabled: {
    opacity: 0.3,
  },
  optinHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Device.isIos() ? 20 : 0,
  },
  metamaskNameTransparentWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  metamaskNameWrapper: {
    marginLeft: Device.isAndroid() ? 20 : 0,
  },
});

const metamask_name = require('../../../images/metamask-name.png'); // eslint-disable-line
const metamask_fox = require('../../../images/fox.png'); // eslint-disable-line
/**
 * Function that returns the navigation options
 * This is used by views that will show our custom navbar
 * which contains accounts icon, Title or MetaMask Logo and current network, and settings icon
 *
 * @param {string} title - Title in string format
 * @param {Object} navigation - Navigation object required to push new views
 * @param {bool} disableNetwork - Boolean that specifies if the network can be changed, defaults to false
 * @returns {Object} - Corresponding navbar options containing headerTitle, headerLeft, headerTruncatedBackTitle and headerRight
 */
export function getTransactionsNavbarOptions(
  title,
  themeColors,
  navigation,
  selectedAddress,
  handleRightButtonPress,
) {
  const innerStyles = StyleSheet.create({
    headerStyle: {
      backgroundColor: themeColors.background.default,
      shadowColor: importedColors.transparent,
      elevation: 0,
    },
    headerIcon: {
      color: themeColors.primary.default,
    },
    headerButtonText: {
      color: themeColors.primary.default,
      fontSize: 14,
      ...fontStyles.normal,
    },
  });

  function handleLeftButtonPress() {
    return navigation?.pop();
  }

  return {
    headerTitle: () => <NavbarTitle title={title} />,
    headerLeft: () => (
      <TouchableOpacity
        onPress={handleLeftButtonPress}
        style={styles.backButton}
      >
        <Text style={innerStyles.headerButtonText}>
          {strings('navigation.close')}
        </Text>
      </TouchableOpacity>
    ),
    headerRight: () => (
      <AccountRightButton
        selectedAddress={selectedAddress}
        onPress={handleRightButtonPress}
      />
    ),
    headerStyle: innerStyles.headerStyle,
    headerTintColor: themeColors.primary.default,
  };
}

/**
 * Function that returns the navigation options
 * This is used by views that will show our custom navbar which contains Title
 *
 * @param {string} title - Title in string format
 * @param {Object} navigation - Navigation object required to push new views
 * @returns {Object} - Corresponding navbar options containing title and headerTitleStyle
 */
export function getNavigationOptionsTitle(
  title,
  navigation,
  isFullScreenModal,
  themeColors,
  navigationPopEvent,
) {
  const innerStyles = StyleSheet.create({
    headerTitleStyle: {
      fontSize: 20,
      color: themeColors.text.default,
      ...fontStyles.normal,
    },
    headerIcon: {
      color: themeColors.primary.default,
    },
    headerStyle: {
      backgroundColor: themeColors.background.default,
      shadowColor: importedColors.transparent,
      elevation: 0,
    },
  });
  function navigationPop() {
    if (navigationPopEvent) trackEvent(navigationPopEvent);
    navigation.pop();
  }
  return {
    title,
    headerTitleStyle: innerStyles.headerTitleStyle,
    headerRight: () =>
      isFullScreenModal ? (
        <TouchableOpacity onPress={navigationPop} style={styles.closeButton}>
          <IonicIcon
            name={'ios-close'}
            size={38}
            style={[innerStyles.headerIcon, styles.backIconIOS]}
            {...generateTestId(Platform, NETWORK_SCREEN_CLOSE_ICON)}
          />
        </TouchableOpacity>
      ) : null,
    headerLeft: () =>
      isFullScreenModal ? null : (
        <TouchableOpacity
          onPress={navigationPop}
          style={styles.backButton}
          {...generateTestId(Platform, NETWORK_BACK_ARROW_BUTTON_ID)}
        >
          <IonicIcon
            name={Device.isAndroid() ? 'md-arrow-back' : 'ios-arrow-back'}
            size={Device.isAndroid() ? 24 : 28}
            style={innerStyles.headerIcon}
          />
        </TouchableOpacity>
      ),
    headerStyle: innerStyles.headerStyle,
    headerTintColor: themeColors.primary.default,
  };
}

/**
 * Function that returns the navigation options
 * This is used by contact form
 *
 * @param {string} title - Title in string format
 * @param {Object} navigation - Navigation object required to push new views
 * @returns {Object} - Corresponding navbar options
 */
export function getEditableOptions(title, navigation, route, themeColors) {
  const innerStyles = StyleSheet.create({
    headerTitleStyle: {
      fontSize: 20,
      color: themeColors.text.default,
      ...fontStyles.normal,
    },
    headerIcon: {
      color: themeColors.primary.default,
    },
    headerButtonText: {
      color: themeColors.primary.default,
      fontSize: 14,
      ...fontStyles.normal,
    },
    headerStyle: {
      backgroundColor: themeColors.background.default,
      shadowColor: importedColors.transparent,
      elevation: 0,
    },
  });
  function navigationPop() {
    navigation.pop();
  }
  const rightAction = route.params?.dispatch;
  const editMode = route.params?.editMode === 'edit';
  const addMode = route.params?.mode === 'add';
  return {
    title,
    headerTitleStyle: innerStyles.headerTitleStyle,
    headerLeft: () => (
      <TouchableOpacity
        onPress={navigationPop}
        style={styles.backButton}
        testID={'edit-contact-back-button'}
      >
        <IonicIcon
          name={Device.isAndroid() ? 'md-arrow-back' : 'ios-arrow-back'}
          size={Device.isAndroid() ? 24 : 28}
          style={innerStyles.headerIcon}
        />
      </TouchableOpacity>
    ),
    headerRight: () =>
      !addMode ? (
        <TouchableOpacity
          onPress={rightAction}
          style={styles.backButton}
          {...generateTestId(Platform, CONTACT_EDIT_BUTTON)}
        >
          <Text style={innerStyles.headerButtonText}>
            {editMode
              ? strings('address_book.edit')
              : strings('address_book.cancel')}
          </Text>
        </TouchableOpacity>
      ) : (
        <View />
      ),
    headerStyle: innerStyles.headerStyle,
    headerTintColor: themeColors.primary.default,
  };
}

/**
 * Function that returns the navigation options
 * This is used by payment request view showing close and back buttons
 *
 * @param {string} title - Title in string format
 * @param {Object} navigation - Navigation object required to push new views
 * @returns {Object} - Corresponding navbar options containing title, headerLeft and headerRight
 */
export function getPaymentRequestOptionsTitle(
  title,
  navigation,
  route,
  themeColors,
) {
  const goBack = route.params?.dispatch;
  const innerStyles = StyleSheet.create({
    headerTitleStyle: {
      fontSize: 20,
      color: themeColors.text.default,
      ...fontStyles.normal,
    },
    headerIcon: {
      color: themeColors.primary.default,
    },
    headerStyle: {
      backgroundColor: themeColors.background.default,
      shadowColor: importedColors.transparent,
      elevation: 0,
    },
  });

  return {
    title,
    headerTitleStyle: innerStyles.headerTitleStyle,
    headerLeft: () =>
      goBack ? (
        // eslint-disable-next-line react/jsx-no-bind
        <TouchableOpacity
          onPress={goBack}
          style={styles.backButton}
          {...generateTestId(Platform, REQUEST_SEARCH_RESULTS_BACK_BUTTON)}
        >
          <IonicIcon
            name={Device.isAndroid() ? 'md-arrow-back' : 'ios-arrow-back'}
            size={Device.isAndroid() ? 24 : 28}
            style={innerStyles.headerIcon}
          />
        </TouchableOpacity>
      ) : (
        <View />
      ),
    headerRight: () => (
      // eslint-disable-next-line react/jsx-no-bind
      <TouchableOpacity
        onPress={() => navigation.pop()}
        style={styles.closeButton}
      >
        <IonicIcon
          name={'ios-close'}
          size={38}
          style={[innerStyles.headerIcon, styles.backIconIOS]}
        />
      </TouchableOpacity>
    ),
    headerStyle: innerStyles.headerStyle,
    headerTintColor: themeColors.primary.default,
  };
}

/**
 * Function that returns the navigation options
 * This is used by payment request view showing close button
 *
 * @returns {Object} - Corresponding navbar options containing title, and headerRight
 */
export function getPaymentRequestSuccessOptionsTitle(navigation, themeColors) {
  const innerStyles = StyleSheet.create({
    headerStyle: {
      backgroundColor: themeColors.background.default,
      shadowColor: importedColors.transparent,
      elevation: 0,
    },
    headerIcon: {
      color: themeColors.primary.default,
    },
  });

  return {
    headerStyle: innerStyles.headerStyle,
    title: null,
    headerLeft: () => <View />,
    headerRight: () => (
      <TouchableOpacity
        // eslint-disable-next-line react/jsx-no-bind
        onPress={() => navigation.pop()}
        style={styles.closeButton}
        {...generateTestId(Platform, PAYMENT_REQUEST_CLOSE_BUTTON)}
      >
        <IonicIcon
          name="ios-close"
          size={38}
          style={[innerStyles.headerIcon, styles.backIconIOS]}
        />
      </TouchableOpacity>
    ),
    headerTintColor: themeColors.primary.default,
  };
}

/**
 * Function that returns the navigation options
 * This is used by views that confirms transactions, showing current network
 *
 * @param {string} title - Title in string format
 * @returns {Object} - Corresponding navbar options containing title and headerTitleStyle
 */
export function getTransactionOptionsTitle(
  _title,
  navigation,
  route,
  themeColors,
) {
  const innerStyles = StyleSheet.create({
    headerStyle: {
      backgroundColor: themeColors.background.default,
      shadowColor: importedColors.transparent,
      elevation: 0,
    },
    headerButtonText: {
      color: themeColors.primary.default,
      fontSize: 14,
      ...fontStyles.normal,
    },
  });
  const transactionMode = route.params?.mode ?? '';
  const { name } = route;
  const leftText =
    transactionMode === 'edit'
      ? strings('transaction.cancel')
      : strings('transaction.edit');
  const disableModeChange = route.params?.disableModeChange;
  const modeChange = route.params?.dispatch;
  const leftAction = () => modeChange('edit');
  const rightAction = () => navigation.pop();
  const rightText = strings('transaction.cancel');
  const title = transactionMode === 'edit' ? 'transaction.edit' : _title;

  return {
    headerTitle: () => <NavbarTitle title={title} disableNetwork />,
    headerLeft: () =>
      transactionMode !== 'edit' ? (
        <TouchableOpacity
          disabled={disableModeChange}
          // eslint-disable-next-line react/jsx-no-bind
          onPress={leftAction}
          style={styles.closeButton}
          testID={'confirm-txn-edit-button'}
        >
          <Text
            style={
              disableModeChange
                ? [innerStyles.headerButtonText, styles.disabled]
                : innerStyles.headerButtonText
            }
          >
            {leftText}
          </Text>
        </TouchableOpacity>
      ) : (
        <View />
      ),
    headerRight: () =>
      name === 'Send' ? (
        // eslint-disable-next-line react/jsx-no-bind
        <TouchableOpacity
          onPress={rightAction}
          style={styles.closeButton}
          testID={'send-back-button'}
        >
          <Text style={innerStyles.headerButtonText}>{rightText}</Text>
        </TouchableOpacity>
      ) : (
        <View />
      ),
    headerStyle: innerStyles.headerStyle,
    headerTintColor: themeColors.primary.default,
  };
}

export function getApproveNavbar(title) {
  return {
    headerTitle: () => <NavbarTitle title={title} disableNetwork />,
    headerLeft: () => <View />,
    headerRight: () => <View />,
  };
}

/**
 * Function that returns the navigation options
 * This is used by views in send flow
 *
 * @param {string} title - Title in string format
 * @returns {Object} - Corresponding navbar options containing title and headerTitleStyle
 */
export function getSendFlowTitle(title, navigation, route, themeColors) {
  const innerStyles = StyleSheet.create({
    headerButtonText: {
      color: themeColors.primary.default,
      fontSize: 14,
      ...fontStyles.normal,
    },
    headerStyle: {
      backgroundColor: themeColors.background.default,
      shadowColor: importedColors.transparent,
      elevation: 0,
    },
  });
  const rightAction = () => {
    const providerType = route?.params?.providerType ?? '';
    trackEventWithParameters(MetaMetricsEvents.SEND_FLOW_CANCEL, {
      view: title.split('.')[1],
      network: providerType,
    });
    navigation.dangerouslyGetParent()?.pop();
  };
  const leftAction = () => navigation.pop();

  const canGoBack =
    title !== 'send.send_to' && !route?.params?.isPaymentRequest;

  const titleToRender = title;

  return {
    headerTitle: () => <NavbarTitle title={titleToRender} disableNetwork />,
    headerRight: () => (
      // eslint-disable-next-line react/jsx-no-bind
      <TouchableOpacity
        onPress={rightAction}
        style={styles.closeButton}
        {...generateTestId(Platform, SEND_CANCEL_BUTTON)}
      >
        <Text style={innerStyles.headerButtonText}>
          {strings('transaction.cancel')}
        </Text>
      </TouchableOpacity>
    ),
    headerLeft: () =>
      canGoBack ? (
        // eslint-disable-next-line react/jsx-no-bind
        <TouchableOpacity onPress={leftAction} style={styles.closeButton}>
          <Text style={innerStyles.headerButtonText}>
            {strings('transaction.back')}
          </Text>
        </TouchableOpacity>
      ) : (
        <View />
      ),
    headerStyle: innerStyles.headerStyle,
  };
}

/**
 * Function that returns the navigation options
 * This is used by views that will show our custom navbar
 * which contains accounts icon, Title or MetaMask Logo and current network, and settings icon
 *
 * @param {Object} navigation - Navigation object required to push new views
 * @returns {Object} - Corresponding navbar options containing headerTitle, headerLeft and headerRight
 */
export function getBrowserViewNavbarOptions(
  route,
  themeColors,
  rightButtonAnalyticsEvent,
) {
  const innerStyles = StyleSheet.create({
    headerStyle: {
      backgroundColor: themeColors.background.default,
      shadowColor: importedColors.transparent,
      elevation: 0,
      borderBottomWidth: 0.5,
      borderColor: themeColors.border.muted,
    },
    headerIcon: {
      color: themeColors.primary.default,
    },
  });

  const url = route.params?.url ?? '';

  const handleUrlPress = () => route.params?.showUrlModal?.();

  const handleAccountRightButtonPress = (permittedAccounts, currentUrl) => {
    rightButtonAnalyticsEvent(permittedAccounts, currentUrl);
    route.params?.setAccountsPermissionsVisible();
  };

  const connectedAccounts = route.params?.connectedAccounts;

  return {
    gestureEnabled: false,
    headerTitleAlign: 'left',
    headerTitle: () => (
      <BrowserUrlBar url={url} route={route} onPress={handleUrlPress} />
    ),
    headerRight: () => (
      <AccountRightButton
        selectedAddress={connectedAccounts?.[0]}
        isNetworkVisible
        onPress={handleAccountRightButtonPress}
      />
    ),
    headerStyle: innerStyles.headerStyle,
  };
}

/**
 * Function that returns the navigation options
 * for our modals
 *
 * @param {string} title - Title in string format
 * @returns {Object} - Corresponding navbar options containing headerTitle
 */
export function getModalNavbarOptions(title) {
  return {
    headerTitle: () => <ModalNavbarTitle title={title} />,
  };
}

/**
 * Function that returns the navigation options
 * for our onboarding screens,
 * which is just the metamask log and the Back button
 *
 * @returns {Object} - Corresponding navbar options containing headerTitle, headerTitle and headerTitle
 */
export function getOnboardingNavbarOptions(
  route,
  { headerLeft } = {},
  themeColors,
) {
  const headerLeftHide = headerLeft || route.params?.headerLeft;
  const innerStyles = StyleSheet.create({
    headerStyle: {
      backgroundColor: themeColors.background.default,
      shadowColor: importedColors.transparent,
      elevation: 0,
    },
    metamaskName: {
      width: 122,
      height: 15,
      tintColor: themeColors.text.default,
    },
  });

  return {
    headerStyle: innerStyles.headerStyle,
    headerTitle: () => (
      <View style={styles.metamaskNameTransparentWrapper}>
        <Image
          source={metamask_name}
          style={innerStyles.metamaskName}
          resizeMethod={'auto'}
        />
      </View>
    ),
    headerBackTitle: strings('navigation.back'),
    headerRight: () => <View />,
    headerLeft: headerLeftHide,
    headerTintColor: themeColors.primary.default,
  };
}

/**
 * Function that returns a transparent navigation options for our onboarding screens.
 *
 * @returns {Object} - Corresponding navbar options containing headerTitle
 */
export function getTransparentOnboardingNavbarOptions(themeColors) {
  const innerStyles = StyleSheet.create({
    headerStyle: {
      backgroundColor: themeColors.background.default,
      shadowColor: importedColors.transparent,
      elevation: 0,
    },
    metamaskName: {
      width: 122,
      height: 15,
      tintColor: themeColors.text.default,
    },
  });
  return {
    headerTitle: () => (
      <View style={styles.metamaskNameTransparentWrapper}>
        <Image
          source={metamask_name}
          style={innerStyles.metamaskName}
          resizeMethod={'auto'}
        />
      </View>
    ),
    headerLeft: () => <View />,
    headerRight: () => <View />,
    headerStyle: innerStyles.headerStyle,
  };
}

/**
 * Function that returns a transparent navigation options for our onboarding screens.
 *
 * @returns {Object} - Corresponding navbar options containing headerTitle and a back button
 */
export function getTransparentBackOnboardingNavbarOptions(themeColors) {
  const innerStyles = StyleSheet.create({
    headerStyle: {
      backgroundColor: themeColors.background.default,
      shadowColor: importedColors.transparent,
      elevation: 0,
    },
    metamaskName: {
      width: 122,
      height: 15,
      tintColor: themeColors.text.default,
    },
  });
  return {
    headerTitle: () => (
      <View style={styles.metamaskNameTransparentWrapper}>
        <Image
          source={metamask_name}
          style={innerStyles.metamaskName}
          resizeMethod={'auto'}
        />
      </View>
    ),
    headerBackTitle: strings('navigation.back'),
    headerRight: () => <View />,
    headerStyle: innerStyles.headerStyle,
    headerTintColor: themeColors.primary.default,
  };
}

/**
 * Function that returns the navigation options
 * for our metric opt-in screen
 *
 * @returns {Object} - Corresponding navbar options containing headerLeft
 */
export function getOptinMetricsNavbarOptions(themeColors) {
  const innerStyles = StyleSheet.create({
    headerStyle: {
      backgroundColor: themeColors.background.default,
      shadowColor: importedColors.transparent,
      elevation: 0,
      height: 100,
    },
    metamaskName: {
      width: 122,
      height: 15,
      tintColor: themeColors.text.default,
    },
  });

  return {
    headerStyle: innerStyles.headerStyle,
    title: null,
    headerLeft: () => (
      <View style={styles.optinHeaderLeft}>
        <View style={styles.metamaskNameWrapper}>
          <Image
            source={metamask_fox}
            style={styles.metamaskFox}
            resizeMethod={'auto'}
          />
        </View>
        <View style={styles.metamaskNameWrapper}>
          <Image
            source={metamask_name}
            style={innerStyles.metamaskName}
            resizeMethod={'auto'}
          />
        </View>
      </View>
    ),
    headerTintColor: themeColors.primary.default,
  };
}
/**
 * Function that returns the navigation options
 * for our closable screens,
 *
 * @returns {Object} - Corresponding navbar options containing headerTitle, headerTitle and headerTitle
 */
export function getClosableNavigationOptions(
  title,
  backButtonText,
  navigation,
  themeColors,
) {
  const innerStyles = StyleSheet.create({
    headerButtonText: {
      color: themeColors.primary.default,
      fontSize: 14,
      ...fontStyles.normal,
    },
    headerIcon: {
      color: themeColors.primary.default,
    },
    headerStyle: {
      backgroundColor: themeColors.background.default,
      shadowColor: importedColors.transparent,
      elevation: 0,
    },
    headerTitleStyle: {
      fontSize: 20,
      ...fontStyles.normal,
      color: themeColors.text.default,
    },
  });
  function navigationPop() {
    navigation.pop();
  }
  return {
    title,
    headerTitleStyle: innerStyles.headerTitleStyle,
    headerLeft: () =>
      Device.isIos() ? (
        <TouchableOpacity
          onPress={navigationPop}
          style={styles.closeButton}
          testID={'nav-ios-back'}
        >
          <Text style={innerStyles.headerButtonText}>{backButtonText}</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          onPress={navigationPop}
          style={styles.backButton}
          {...generateTestId(Platform, NAV_ANDROID_BACK_BUTTON)}
        >
          <IonicIcon
            name={'md-arrow-back'}
            size={24}
            style={innerStyles.headerIcon}
          />
        </TouchableOpacity>
      ),
    headerStyle: innerStyles.headerStyle,
    headerTintColor: themeColors.primary.default,
  };
}

/**
 * Function that returns the navigation options
 * for our closable screens,
 *
 * @returns {Object} - Corresponding navbar options containing headerTitle, headerTitle and headerTitle
 */
export function getOfflineModalNavbar() {
  return {
    headerShown: false,
  };
}

/**
 * Function that returns the navigation options
 * for our wallet screen,
 *
 * @returns {Object} - Corresponding navbar options containing headerTitle, headerTitle and headerTitle
 */
export function getWalletNavbarOptions(
  networkName,
  networkImageSource,
  onPressTitle,
  navigation,
  drawerRef,
  themeColors,
) {
  const innerStyles = StyleSheet.create({
    headerStyle: {
      backgroundColor: themeColors.background.default,
      shadowColor: importedColors.transparent,
      elevation: 0,
    },
    headerIcon: {
      color: themeColors.primary.default,
    },
    headerTitle: {
      justifyContent: 'center',
      marginTop: 5,
      flex: 1,
    },
  });

  const onScanSuccess = (data, content) => {
    if (data.private_key) {
      Alert.alert(
        strings('wallet.private_key_detected'),
        strings('wallet.do_you_want_to_import_this_account'),
        [
          {
            text: strings('wallet.cancel'),
            onPress: () => false,
            style: 'cancel',
          },
          {
            text: strings('wallet.yes'),
            onPress: async () => {
              try {
                await importAccountFromPrivateKey(data.private_key);
                navigation.navigate('ImportPrivateKeyView', {
                  screen: 'ImportPrivateKeySuccess',
                });
              } catch (e) {
                Alert.alert(
                  strings('import_private_key.error_title'),
                  strings('import_private_key.error_message'),
                );
              }
            },
          },
        ],
        { cancelable: false },
      );
    } else if (data.seed) {
      Alert.alert(
        strings('wallet.error'),
        strings('wallet.logout_to_import_seed'),
      );
    } else {
      setTimeout(() => {
        DeeplinkManager.parse(content, {
          origin: AppConstants.DEEPLINKS.ORIGIN_QR_CODE,
        });
      }, 500);
    }
  };

  function openDrawer() {
    drawerRef.current?.showDrawer?.();
    trackEvent(MetaMetricsEvents.COMMON_TAPS_HAMBURGER_MENU);
  }

  function openQRScanner() {
    navigation.navigate('QRScanner', {
      onScanSuccess,
    });
    trackEvent(MetaMetricsEvents.WALLET_QR_SCANNER);
  }

  return {
    headerTitle: () => (
      <View style={innerStyles.headerTitle}>
        <PickerNetwork
          label={networkName}
          imageSource={networkImageSource}
          onPress={onPressTitle}
          {...generateTestId(Platform, NAVBAR_NETWORK_BUTTON)}
        />
      </View>
    ),
    headerLeft: () => (
      <TouchableOpacity
        onPress={openDrawer}
        style={styles.backButton}
        {...generateTestId(Platform, HAMBURGER_MENU_BUTTON)}
      >
        <IonicIcon
          {...generateTestId(Platform, WALLET_VIEW_BURGER_ICON_ID)}
          name={Device.isAndroid() ? 'md-menu' : 'ios-menu'}
          size={Device.isAndroid() ? 24 : 28}
          style={innerStyles.headerIcon}
        />
      </TouchableOpacity>
    ),
    headerRight: () => (
      <TouchableOpacity
        style={styles.infoButton}
        // eslint-disable-next-line
        onPress={openQRScanner}
      >
        <AntIcon name="scan1" size={28} style={innerStyles.headerIcon} />
      </TouchableOpacity>
    ),
    headerStyle: innerStyles.headerStyle,
    headerTintColor: themeColors.primary.default,
  };
}

/**
 * Function that returns the navigation options containing title and network indicator
 *
 * @param {string} title - Title in string format
 * @param {boolean} translate - Boolean that specifies if the title needs translation
 * @param {Object} navigation - Navigation object required to push new views
 * @param {Object} themeColors - Colors from theme
 * @param {Function} onRightPress - Callback that determines if right button exists
 * @param {boolean} disableNetwork - Boolean that determines if network is accessible from navbar
 * @returns {Object} - Corresponding navbar options containing headerTitle and headerTitle
 */
export function getNetworkNavbarOptions(
  title,
  translate,
  navigation,
  themeColors,
  onRightPress = undefined,
  disableNetwork = false,
) {
  const innerStyles = StyleSheet.create({
    headerStyle: {
      backgroundColor: themeColors.background.default,
      shadowColor: importedColors.transparent,
      elevation: 0,
    },
    headerIcon: {
      color: themeColors.primary.default,
    },
  });
  return {
    headerTitle: () => (
      <NavbarTitle
        disableNetwork={disableNetwork}
        title={title}
        translate={translate}
      />
    ),
    headerLeft: () => (
      // eslint-disable-next-line react/jsx-no-bind
      <TouchableOpacity
        onPress={() => navigation.pop()}
        style={styles.backButton}
        {...generateTestId(Platform, ASSET_BACK_BUTTON)}
      >
        <IonicIcon
          name={Device.isAndroid() ? 'md-arrow-back' : 'ios-arrow-back'}
          size={Device.isAndroid() ? 24 : 28}
          style={innerStyles.headerIcon}
        />
      </TouchableOpacity>
    ),
    headerRight: onRightPress
      ? () => (
          <TouchableOpacity style={styles.backButton} onPress={onRightPress}>
            <MaterialCommunityIcon
              name={'dots-horizontal'}
              size={28}
              style={innerStyles.headerIcon}
            />
          </TouchableOpacity>
          // eslint-disable-next-line no-mixed-spaces-and-tabs
        )
      : () => <View />,
    headerStyle: innerStyles.headerStyle,
  };
}

/**
 * Function that returns the navigation options containing title and network indicator
 *
 * @returns {Object} - Corresponding navbar options containing headerTitle and headerTitle
 */
export function getWebviewNavbar(navigation, route, themeColors) {
  const innerStyles = StyleSheet.create({
    headerTitleStyle: {
      fontSize: 20,
      color: themeColors.text.default,
      textAlign: 'center',
      ...fontStyles.normal,
      alignItems: 'center',
    },
    headerStyle: {
      backgroundColor: themeColors.background.default,
      shadowColor: importedColors.transparent,
      elevation: 0,
    },
    headerIcon: {
      color: themeColors.primary.default,
    },
  });

  const title = route.params?.title ?? '';
  const share = route.params?.dispatch;
  return {
    headerTitle: () => (
      <Text style={innerStyles.headerTitleStyle}>{title}</Text>
    ),
    headerLeft: () =>
      Device.isAndroid() ? (
        // eslint-disable-next-line react/jsx-no-bind
        <TouchableOpacity
          onPress={() => navigation.pop()}
          style={styles.backButton}
        >
          <IonicIcon
            name={'md-arrow-back'}
            size={24}
            style={innerStyles.headerIcon}
          />
        </TouchableOpacity>
      ) : (
        // eslint-disable-next-line react/jsx-no-bind
        <TouchableOpacity
          onPress={() => navigation.pop()}
          style={styles.backButton}
        >
          <IonicIcon
            name="ios-close"
            size={38}
            style={[innerStyles.headerIcon, styles.backIconIOS]}
          />
        </TouchableOpacity>
      ),
    headerRight: () =>
      Device.isAndroid() ? (
        <TouchableOpacity onPress={share} style={styles.backButton}>
          <MaterialCommunityIcon
            name="share-variant"
            size={24}
            style={innerStyles.headerIcon}
          />
        </TouchableOpacity>
      ) : (
        <TouchableOpacity onPress={share} style={styles.backButton}>
          <EvilIcons
            name="share-apple"
            size={32}
            style={[innerStyles.headerIcon, styles.shareIconIOS]}
          />
        </TouchableOpacity>
      ),
    headerStyle: innerStyles.headerStyle,
  };
}

export function getPaymentSelectorMethodNavbar(navigation, onPop, themeColors) {
  const innerStyles = StyleSheet.create({
    headerButtonText: {
      color: themeColors.primary.default,
    },
    headerTitleStyle: {
      fontSize: 20,
      color: themeColors.text.default,
      textAlign: 'center',
      ...fontStyles.normal,
      alignItems: 'center',
    },
    headerStyle: {
      backgroundColor: themeColors.background.default,
      shadowColor: importedColors.transparent,
      elevation: 0,
    },
  });
  return {
    headerTitle: () => (
      <Text style={innerStyles.headerTitleStyle}>
        {strings('fiat_on_ramp.purchase_method')}
      </Text>
    ),
    headerLeft: () => <View />,
    headerRight: () => (
      // eslint-disable-next-line react/jsx-no-bind
      <TouchableOpacity
        onPress={() => {
          navigation.dangerouslyGetParent()?.pop();
          onPop?.();
        }}
        style={styles.closeButton}
      >
        <Text style={innerStyles.headerButtonText}>
          {strings('navigation.cancel')}
        </Text>
      </TouchableOpacity>
    ),
    headerStyle: innerStyles.headerStyle,
  };
}

export function getPaymentMethodApplePayNavbar(
  navigation,
  onPop,
  onExit,
  themeColors,
) {
  const innerStyles = StyleSheet.create({
    headerTitleStyle: {
      fontSize: 20,
      color: themeColors.text.default,
      ...fontStyles.normal,
    },
    headerStyle: {
      backgroundColor: themeColors.background.default,
      shadowColor: importedColors.transparent,
      elevation: 0,
    },
    headerButtonText: {
      color: themeColors.primary.default,
    },
    headerIcon: {
      color: themeColors.primary.default,
    },
  });
  return {
    title: strings('fiat_on_ramp.amount_to_buy'),
    headerTitleStyle: innerStyles.headerTitleStyle,
    headerRight: () => (
      // eslint-disable-next-line react/jsx-no-bind
      <TouchableOpacity
        onPress={() => {
          navigation.dangerouslyGetParent()?.pop();
          onExit?.();
        }}
        style={styles.closeButton}
      >
        <Text style={innerStyles.headerButtonText}>
          {strings('navigation.cancel')}
        </Text>
      </TouchableOpacity>
    ),
    headerLeft: () =>
      Device.isAndroid() ? (
        // eslint-disable-next-line react/jsx-no-bind
        <TouchableOpacity
          onPress={() => {
            navigation.pop();
            onPop?.();
          }}
          style={styles.backButton}
        >
          <IonicIcon
            name={'md-arrow-back'}
            size={24}
            style={innerStyles.headerIcon}
          />
        </TouchableOpacity>
      ) : (
        // eslint-disable-next-line react/jsx-no-bind
        <TouchableOpacity
          onPress={() => {
            navigation.pop();
            onPop?.();
          }}
          style={styles.closeButton}
        >
          <Text style={innerStyles.headerButtonText}>
            {strings('navigation.back')}
          </Text>
        </TouchableOpacity>
      ),
    headerStyle: innerStyles.headerStyle,
  };
}

export function getTransakWebviewNavbar(navigation, route, onPop, themeColors) {
  const innerStyles = StyleSheet.create({
    headerTitleStyle: {
      fontSize: 20,
      color: themeColors.text.default,
      ...fontStyles.normal,
    },
    headerStyle: {
      backgroundColor: themeColors.background.default,
      shadowColor: importedColors.transparent,
      elevation: 0,
    },
    headerIcon: {
      color: themeColors.primary.default,
    },
  });

  const title = route.params?.title ?? '';
  return {
    title,
    headerTitleStyle: innerStyles.headerTitleStyle,
    headerLeft: () =>
      Device.isAndroid() ? (
        // eslint-disable-next-line react/jsx-no-bind
        <TouchableOpacity
          onPress={() => {
            navigation.pop();
            onPop?.();
          }}
          style={styles.backButton}
        >
          <IonicIcon
            name={'md-arrow-back'}
            size={24}
            style={innerStyles.headerIcon}
          />
        </TouchableOpacity>
      ) : (
        // eslint-disable-next-line react/jsx-no-bind
        <TouchableOpacity
          onPress={() => {
            navigation.pop();
            onPop?.();
          }}
          style={styles.backButton}
        >
          <IonicIcon
            name="ios-close"
            size={38}
            style={[innerStyles.headerIcon, styles.backIconIOS]}
          />
        </TouchableOpacity>
      ),
    headerStyle: innerStyles.headerStyle,
    headerTintColor: themeColors.primary.default,
  };
}

export function getSwapsAmountNavbar(navigation, route, themeColors) {
  const innerStyles = StyleSheet.create({
    headerButtonText: {
      color: themeColors.primary.default,
      fontSize: 14,
      ...fontStyles.normal,
    },
    headerStyle: {
      backgroundColor: themeColors.background.default,
      shadowColor: importedColors.transparent,
      elevation: 0,
    },
  });
  const title = route.params?.title ?? 'Swap';
  return {
    headerTitle: () => (
      <NavbarTitle title={title} disableNetwork translate={false} />
    ),
    headerLeft: () => <View />,
    headerRight: () => (
      // eslint-disable-next-line react/jsx-no-bind
      <TouchableOpacity
        onPress={() => navigation.dangerouslyGetParent()?.pop()}
        style={styles.closeButton}
      >
        <Text style={innerStyles.headerButtonText}>
          {strings('navigation.cancel')}
        </Text>
      </TouchableOpacity>
    ),
    headerStyle: innerStyles.headerStyle,
  };
}
export function getSwapsQuotesNavbar(navigation, route, themeColors) {
  const innerStyles = StyleSheet.create({
    headerButtonText: {
      color: themeColors.primary.default,
      fontSize: 14,
      ...fontStyles.normal,
    },
    headerIcon: {
      color: themeColors.primary.default,
    },
    headerStyle: {
      backgroundColor: themeColors.background.default,
      shadowColor: importedColors.transparent,
      elevation: 0,
    },
  });
  const title = route.params?.title ?? 'Swap';
  const leftActionText = route.params?.leftAction ?? strings('navigation.back');

  const leftAction = () => {
    const trade = route.params?.requestedTrade;
    const selectedQuote = route.params?.selectedQuote;
    const quoteBegin = route.params?.quoteBegin;
    if (!selectedQuote) {
      InteractionManager.runAfterInteractions(() => {
        Analytics.trackEventWithParameters(
          MetaMetricsEvents.QUOTES_REQUEST_CANCELLED,
          {
            ...trade,
            responseTime: new Date().getTime() - quoteBegin,
          },
        );
      });
    }
    navigation.pop();
  };

  const rightAction = () => {
    const trade = route.params?.requestedTrade;
    const selectedQuote = route.params?.selectedQuote;
    const quoteBegin = route.params?.quoteBegin;
    if (!selectedQuote) {
      InteractionManager.runAfterInteractions(() => {
        Analytics.trackEventWithParameters(
          MetaMetricsEvents.QUOTES_REQUEST_CANCELLED,
          {
            ...trade,
            responseTime: new Date().getTime() - quoteBegin,
          },
        );
      });
    }
    navigation.dangerouslyGetParent()?.pop();
  };

  return {
    headerTitle: () => (
      <NavbarTitle title={title} disableNetwork translate={false} />
    ),
    headerLeft: () =>
      Device.isAndroid() ? (
        // eslint-disable-next-line react/jsx-no-bind
        <TouchableOpacity onPress={leftAction} style={styles.backButton}>
          <IonicIcon
            name={'md-arrow-back'}
            size={24}
            style={innerStyles.headerIcon}
          />
        </TouchableOpacity>
      ) : (
        // eslint-disable-next-line react/jsx-no-bind
        <TouchableOpacity onPress={leftAction} style={styles.closeButton}>
          <Text style={innerStyles.headerButtonText}>{leftActionText}</Text>
        </TouchableOpacity>
      ),
    headerRight: () => (
      // eslint-disable-next-line react/jsx-no-bind
      <TouchableOpacity onPress={rightAction} style={styles.closeButton}>
        <Text style={innerStyles.headerButtonText}>
          {strings('navigation.cancel')}
        </Text>
      </TouchableOpacity>
    ),
    headerStyle: innerStyles.headerStyle,
  };
}

export function getFiatOnRampAggNavbar(
  navigation,
  { title, showBack = true } = {},
  themeColors,
  onCancel,
) {
  const innerStyles = StyleSheet.create({
    headerButtonText: {
      color: themeColors.primary.default,
      fontSize: scale(11),
      ...fontStyles.normal,
    },
    headerStyle: {
      backgroundColor: themeColors.background.default,
      shadowColor: importedColors.transparent,
      elevation: 0,
    },
    headerTitleStyle: {
      fontSize: 18,
      ...fontStyles.normal,
      color: themeColors.text.default,
      ...(!showBack && { textAlign: 'center' }),
    },
  });
  const headerTitle = title ?? 'Buy';

  const leftActionText = strings('navigation.back');

  const leftAction = () => navigation.pop();

  const navigationCancelText = strings('navigation.cancel');

  return {
    headerTitle: () => (
      <NavbarTitle title={headerTitle} disableNetwork translate={false} />
    ),
    headerLeft: () => {
      if (!showBack) return <View />;

      return Device.isAndroid() ? (
        <TouchableOpacity
          onPress={leftAction}
          style={styles.backButton}
          accessibilityRole="button"
        >
          <IonicIcon
            name={'md-arrow-back'}
            size={24}
            style={innerStyles.headerIcon}
          />
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          onPress={leftAction}
          style={styles.closeButton}
          accessibilityRole="button"
        >
          <Text style={innerStyles.headerButtonText}>{leftActionText}</Text>
        </TouchableOpacity>
      );
    },
    headerRight: () => (
      <TouchableOpacity
        onPress={() => {
          navigation.dangerouslyGetParent()?.pop();
          onCancel?.();
        }}
        style={styles.closeButton}
        accessibilityRole="button"
      >
        <Text style={innerStyles.headerButtonText}>{navigationCancelText}</Text>
      </TouchableOpacity>
    ),
    headerStyle: innerStyles.headerStyle,
    headerTitleStyle: innerStyles.headerTitleStyle,
  };
}
