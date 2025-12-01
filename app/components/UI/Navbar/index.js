/* eslint-disable react/display-name */
import React from 'react';
import NavbarTitle from '../NavbarTitle';
import ModalNavbarTitle from '../ModalNavbarTitle';
import AccountRightButton from '../AccountRightButton';
import {
  Alert,
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { colors as importedColors, fontStyles } from '../../../styles/common';
import IonicIcon from 'react-native-vector-icons/Ionicons';
import EvilIcons from 'react-native-vector-icons/EvilIcons';
import MaterialCommunityIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import { scale } from 'react-native-size-matters';
import { strings } from '../../../../locales/i18n';
import AppConstants from '../../../core/AppConstants';
import SharedDeeplinkManager from '../../../core/DeeplinkManager/SharedDeeplinkManager';
import { MetaMetrics, MetaMetricsEvents } from '../../../core/Analytics';
import { importAccountFromPrivateKey } from '../../../util/importAccountFromPrivateKey';
import { isNotificationsFeatureEnabled } from '../../../util/notifications';
import Device from '../../../util/device';
import generateTestId from '../../../../wdio/utils/generateTestId';
import { NAV_ANDROID_BACK_BUTTON } from '../../../../wdio/screen-objects/testIDs/Screens/NetworksScreen.testids';
import { BACK_BUTTON_SIMPLE_WEBVIEW } from '../../../../wdio/screen-objects/testIDs/Components/SimpleWebView.testIds';
import Routes from '../../../constants/navigation/Routes';

import {
  default as MorphText,
  TextVariant,
  TextColor,
} from '../../../component-library/components/Texts/Text';
import { CommonSelectorsIDs } from '../../../../e2e/selectors/Common.selectors';
import { WalletViewSelectorsIDs } from '../../../../e2e/selectors/wallet/WalletView.selectors';
import { NetworksViewSelectorsIDs } from '../../../../e2e/selectors/Settings/NetworksView.selectors';
import { SendLinkViewSelectorsIDs } from '../../../../e2e/selectors/Receive/SendLinkView.selectors';
import { SendViewSelectorsIDs } from '../../../../e2e/selectors/SendFlow/SendView.selectors';
import { getBlockaidTransactionMetricsParams } from '../../../util/blockaid';
import Icon, {
  IconName,
  IconSize,
  IconColor,
} from '../../../component-library/components/Icons/Icon';
import { AddContactViewSelectorsIDs } from '../../../../e2e/selectors/Settings/Contacts/AddContactView.selectors';
import { SettingsViewSelectorsIDs } from '../../../../e2e/selectors/Settings/SettingsView.selectors';
import HeaderBase, {
  HeaderBaseVariant,
} from '../../../component-library/components/HeaderBase';
import BottomSheetHeader from '../../../component-library/components/BottomSheets/BottomSheetHeader';
import AddressCopy from '../AddressCopy';
import PickerAccount from '../../../component-library/components/Pickers/PickerAccount';
import { createAccountSelectorNavDetails } from '../../../components/Views/AccountSelector';
import { RequestPaymentViewSelectors } from '../../../../e2e/selectors/Receive/RequestPaymentView.selectors';
import { MetricsEventBuilder } from '../../../core/Analytics/MetricsEventBuilder';

import {
  BadgeStatus,
  BadgeStatusStatus,
  BadgeWrapperPosition,
  BadgeWrapperPositionAnchorShape,
  BadgeWrapper,
  ButtonIcon,
  ButtonIconSize,
  IconColor as MMDSIconColor,
} from '@metamask/design-system-react-native';

import { withMetaMetrics } from '../Stake/utils/metaMetrics/withMetaMetrics';
import { BridgeViewMode } from '../Bridge/types';
import CardButton from '../Card/components/CardButton';

const trackEvent = (event, params = {}) => {
  MetaMetrics.getInstance().trackEvent(event);
};

const styles = StyleSheet.create({
  hitSlop: {
    top: 15,
    bottom: 15,
    left: 15,
    right: 15,
  },
  metamaskName: {
    width: 70,
    height: 35,
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
  disabled: {
    opacity: 0.3,
  },
  rightElementContainer: {
    marginRight: 12,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
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
  leftElementContainer: {
    marginLeft: 16,
  },
  headerLeftButton: {
    marginHorizontal: 16,
  },
  headerRightButton: {
    marginHorizontal: 16,
  },
  iconButton: {
    marginHorizontal: 24,
  },
  hidden: {
    opacity: 0,
  },
});

const metamask_name = require('../../../images/branding/metamask-name.png'); // eslint-disable-line
const metamask_fox = require('../../../images/branding/fox.png'); // eslint-disable-line
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
  _,
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

  return {
    headerTitle: () => <NavbarTitle title={title} />,
    headerLeft: null,
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
 * @param isFullScreenModal
 * @param themeColors
 * @param {IMetaMetricsEvent} navigationPopEvent
 * @returns {Object} - Corresponding navbar options containing title and headerTitleStyle
 */
export function getNavigationOptionsTitle(
  title,
  navigation,
  isFullScreenModal,
  themeColors,
  navigationPopEvent = null,
) {
  const innerStyles = StyleSheet.create({
    headerStyle: {
      backgroundColor: themeColors.background.default,
      shadowColor: importedColors.transparent,
      elevation: 0,
    },
    accessories: {
      marginHorizontal: 16,
    },
  });

  function navigationPop() {
    if (navigationPopEvent)
      trackEvent(
        MetricsEventBuilder.createEventBuilder(navigationPopEvent).build(),
      );
    navigation.goBack();
  }

  return {
    title,
    headerTitle: <MorphText variant={TextVariant.HeadingMD}>{title}</MorphText>,
    headerRight: () =>
      isFullScreenModal ? (
        <ButtonIcon
          size={ButtonIconSize.Lg}
          iconName={IconName.Close}
          onPress={navigationPop}
          style={innerStyles.accessories}
          testID={NetworksViewSelectorsIDs.CLOSE_ICON}
        />
      ) : null,
    headerLeft: () =>
      isFullScreenModal ? null : (
        <ButtonIcon
          size={ButtonIconSize.Lg}
          iconName={IconName.ArrowLeft}
          onPress={navigationPop}
          style={innerStyles.accessories}
          testID={CommonSelectorsIDs.BACK_ARROW_BUTTON}
        />
      ),
    headerTintColor: themeColors.primary.default,
    ...innerStyles,
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
        testID={CommonSelectorsIDs.EDIT_CONTACT_BACK_BUTTON}
      >
        <IonicIcon
          name={'arrow-back'}
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
          testID={AddContactViewSelectorsIDs.EDIT_BUTTON}
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
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerIcon: {
      color: themeColors.primary.default,
    },
    headerStyle: {
      backgroundColor: themeColors.background.default,
      shadowColor: importedColors.transparent,
      elevation: 0,
    },
    headerCloseButton: {
      marginRight: 16,
    },
  });

  return {
    headerTitleAlign: 'center',
    headerTitle: () => (
      <View>
        <MorphText variant={TextVariant.BodyMDBold}>{title}</MorphText>
      </View>
    ),
    headerLeft: () =>
      goBack ? (
        // eslint-disable-next-line react/jsx-no-bind
        <TouchableOpacity
          onPress={goBack}
          style={styles.backButton}
          testID={RequestPaymentViewSelectors.BACK_BUTTON_ID}
        >
          <IonicIcon
            name={'arrow-back'}
            size={Device.isAndroid() ? 24 : 28}
            style={innerStyles.headerIcon}
          />
        </TouchableOpacity>
      ) : (
        <View />
      ),
    headerRight: () => (
      <ButtonIcon
        iconName={IconName.Close}
        size={ButtonIconSize.Md}
        onPress={() => navigation.pop()}
        style={innerStyles.headerCloseButton}
        testID={RequestPaymentViewSelectors.BACK_BUTTON_ID}
      />
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
        {...generateTestId(
          Platform,
          SendLinkViewSelectorsIDs.CLOSE_SEND_LINK_VIEW_BUTTON,
        )}
      >
        <IonicIcon
          name="close"
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
          testID={CommonSelectorsIDs.CONFIRM_TXN_EDIT_BUTTON}
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
          testID={CommonSelectorsIDs.SEND_BACK_BUTTON}
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
export function getSendFlowTitle({
  title,
  navigation,
  route,
  themeColors,
  resetTransaction,
  transaction,
  disableNetwork = true,
  showSelectedNetwork = false,
  globalChainId = '',
} = {}) {
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
    const additionalTransactionMetricsParams =
      getBlockaidTransactionMetricsParams(transaction);
    trackEvent(
      MetricsEventBuilder.createEventBuilder(MetaMetricsEvents.SEND_FLOW_CANCEL)
        .addProperties({
          view: title.split('.')[1],
          network: providerType,
          ...additionalTransactionMetricsParams,
        })
        .build(),
    );
    resetTransaction();
    navigation.dangerouslyGetParent()?.pop();
  };
  const leftAction = () => navigation.pop();

  const canGoBack =
    title !== 'send.send_to' && !route?.params?.isPaymentRequest;

  const titleToRender = title;

  return {
    headerTitle: () => (
      <NavbarTitle
        title={titleToRender}
        disableNetwork={disableNetwork}
        showSelectedNetwork={showSelectedNetwork}
        networkName={globalChainId}
      />
    ),
    headerRight: () => (
      // eslint-disable-next-line react/jsx-no-bind
      <TouchableOpacity
        onPress={rightAction}
        style={styles.closeButton}
        testID={SendViewSelectorsIDs.SEND_CANCEL_BUTTON}
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
          <Text
            style={innerStyles.headerButtonText}
            testID={SendViewSelectorsIDs.SEND_BACK_BUTTON}
          >
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
  { headerLeft, headerRight },
  themeColors,
  showLogo = true,
) {
  const headerLeftHide =
    headerLeft || route.params?.headerLeft || (() => <View />);
  const headerRightHide =
    headerRight || route.params?.headerRight || (() => <View />);
  const innerStyles = StyleSheet.create({
    headerStyle: {
      backgroundColor: themeColors.background.default,
      shadowColor: importedColors.transparent,
      elevation: 0,
    },
    metamaskName: {
      width: 70,
      height: 35,
      tintColor: themeColors.text.default,
    },
  });

  return {
    headerStyle: innerStyles.headerStyle,
    headerTitle: showLogo
      ? () => (
          <View style={styles.metamaskNameTransparentWrapper}>
            <Image
              source={metamask_name}
              style={innerStyles.metamaskName}
              resizeMethod={'auto'}
            />
          </View>
        )
      : null,
    headerRight: headerRightHide,
    headerLeft: headerLeftHide,
    headerTintColor: themeColors.primary.default,
  };
}

/**
 * Function that returns a transparent navigation options for our onboarding screens.
 *
 * @returns {Object} - Corresponding navbar options containing headerTitle
 * @param {Object} themeColors - The theme colors object
 * @param {string} backgroundColor - The color to overwrite the background color
 * @param {boolean} showLogo - Whether to show the logo
 * @param {string} logoColor - The color to overwrite the logo color
 */
export function getTransparentOnboardingNavbarOptions(
  themeColors,
  backgroundColor = undefined,
  showLogo = true,
  logoColor = undefined,
) {
  const innerStyles = StyleSheet.create({
    headerStyle: {
      backgroundColor: backgroundColor || themeColors.background.default,
      shadowColor: importedColors.transparent,
      elevation: 0,
    },
    metamaskName: {
      width: 70,
      height: 35,
      tintColor: logoColor || themeColors.text.default,
    },
  });
  return {
    headerTitle: () =>
      showLogo ? (
        <View style={styles.metamaskNameTransparentWrapper}>
          <Image
            source={metamask_name}
            style={innerStyles.metamaskName}
            resizeMethod={'auto'}
          />
        </View>
      ) : null,
    headerLeft: () => <View />,
    headerRight: () => <View />,
    headerStyle: innerStyles.headerStyle,
  };
}

/**
 * Function that returns a transparent navigation options for our onboarding screens.
 *
 * @returns {Object} - Corresponding navbar options containing headerTitle and a back button
 * @param {Object} themeColors - The theme colors object
 */
export function getTransparentBackOnboardingNavbarOptions(themeColors) {
  const innerStyles = StyleSheet.create({
    headerStyle: {
      backgroundColor: themeColors.background.default,
      shadowColor: importedColors.transparent,
      elevation: 0,
    },
    metamaskName: {
      width: 70,
      height: 35,
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
export function getOptinMetricsNavbarOptions(themeColors, showLogo = true) {
  const innerStyles = StyleSheet.create({
    headerStyle: {
      backgroundColor: themeColors.background.default,
      shadowColor: importedColors.transparent,
      elevation: 0,
    },
    metamaskName: {
      width: 70,
      height: 35,
      tintColor: themeColors.text.default,
    },
  });
  return {
    headerTitle: () =>
      showLogo ? (
        <View style={styles.metamaskNameTransparentWrapper}>
          <Image
            source={metamask_name}
            style={innerStyles.metamaskName}
            resizeMethod={'auto'}
          />
        </View>
      ) : null,
    headerBackTitle: strings('navigation.back'),
    headerRight: () => <View />,
    headerLeft: () => <View />,
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
          testID={CommonSelectorsIDs.NAV_IOS_BACK}
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
            name={'arrow-back'}
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
 * Function that returns the navigation options for the wallet screen.
 *
 * @param {Object} accountActionsRef - The ref object for the account actions
 * @param {Object} selectedInternalAccount - The currently selected internal account
 * @param {string} accountName - The name of the currently selected account
 * @param {string} networkName - The name of the currently selected network
 * @param {Object} networkImageSource - The image source for the currently selected network
 * @param {Function} onPressTitle - Callback function for when the network picker is pressed
 * @param {Object} navigation - The navigation object
 * @param {Object} themeColors - The theme colors object
 * @param {boolean} isNotificationEnabled - Whether notifications are enabled
 * @param {boolean | null} isBackupAndSyncEnabled - Whether backup and sync is enabled
 * @param {number} unreadNotificationCount - The number of unread notifications
 * @param {number} readNotificationCount - The number of read notifications
 * @param {boolean} shouldDisplayCardButton - Whether to display the card button
 * @returns {Object} An object containing the navbar options for the wallet screen
 */
export function getWalletNavbarOptions(
  accountActionsRef,
  selectedInternalAccount,
  accountName,
  networkName,
  networkImageSource,
  onPressTitle,
  navigation,
  themeColors,
  isNotificationEnabled,
  isBackupAndSyncEnabled,
  unreadNotificationCount,
  readNotificationCount,
  shouldDisplayCardButton,
) {
  const innerStyles = StyleSheet.create({
    headerContainer: {
      height: 72,
      alignItems: 'center',
    },
    headerIcon: {
      color: themeColors.primary.default,
    },
    headerLeftContainer: {
      justifyContent: 'center',
    },
    headerMiddleContainer: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    startAccessoryContainer: {
      alignItems: 'flex-start',
    },
    endAccessoryContainer: {
      alignItems: 'flex-end',
      marginRight: 16,
    },
    networkPickerStyle: {
      alignSelf: 'flex-start',
      marginLeft: 16,
    },
    actionButtonsContainer: {
      flexDirection: 'row',
    },
    // Minimum 44px touch area for accessibility
    touchAreaSlop: {
      top: 12,
      bottom: 12,
      left: 12,
      right: 12,
    },
    accountPickerStyle: {
      marginRight: 16,
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
              } catch {
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
        SharedDeeplinkManager.parse(content, {
          origin: AppConstants.DEEPLINKS.ORIGIN_QR_CODE,
        });
      }, 500);
    }
  };

  function openQRScanner() {
    navigation.navigate(Routes.QR_TAB_SWITCHER, {
      onScanSuccess,
    });
    trackEvent(
      MetricsEventBuilder.createEventBuilder(
        MetaMetricsEvents.WALLET_QR_SCANNER,
      ).build(),
    );
  }

  function handleNotificationOnPress() {
    if (isNotificationEnabled && isNotificationsFeatureEnabled()) {
      navigation.navigate(Routes.NOTIFICATIONS.VIEW);
      trackEvent(
        MetricsEventBuilder.createEventBuilder(
          MetaMetricsEvents.NOTIFICATIONS_MENU_OPENED,
        )
          .addProperties({
            unread_count: unreadNotificationCount,
            read_count: readNotificationCount,
          })
          .build(),
      );
    } else {
      navigation.navigate(Routes.NOTIFICATIONS.OPT_IN_STACK);
      trackEvent(
        MetricsEventBuilder.createEventBuilder(
          MetaMetricsEvents.NOTIFICATIONS_ACTIVATED,
        )
          .addProperties({
            action_type: 'started',
            is_profile_syncing_enabled: isBackupAndSyncEnabled,
          })
          .build(),
      );
    }
  }

  const handleHamburgerPress = () => {
    trackEvent(
      MetricsEventBuilder.createEventBuilder(
        MetaMetricsEvents.NAVIGATION_TAPS_SETTINGS,
      ).build(),
    );
    navigation.navigate(Routes.SETTINGS_VIEW);
  };

  const handleCardPress = () => {
    trackEvent(
      MetricsEventBuilder.createEventBuilder(
        MetaMetricsEvents.CARD_HOME_CLICKED,
      ).build(),
    );
    navigation.navigate(Routes.CARD.ROOT);
  };

  return {
    header: () => (
      <HeaderBase
        style={innerStyles.headerContainer}
        includesTopInset
        variant={HeaderBaseVariant.Display}
        endAccessory={
          <View style={innerStyles.endAccessoryContainer}>
            {
              <View style={innerStyles.actionButtonsContainer}>
                <View
                  testID={WalletViewSelectorsIDs.NAVBAR_ADDRESS_COPY_BUTTON}
                >
                  <AddressCopy
                    account={selectedInternalAccount}
                    hitSlop={innerStyles.touchAreaSlop}
                  />
                </View>
                {shouldDisplayCardButton && (
                  <CardButton
                    onPress={handleCardPress}
                    touchAreaSlop={innerStyles.touchAreaSlop}
                  />
                )}
                <ButtonIcon
                  iconProps={{ color: MMDSIconColor.Default }}
                  onPress={openQRScanner}
                  iconName={IconName.QrCode}
                  size={ButtonIconSize.Lg}
                  testID={WalletViewSelectorsIDs.WALLET_SCAN_BUTTON}
                  hitSlop={innerStyles.touchAreaSlop}
                />
                {isNotificationsFeatureEnabled() && (
                  <BadgeWrapper
                    position={BadgeWrapperPosition.TopRight}
                    positionAnchorShape={
                      BadgeWrapperPositionAnchorShape.Circular
                    }
                    badge={
                      isNotificationEnabled && unreadNotificationCount > 0 ? (
                        <BadgeStatus status={BadgeStatusStatus.Active} />
                      ) : null
                    }
                  >
                    <ButtonIcon
                      iconProps={{ color: MMDSIconColor.Default }}
                      onPress={handleNotificationOnPress}
                      iconName={IconName.Notification}
                      size={ButtonIconSize.Lg}
                      testID={
                        WalletViewSelectorsIDs.WALLET_NOTIFICATIONS_BUTTON
                      }
                      hitSlop={innerStyles.touchAreaSlop}
                    />
                  </BadgeWrapper>
                )}
                <ButtonIcon
                  iconProps={{ color: MMDSIconColor.Default }}
                  onPress={handleHamburgerPress}
                  iconName={IconName.Menu}
                  size={ButtonIconSize.Lg}
                  testID="navbar-hamburger-menu-button"
                  hitSlop={innerStyles.touchAreaSlop}
                />
              </View>
            }
          </View>
        }
      >
        <PickerAccount
          ref={accountActionsRef}
          accountName={accountName}
          onPress={() => {
            navigation.navigate(...createAccountSelectorNavDetails({}));
          }}
          testID={WalletViewSelectorsIDs.ACCOUNT_ICON}
          hitSlop={innerStyles.touchAreaSlop}
          style={innerStyles.accountPickerStyle}
        />
      </HeaderBase>
    ),
  };
}

/**
 * Function that returns the navigation options for the Import Asset screen
 *
 * @param {Object} navigation - Navigation object required to push new views
 * @param {string} title - Title in string format
 * @returns {Object} - Corresponding navbar options
 */
export function getImportTokenNavbarOptions(navigation, title, onPress) {
  return {
    header: () => (
      <BottomSheetHeader
        includesTopInset
        onBack={onPress ?? (() => navigation.goBack())}
      >
        {title}
      </BottomSheetHeader>
    ),
  };
}

export function getNftDetailsNavbarOptions(
  navigation,
  themeColors,
  onRightPress,
  contentOffset = 0,
) {
  const innerStyles = StyleSheet.create({
    headerStyle: {
      backgroundColor: themeColors.background.default,
      shadowColor: importedColors.transparent,
      elevation: 0,
    },
    headerShadow: {
      elevation: 2,
      shadowColor: themeColors.background.primary,
      shadowOpacity: contentOffset < 20 ? contentOffset / 100 : 0.2,
      shadowOffset: { height: 4, width: 0 },
      shadowRadius: 8,
    },
    headerIcon: {
      color: themeColors.primary.default,
    },
    headerBackIcon: {
      color: themeColors.icon.default,
    },
  });
  return {
    headerLeft: () => (
      <TouchableOpacity
        onPress={() => navigation.pop()}
        style={styles.backButton}
        testID={CommonSelectorsIDs.BACK_ARROW_BUTTON}
      >
        <Icon
          name={IconName.ArrowLeft}
          size={IconSize.Lg}
          style={innerStyles.headerBackIcon}
        />
      </TouchableOpacity>
    ),
    headerRight: onRightPress
      ? () => (
          <TouchableOpacity style={styles.backButton} onPress={onRightPress}>
            <Icon
              name={IconName.MoreVertical}
              size={IconSize.Lg}
              style={innerStyles.headerBackIcon}
            />
          </TouchableOpacity>
        )
      : () => <View />,
    headerStyle: [
      innerStyles.headerStyle,
      contentOffset && innerStyles.headerShadow,
    ],
  };
}

export function getNftFullImageNavbarOptions(
  navigation,
  themeColors,
  contentOffset = 0,
) {
  const innerStyles = StyleSheet.create({
    headerStyle: {
      backgroundColor: themeColors.background.default,
      shadowColor: importedColors.transparent,
      elevation: 0,
    },
    headerShadow: {
      elevation: 2,
      shadowColor: themeColors.background.primary,
      shadowOpacity: contentOffset < 20 ? contentOffset / 100 : 0.2,
      shadowOffset: { height: 4, width: 0 },
      shadowRadius: 8,
    },
    headerIcon: {
      color: themeColors.primary.default,
    },
    headerBackIcon: {
      color: themeColors.icon.default,
    },
  });
  return {
    headerRight: () => (
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.pop()}
      >
        <Icon
          name={IconName.Close}
          size={IconSize.Lg}
          style={innerStyles.headerBackIcon}
        />
      </TouchableOpacity>
    ),
    headerLeft: () => <View />,
    headerStyle: [
      innerStyles.headerStyle,
      contentOffset && innerStyles.headerShadow,
    ],
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
  contentOffset = 0,
  networkName = '',
) {
  return {
    header: () => (
      <HeaderBase
        includesTopInset
        startAccessory={
          <ButtonIcon
            style={styles.headerLeftButton}
            onPress={() => navigation.pop()}
            testID={CommonSelectorsIDs.BACK_ARROW_BUTTON}
            size={ButtonIconSize.Lg}
            iconName={IconName.ArrowLeft}
            iconColor={IconColor.Default}
          />
        }
        endAccessory={
          onRightPress ? (
            <ButtonIcon
              style={styles.headerRightButton}
              onPress={onRightPress}
              size={ButtonIconSize.Lg}
              iconName={IconName.MoreVertical}
              iconColor={IconColor.Default}
            />
          ) : (
            // Empty View to maintain layout spacing without showing a button
            <View style={styles.headerRightButton} />
          )
        }
      >
        <NavbarTitle
          disableNetwork={disableNetwork}
          title={title}
          translate={translate}
          networkName={networkName}
        />
      </HeaderBase>
    ),
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
      color: themeColors.icon.default,
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
          {...generateTestId(Platform, BACK_BUTTON_SIMPLE_WEBVIEW)}
        >
          <IonicIcon
            name={'arrow-back'}
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
            name="close"
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
            name={'arrow-back'}
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
            name={'arrow-back'}
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
            name="close"
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
      <NavbarTitle
        title={title}
        disableNetwork
        translate={false}
        showSelectedNetwork={false}
      />
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
      trackEvent(
        MetricsEventBuilder.createEventBuilder(
          MetaMetricsEvents.QUOTES_REQUEST_CANCELLED,
        )
          .addProperties({
            token_from: trade.token_from,
            token_to: trade.token_to,
            request_type: trade.request_type,
            custom_slippage: trade.custom_slippage,
            chain_id: trade.chain_id,
            responseTime: new Date().getTime() - quoteBegin,
          })
          .addSensitiveProperties({
            token_from_amount: trade.token_from_amount,
          })
          .build(),
      );
    }
    navigation.pop();
  };

  const rightAction = () => {
    const trade = route.params?.requestedTrade;
    const selectedQuote = route.params?.selectedQuote;
    const quoteBegin = route.params?.quoteBegin;
    if (!selectedQuote) {
      trackEvent(
        MetricsEventBuilder.createEventBuilder(
          MetaMetricsEvents.QUOTES_REQUEST_CANCELLED,
        )
          .addProperties({
            token_from: trade.token_from,
            token_to: trade.token_to,
            request_type: trade.request_type,
            custom_slippage: trade.custom_slippage,
            chain_id: trade.chain_id,
            responseTime: new Date().getTime() - quoteBegin,
          })
          .addSensitiveProperties({
            token_from_amount: trade.token_from_amount,
          })
          .build(),
      );
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
            name={'arrow-back'}
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

export function getBridgeNavbar(navigation, bridgeViewMode, themeColors) {
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

  let title = `${strings('swaps.title')}/${strings('bridge.title')}`;
  if (bridgeViewMode === BridgeViewMode.Bridge) {
    title = strings('bridge.title');
  } else if (
    bridgeViewMode === BridgeViewMode.Swap ||
    bridgeViewMode === BridgeViewMode.Unified
  ) {
    title = strings('swaps.title');
  }

  return {
    headerTitle: () => (
      <NavbarTitle
        title={title}
        disableNetwork
        showSelectedNetwork={false}
        translate={false}
      />
    ),
    // Render an empty left header action that matches the dimensions of the close button.
    // This allows us to center align the title on Android devices.
    headerLeft: Device.isAndroid()
      ? () => (
          <View style={[styles.closeButton, styles.hidden]}>
            <Icon
              name={IconName.Close}
              size={IconSize.Lg}
              color={IconColor.Muted}
            />
          </View>
        )
      : null,
    headerRight: () => (
      // eslint-disable-next-line react/jsx-no-bind
      <TouchableOpacity
        onPress={() => navigation.dangerouslyGetParent()?.pop()}
        style={styles.closeButton}
      >
        <Icon name={IconName.Close} size={IconSize.Lg} />
      </TouchableOpacity>
    ),
    headerStyle: innerStyles.headerStyle,
  };
}

export function getBridgeTransactionDetailsNavbar(navigation) {
  const leftAction = () => navigation.pop();

  return {
    headerTitle: () => (
      <NavbarTitle
        title={strings('bridge_transaction_details.transaction_details')}
        disableNetwork
        showSelectedNetwork={false}
        translate={false}
      />
    ),
    headerLeft: () => (
      <TouchableOpacity onPress={leftAction} style={styles.backButton}>
        <Icon name={IconName.ArrowLeft} />
      </TouchableOpacity>
    ),
  };
}

export function getPerpsTransactionsDetailsNavbar(navigation, title) {
  const innerStyles = StyleSheet.create({
    perpsTransactionsTitle: {
      fontWeight: '700',
      textAlign: 'center',
      flex: 1,
    },
    rightSpacer: {
      width: 48, // Same width as the back button to balance the header
    },
  });
  // Go back to transaction history view
  const leftAction = () => navigation.goBack();

  return {
    headerTitleAlign: 'center',
    headerTitle: () => (
      <NavbarTitle
        style={innerStyles.perpsTransactionsTitle}
        variant={TextVariant.HeadingMD}
        title={title}
        disableNetwork
        showSelectedNetwork={false}
        translate={false}
      />
    ),
    headerLeft: () => (
      <ButtonIcon
        iconName={IconName.Arrow2Left}
        onPress={leftAction}
        size={ButtonIconSize.Lg}
      />
    ),
    headerRight: () => <View style={innerStyles.rightSpacer} />,
  };
}

export function getPerpsMarketDetailsNavbar(navigation, title) {
  const innerStyles = StyleSheet.create({
    perpsMarketDetailsTitle: {
      fontWeight: '700',
      textAlign: 'center',
      flex: 1,
    },
  });
  // Always navigate back to markets page for consistent navigation
  const leftAction = () => navigation.navigate(Routes.PERPS.PERPS_HOME);

  return {
    headerTitle: () => (
      <NavbarTitle
        style={innerStyles.perpsMarketDetailsTitle}
        variant={TextVariant.HeadingMD}
        title={title}
        disableNetwork
        showSelectedNetwork={false}
        translate={false}
      />
    ),
    headerLeft: () => (
      <ButtonIcon
        iconName={IconName.Arrow2Left}
        onPress={leftAction}
        size={ButtonIconSize.Lg}
      />
    ),
  };
}

/**
 * Function that returns navigation options for deposit flow screens
 *
 * @param {string} title - Title to display in the header
 * @param {Object} navigation - Navigation object required to navigate between screens
 * @param {Object} theme - Theme object containing colors
 * @param {Function} onClose - Optional custom close function
 * @returns {Object} - Navigation options object
 */
export function getDepositNavbarOptions(
  navigation,
  {
    title,
    showBack = true,
    showClose = true,
    showConfiguration = false,
    onConfigurationPress,
  },
  theme,
  onClose = undefined,
) {
  const leftAction = () => navigation.pop();

  return {
    title,
    headerStyle: {
      backgroundColor: theme.colors.background.default,
      elevation: 0,
      shadowOpacity: 0,
    },
    headerTitleStyle: {
      fontWeight: '600',
      fontSize: 18,
      color: theme.colors.text.default,
    },
    headerTitle: () => (
      <NavbarTitle
        title={title}
        disableNetwork
        showSelectedNetwork={false}
        translate={false}
      />
    ),
    headerLeft: showBack
      ? () => (
          <ButtonIcon
            onPress={leftAction}
            iconName={IconName.ArrowLeft}
            size={ButtonIconSize.Lg}
            style={styles.headerLeftButton}
          />
        )
      : showConfiguration
        ? () => (
            <ButtonIcon
              onPress={onConfigurationPress}
              iconName={IconName.Setting}
              size={ButtonIconSize.Lg}
              testID="deposit-configuration-menu-button"
              style={styles.headerLeftButton}
            />
          )
        : null,
    headerRight: showClose
      ? () => (
          <ButtonIcon
            style={styles.headerRightButton}
            iconName={IconName.Close}
            size={ButtonIconSize.Lg}
            onPress={() => {
              navigation.dangerouslyGetParent()?.pop();
              onClose?.();
            }}
            testID="deposit-close-navbar-button"
          />
        )
      : null,
  };
}

export const getEditAccountNameNavBarOptions = (goBack, themeColors) => {
  const innerStyles = StyleSheet.create({
    headerStyle: {
      backgroundColor: themeColors.background.default,
      shadowColor: importedColors.transparent,
      elevation: 0,
    },
    headerTitleStyle: {
      fontSize: 18,
      ...fontStyles.normal,
      color: themeColors.text.default,
    },
  });

  return {
    headerTitle: <Text>{strings('account_actions.edit_name')}</Text>,
    headerLeft: null,
    headerRight: () => (
      <ButtonIcon
        iconName={IconName.Close}
        size={ButtonIconSize.Lg}
        onPress={goBack}
        style={styles.closeButton}
      />
    ),
    ...innerStyles,
  };
};

export const getSettingsNavigationOptions = (
  title,
  themeColors,
  navigation,
) => {
  const innerStyles = StyleSheet.create({
    headerStyle: {
      backgroundColor: themeColors.background.default,
      shadowColor: importedColors.transparent,
      elevation: 0,
    },
    accessories: {
      marginHorizontal: 8,
    },
  });
  return {
    headerLeft: null,
    headerTitle: () => (
      <MorphText
        variant={TextVariant.HeadingMD}
        testID={SettingsViewSelectorsIDs.SETTINGS_HEADER}
      >
        {title}
      </MorphText>
    ),
    headerRight: () => (
      <ButtonIcon
        size={ButtonIconSize.Lg}
        iconName={IconName.Close}
        onPress={() => navigation?.goBack()}
        style={innerStyles.accessories}
        testID={NetworksViewSelectorsIDs.CLOSE_ICON}
      />
    ),
    ...innerStyles,
  };
};

/**
 *
 * @param {String} title - Navbar Title.
 * @param {NavigationProp<ParamListBase>} navigation Navigation object returned from useNavigation hook.
 * @param {ThemeColors} themeColors theme.colors returned from useStyles hook.
 * @param {{ backgroundColor?: string, hasCancelButton?: boolean, hasBackButton?: boolean, hasIconButton?: boolean, handleIconPress?: () => void }} [navBarOptions] - Optional navbar options.
 * @param {{ cancelButtonEvent?: { event: IMetaMetricsEvent, properties: Record<string, string> }, backButtonEvent?: { event: IMetaMetricsEvent, properties: Record<string, string>}, iconButtonEvent?: { event: IMetaMetricsEvent, properties: Record<string, string> } }} [metricsOptions] - Optional metrics options.
 * @param {import('../Earn/types/lending.types').EarnTokenDetails | null | undefined} [earnToken] - Optional earn token.
 * @returns Staking Navbar Component.
 */
export function getStakingNavbar(
  title,
  navigation,
  themeColors,
  navBarOptions,
  metricsOptions,
  ///: BEGIN:ONLY_INCLUDE_IF(tron)
  earnToken = null,
  ///: END:ONLY_INCLUDE_IF
) {
  const {
    hasBackButton = true,
    hasCancelButton = true,
    hasIconButton = false,
    handleIconPress,
  } = navBarOptions ?? {};

  const innerStyles = StyleSheet.create({
    headerStyle: {
      backgroundColor:
        navBarOptions?.backgroundColor ?? themeColors.background.default,
      shadowColor: importedColors.transparent,
      shadowOffset: null,
    },
    headerLeft: {
      marginHorizontal: 16,
    },
    headerButtonText: {
      color: themeColors.primary.default,
      fontSize: 14,
      ...fontStyles.normal,
    },
    headerTitle: {
      alignItems: 'center',
    },
    headerTitleBalanceAndAPR: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 4,
    },
  });

  function navigationPop() {
    navigation.goBack();
  }

  function handleBackPress() {
    if (metricsOptions?.backButtonEvent) {
      withMetaMetrics(navigationPop, {
        event: metricsOptions.backButtonEvent.event,
        properties: metricsOptions.backButtonEvent.properties,
      })();
    } else {
      navigationPop();
    }
  }

  function handleCancelPress() {
    if (metricsOptions?.cancelButtonEvent) {
      withMetaMetrics(navigationPop, {
        event: metricsOptions.cancelButtonEvent.event,
        properties: metricsOptions.cancelButtonEvent.properties,
      })();
    } else {
      navigationPop();
    }
  }

  function handleIconPressWrapper() {
    if (!handleIconPress) return;
    if (metricsOptions?.iconButtonEvent) {
      withMetaMetrics(handleIconPress, {
        event: metricsOptions.iconButtonEvent.event,
        properties: metricsOptions.iconButtonEvent.properties,
      })();
    } else {
      handleIconPress();
    }
  }

  ///: BEGIN:ONLY_INCLUDE_IF(tron)
  const apr = parseFloat(earnToken?.experience?.apr ?? '0').toFixed(1);
  ///: END:ONLY_INCLUDE_IF

  return {
    headerTitle: () => (
      <View style={innerStyles.headerTitle}>
        <MorphText variant={TextVariant.HeadingMD}>{title}</MorphText>
        {
          ///: BEGIN:ONLY_INCLUDE_IF(tron)
          earnToken && (
            <View style={innerStyles.headerTitleBalanceAndAPR}>
              <MorphText
                variant={TextVariant.BodySMMedium}
                color={TextColor.Alternative}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {earnToken.balanceFormatted}
              </MorphText>
              <MorphText
                variant={TextVariant.BodySMMedium}
                color={TextColor.Success}
              >
                {`${apr}% ${strings('earn.apr')}`}
              </MorphText>
            </View>
          )
          ///: END:ONLY_INCLUDE_IF
        }
      </View>
    ),
    headerStyle: innerStyles.headerStyle,
    headerLeft: () =>
      hasBackButton ? (
        <ButtonIcon
          size={ButtonIconSize.Lg}
          iconName={IconName.ArrowLeft}
          onPress={handleBackPress}
          style={innerStyles.headerLeft}
        />
      ) : (
        <></>
      ),
    headerRight: () =>
      hasCancelButton ? (
        <TouchableOpacity
          onPress={handleCancelPress}
          style={styles.closeButton}
        >
          <Text style={innerStyles.headerButtonText}>
            {strings('navigation.cancel')}
          </Text>
        </TouchableOpacity>
      ) : hasIconButton ? (
        <TouchableOpacity
          hitSlop={styles.hitSlop}
          onPress={handleIconPressWrapper}
          style={styles.iconButton}
        >
          <Icon name={IconName.Question} />
        </TouchableOpacity>
      ) : (
        <></>
      ),
  };
}

/**
 * Function that returns the navigation options for the DeFi Protocol Positions Details screen
 *
 * @param {Object} navigation - Navigation object required to push new views
 * @returns {Object} - Corresponding navbar options
 */
export function getDeFiProtocolPositionDetailsNavbarOptions(navigation) {
  return {
    headerTitle: () => null,
    headerLeft: () => (
      <ButtonIcon
        style={styles.headerLeftButton}
        onPress={() => navigation.pop()}
        testID={CommonSelectorsIDs.BACK_ARROW_BUTTON}
        size={ButtonIconSize.Lg}
        iconName={IconName.ArrowLeft}
        iconColor={IconColor.Default}
      />
    ),
  };
}

/**
 * Function that returns the navigation options for the Address List screen
 *
 * @param {Object} navigation - Navigation object required to push new views
 * @param {string} title - Title in string format
 * @param {string} testID - Test ID for the back button
 * @returns {Object} - Corresponding navbar options
 */
export function getAddressListNavbarOptions(navigation, title, testID) {
  const innerStyles = StyleSheet.create({
    headerLeft: {
      marginHorizontal: 8,
    },
  });
  return {
    headerTitleAlign: 'center',
    headerTitle: () => (
      <MorphText variant={TextVariant.BodyMDBold}>{title}</MorphText>
    ),
    headerLeft: () => (
      <View style={innerStyles.headerLeft}>
        <ButtonIcon
          testID={testID}
          iconName={IconName.ArrowLeft}
          size={ButtonIconSize.Md}
          iconProps={{ color: MMDSIconColor.IconDefault }}
          onPress={() => navigation.goBack()}
        />
      </View>
    ),
  };
}

/**
 * Generic navbar with only a close button on the right
 * @param {Object} navigation - Navigation object
 * @param {Object} themeColors - Theme colors object
 * @param {Function} onClose - Optional custom close handler (defaults to navigation.goBack())
 * @returns {Object} - Navigation options
 */
export function getCloseOnlyNavbar(
  navigation,
  themeColors,
  onClose = undefined,
) {
  const innerStyles = StyleSheet.create({
    headerStyle: {
      backgroundColor: themeColors.background.default,
      shadowColor: importedColors.transparent,
      elevation: 0,
    },
    headerRight: {
      marginHorizontal: 16,
    },
  });

  const handleClosePress = () => {
    if (onClose) {
      onClose();
      return;
    }

    navigation.goBack();
  };

  return {
    headerShown: true,
    headerTitle: () => null,
    headerLeft: () => null,
    headerRight: () => (
      <ButtonIcon
        size={ButtonIconSize.Lg}
        iconName={IconName.Close}
        onPress={handleClosePress}
        style={innerStyles.headerRight}
      />
    ),
    headerStyle: innerStyles.headerStyle,
  };
}
