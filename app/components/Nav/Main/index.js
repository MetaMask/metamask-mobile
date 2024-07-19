import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useContext,
} from 'react';

import {
  ActivityIndicator,
  AppState,
  StyleSheet,
  View,
  Linking,
} from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import PropTypes from 'prop-types';
import { connect, useSelector } from 'react-redux';
import GlobalAlert from '../../UI/GlobalAlert';
import BackgroundTimer from 'react-native-background-timer';
import NotificationManager from '../../../core/NotificationManager';
import Engine from '../../../core/Engine';
import AppConstants from '../../../core/AppConstants';
import notifee from '@notifee/react-native';
import I18n, { strings } from '../../../../locales/i18n';
import FadeOutOverlay from '../../UI/FadeOutOverlay';
import BackupAlert from '../../UI/BackupAlert';
import Notification from '../../UI/Notification';
import RampOrders from '../../UI/Ramp';
import Device from '../../../util/device';
import Routes from '../../../constants/navigation/Routes';
import {
  showTransactionNotification,
  hideCurrentNotification,
  showSimpleNotification,
  removeNotificationById,
  removeNotVisibleNotifications,
} from '../../../actions/notification';
import ProtectYourWalletModal from '../../UI/ProtectYourWalletModal';
import MainNavigator from './MainNavigator';
import SkipAccountSecurityModal from '../../UI/SkipAccountSecurityModal';
import { query } from '@metamask/controller-utils';
import SwapsLiveness from '../../UI/Swaps/SwapsLiveness';
import useNotificationHandler from '../../../util/notifications/hooks';

import {
  setInfuraAvailabilityBlocked,
  setInfuraAvailabilityNotBlocked,
} from '../../../actions/infuraAvailability';

import { createStackNavigator } from '@react-navigation/stack';
import ReviewModal from '../../UI/ReviewModal';
import { useTheme } from '../../../util/theme';
import RootRPCMethodsUI from './RootRPCMethodsUI';
import { colors as importedColors } from '../../../styles/common';
import {
  ToastContext,
  ToastVariants,
} from '../../../component-library/components/Toast';
import { useEnableAutomaticSecurityChecks } from '../../hooks/EnableAutomaticSecurityChecks';
import { useMinimumVersions } from '../../hooks/MinimumVersions';
import navigateTermsOfUse from '../../../util/termsOfUse/termsOfUse';
import {
  selectChainId,
  selectProviderConfig,
  selectProviderType,
} from '../../../selectors/networkController';
import {
  selectNetworkName,
  selectNetworkImageSource,
} from '../../../selectors/networkInfos';
import { selectShowIncomingTransactionNetworks } from '../../../selectors/preferencesController';
import {
  DEPRECATED_NETWORKS,
  NETWORKS_CHAIN_ID,
} from '../../../constants/network';
import WarningAlert from '../../../components/UI/WarningAlert';
import { GOERLI_DEPRECATED_ARTICLE } from '../../../constants/urls';
import {
  updateIncomingTransactions,
  startIncomingTransactionPolling,
  stopIncomingTransactionPolling,
} from '../../../util/transaction-controller';

const Stack = createStackNavigator();

const createStyles = (colors) =>
  StyleSheet.create({
    flex: {
      flex: 1,
    },
    loader: {
      backgroundColor: colors.background.default,
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });

const Main = (props) => {
  const [connected, setConnected] = useState(true);
  const [forceReload, setForceReload] = useState(false);
  const [showRemindLaterModal, setShowRemindLaterModal] = useState(false);
  const [skipCheckbox, setSkipCheckbox] = useState(false);
  const [showDeprecatedAlert, setShowDeprecatedAlert] = useState(true);
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const backgroundMode = useRef(false);
  const locale = useRef(I18n.locale);
  const removeConnectionStatusListener = useRef();

  const removeNotVisibleNotifications = props.removeNotVisibleNotifications;

  useEnableAutomaticSecurityChecks();
  useMinimumVersions();

  useEffect(() => {
    if (DEPRECATED_NETWORKS.includes(props.chainId)) {
      setShowDeprecatedAlert(true);
    } else {
      setShowDeprecatedAlert(false);
    }
  }, [props.chainId]);

  useEffect(() => {
    const chainId = props.chainId;

    if (props.showIncomingTransactionsNetworks[chainId]) {
      startIncomingTransactionPolling();
    } else {
      stopIncomingTransactionPolling();
    }
  }, [props.showIncomingTransactionsNetworks, props.chainId]);

  useEffect(() => {
    Engine.context.startPolling();
  }, []);

  const connectionChangeHandler = useCallback(
    (state) => {
      if (!state) return;
      const { isConnected } = state;
      // Show the modal once the status changes to offline
      if (connected && isConnected === false) {
        props.navigation.navigate('OfflineModeView');
      }
      if (connected !== isConnected && isConnected !== null) {
        setConnected(isConnected);
      }
    },
    [connected, setConnected, props.navigation],
  );

  const checkInfuraAvailability = useCallback(async () => {
    if (props.providerType !== 'rpc') {
      try {
        const { TransactionController } = Engine.context;
        await query(TransactionController.ethQuery, 'blockNumber', []);
        props.setInfuraAvailabilityNotBlocked();
      } catch (e) {
        if (e.message === AppConstants.ERRORS.INFURA_BLOCKED_MESSAGE) {
          props.navigation.navigate('OfflineModeView');
          props.setInfuraAvailabilityBlocked();
        }
      }
    } else {
      props.setInfuraAvailabilityNotBlocked();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    props.navigation,
    props.providerType,
    props.setInfuraAvailabilityBlocked,
    props.setInfuraAvailabilityNotBlocked,
  ]);

  const handleAppStateChange = useCallback(
    (appState) => {
      const newModeIsBackground = appState === 'background';

      // If it was in background and it's not anymore
      // we need to stop the Background timer
      if (backgroundMode.current && !newModeIsBackground) {
        BackgroundTimer.stop();
      }

      backgroundMode.current = newModeIsBackground;

      // If the app is now in background, we need to start
      // the background timer, which is less intense
      if (backgroundMode.current) {
        removeNotVisibleNotifications();

        BackgroundTimer.runBackgroundTimer(async () => {
          await updateIncomingTransactions();
        }, AppConstants.TX_CHECK_BACKGROUND_FREQUENCY);
      }
    },
    [backgroundMode, removeNotVisibleNotifications],
  );

  const initForceReload = () => {
    // Force unmount the webview to avoid caching problems
    setForceReload(true);
    setTimeout(() => {
      setForceReload(false);
    }, 1000);
  };

  const renderLoader = () => (
    <View style={styles.loader}>
      <ActivityIndicator size="small" />
    </View>
  );

  const toggleRemindLater = () => {
    setShowRemindLaterModal(!showRemindLaterModal);
  };

  const toggleSkipCheckbox = () => {
    setSkipCheckbox(!skipCheckbox);
  };

  const skipAccountModalSecureNow = () => {
    toggleRemindLater();
    props.navigation.navigate('SetPasswordFlow', {
      screen: 'AccountBackupStep1B',
      params: { ...props.route.params },
    });
  };

  const skipAccountModalSkip = () => {
    if (skipCheckbox) toggleRemindLater();
  };

  /**
   * Current network
   */
  const providerConfig = useSelector(selectProviderConfig);
  const networkName = useSelector(selectNetworkName);
  const previousProviderConfig = useRef(undefined);
  const { toastRef } = useContext(ToastContext);
  const networkImage = useSelector(selectNetworkImageSource);

  // Show network switch confirmation.
  useEffect(() => {
    if (
      previousProviderConfig.current &&
      (providerConfig.chainId !== previousProviderConfig.current.chainId ||
        providerConfig.type !== previousProviderConfig.current.type)
    ) {
      toastRef?.current?.showToast({
        variant: ToastVariants.Network,
        labelOptions: [
          {
            label: `${networkName} `,
            isBold: true,
          },
          { label: strings('toast.now_active') },
        ],
        networkImageSource: networkImage,
      });
    }
    previousProviderConfig.current = providerConfig;
  }, [providerConfig, networkName, networkImage, toastRef]);

  useEffect(() => {
    if (locale.current !== I18n.locale) {
      locale.current = I18n.locale;
      initForceReload();
      return;
    }
  });

  const bootstrapAndroidInitialNotification = useCallback(async () => {
    if (Device.isAndroid()) {
      const initialNotification = await notifee.getInitialNotification();

      if (
        initialNotification?.data?.action === 'tx' &&
        initialNotification.data.id
      ) {
        NotificationManager.setTransactionToView(initialNotification.data.id);
        props.navigation.navigate(Routes.TRANSACTIONS_VIEW);
      }
    }
  }, [props.navigation]);

  useNotificationHandler(bootstrapAndroidInitialNotification, props.navigation);

  // Remove all notifications that aren't visible
  useEffect(() => {
    removeNotVisibleNotifications();
  }, [removeNotVisibleNotifications]);

  useEffect(() => {
    const appStateListener = AppState.addEventListener(
      'change',
      handleAppStateChange,
    );

    setTimeout(() => {
      NotificationManager.init({
        navigation: props.navigation,
        showTransactionNotification: props.showTransactionNotification,
        hideCurrentNotification: props.hideCurrentNotification,
        showSimpleNotification: props.showSimpleNotification,
        removeNotificationById: props.removeNotificationById,
      });
      checkInfuraAvailability();
      removeConnectionStatusListener.current = NetInfo.addEventListener(
        connectionChangeHandler,
      );
    }, 1000);

    return function cleanup() {
      appStateListener.remove();
      removeConnectionStatusListener.current &&
        removeConnectionStatusListener.current();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const termsOfUse = useCallback(async () => {
    if (props.navigation) {
      await navigateTermsOfUse(props.navigation.navigate);
    }
  }, [props.navigation]);

  useEffect(() => {
    termsOfUse();
  }, [termsOfUse]);

  const openDeprecatedNetworksArticle = () => {
    Linking.openURL(GOERLI_DEPRECATED_ARTICLE);
  };

  const renderDeprecatedNetworkAlert = (chainId, backUpSeedphraseVisible) => {
    if (DEPRECATED_NETWORKS.includes(chainId) && showDeprecatedAlert) {
      if (NETWORKS_CHAIN_ID.MUMBAI === chainId) {
        return (
          <WarningAlert
            text={strings('networks.network_deprecated_title')}
            dismissAlert={() => setShowDeprecatedAlert(false)}
            precedentAlert={backUpSeedphraseVisible}
          />
        );
      }
      return (
        <WarningAlert
          text={strings('networks.deprecated_goerli')}
          dismissAlert={() => setShowDeprecatedAlert(false)}
          onPressLearnMore={openDeprecatedNetworksArticle}
          precedentAlert={backUpSeedphraseVisible}
        />
      );
    }
  };

  return (
    <React.Fragment>
      <View style={styles.flex}>
        {!forceReload ? (
          <MainNavigator navigation={props.navigation} />
        ) : (
          renderLoader()
        )}
        <GlobalAlert />
        <FadeOutOverlay />
        <Notification navigation={props.navigation} />
        <RampOrders />
        <SwapsLiveness />
        <BackupAlert
          onDismiss={toggleRemindLater}
          navigation={props.navigation}
        />
        {renderDeprecatedNetworkAlert(
          props.chainId,
          props.backUpSeedphraseVisible,
        )}
        <SkipAccountSecurityModal
          modalVisible={showRemindLaterModal}
          onCancel={skipAccountModalSecureNow}
          onConfirm={skipAccountModalSkip}
          skipCheckbox={skipCheckbox}
          toggleSkipCheckbox={toggleSkipCheckbox}
        />
        <ProtectYourWalletModal navigation={props.navigation} />
        <RootRPCMethodsUI navigation={props.navigation} />
      </View>
    </React.Fragment>
  );
};

Main.router = MainNavigator.router;

Main.propTypes = {
  /**
   * Object that represents the navigator
   */
  navigation: PropTypes.object,
  /**
   * Dispatch showing a transaction notification
   */
  showTransactionNotification: PropTypes.func,
  /**
   * Dispatch showing a simple notification
   */
  showSimpleNotification: PropTypes.func,
  /**
   * Dispatch hiding a transaction notification
   */
  hideCurrentNotification: PropTypes.func,
  removeNotificationById: PropTypes.func,
  /**
   * Indicates whether networks allows incoming transactions
   */
  showIncomingTransactionsNetworks: PropTypes.object,
  /**
   * Network provider type
   */
  providerType: PropTypes.string,
  /**
   * Dispatch infura availability blocked
   */
  setInfuraAvailabilityBlocked: PropTypes.func,
  /**
   * Dispatch infura availability not blocked
   */
  setInfuraAvailabilityNotBlocked: PropTypes.func,
  /**
   * Remove not visible notifications from state
   */
  removeNotVisibleNotifications: PropTypes.func,
  /**
   * Object that represents the current route info like params passed to it
   */
  route: PropTypes.object,
  /**
   * Current chain id
   */
  chainId: PropTypes.string,
  /**
   * backup seed phrase modal visible
   */
  backUpSeedphraseVisible: PropTypes.bool,
};

const mapStateToProps = (state) => ({
  showIncomingTransactionsNetworks:
    selectShowIncomingTransactionNetworks(state),
  providerType: selectProviderType(state),
  chainId: selectChainId(state),
  backUpSeedphraseVisible: state.user.backUpSeedphraseVisible,
});

const mapDispatchToProps = (dispatch) => ({
  showTransactionNotification: (args) =>
    dispatch(showTransactionNotification(args)),
  showSimpleNotification: (args) => dispatch(showSimpleNotification(args)),
  hideCurrentNotification: () => dispatch(hideCurrentNotification()),
  removeNotificationById: (id) => dispatch(removeNotificationById(id)),
  setInfuraAvailabilityBlocked: () => dispatch(setInfuraAvailabilityBlocked()),
  setInfuraAvailabilityNotBlocked: () =>
    dispatch(setInfuraAvailabilityNotBlocked()),
  removeNotVisibleNotifications: () =>
    dispatch(removeNotVisibleNotifications()),
});

const ConnectedMain = connect(mapStateToProps, mapDispatchToProps)(Main);

const MainFlow = () => (
  <Stack.Navigator
    initialRouteName={'Main'}
    mode={'modal'}
    screenOptions={{
      headerShown: false,
      cardStyle: { backgroundColor: importedColors.transparent },
    }}
  >
    <Stack.Screen name={'Main'} component={ConnectedMain} />
    <Stack.Screen
      name={'ReviewModal'}
      component={ReviewModal}
      options={{ animationEnabled: false }}
    />
  </Stack.Navigator>
);

export default MainFlow;
