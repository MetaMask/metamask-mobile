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
import I18n, { strings } from '../../../../locales/i18n';
import FadeOutOverlay from '../../UI/FadeOutOverlay';
import BackupAlert from '../../UI/BackupAlert';
import Notification from '../../UI/Notification';
import RampOrders from '../../UI/Ramp';
import {
  showTransactionNotification,
  hideCurrentNotification,
  showSimpleNotification,
  removeNotificationById,
  removeNotVisibleNotifications,
} from '../../../actions/notification';

import ProtectYourWalletModal from '../../UI/ProtectYourWalletModal';
import MainNavigator from './MainNavigator';
import { query } from '@metamask/controller-utils';
import SwapsLiveness from '../../UI/Swaps/SwapsLiveness';

import {
  setInfuraAvailabilityBlocked,
  setInfuraAvailabilityNotBlocked,
} from '../../../actions/infuraAvailability';

import { createStackNavigator } from '@react-navigation/stack';
import ReviewModal from '../../UI/ReviewModal';
import { useTheme } from '../../../util/theme';
import RootRPCMethodsUI from './RootRPCMethodsUI';
import {
  ToastContext,
  ToastVariants,
} from '../../../component-library/components/Toast';
import { useMinimumVersions } from '../../hooks/MinimumVersions';
import {
  selectChainId,
  selectIsAllNetworks,
  selectNetworkClientId,
  selectNetworkConfigurations,
  selectProviderConfig,
  selectProviderType,
} from '../../../selectors/networkController';
import {
  selectNetworkName,
  selectNetworkImageSource,
} from '../../../selectors/networkInfos';
import { selectTokenNetworkFilter } from '../../../selectors/preferencesController';

import useNotificationHandler from '../../../util/notifications/hooks';
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
import isNetworkUiRedesignEnabled from '../../../util/networks/isNetworkUiRedesignEnabled';
import { useConnectionHandler } from '../../../util/navigation/useConnectionHandler';
import { getGlobalEthQuery } from '../../../util/networks/global-network';
import { selectIsEvmNetworkSelected } from '../../../selectors/multichainNetworkController';
import { selectEVMEnabledNetworks } from '../../../selectors/networkEnablementController';
import {
  isPortfolioViewEnabled,
  isRemoveGlobalNetworkSelectorEnabled,
} from '../../../util/networks';
import { useIdentityEffects } from '../../../util/identity/hooks/useIdentityEffects/useIdentityEffects';
import ProtectWalletMandatoryModal from '../../Views/ProtectWalletMandatoryModal/ProtectWalletMandatoryModal';
import InfoNetworkModal from '../../Views/InfoNetworkModal/InfoNetworkModal';
import { selectIsSeedlessPasswordOutdated } from '../../../selectors/seedlessOnboardingController';
import { Authentication } from '../../../core';
import { IconName } from '../../../component-library/components/Icons/Icon';
import Routes from '../../../constants/navigation/Routes';
import { useNavigation } from '@react-navigation/native';
import { useCompletedOnboardingEffect } from '../../../util/onboarding/hooks/useCompletedOnboardingEffect';
import {
  useNetworksByNamespace,
  NetworkType,
} from '../../hooks/useNetworksByNamespace/useNetworksByNamespace';
import { useNetworkSelection } from '../../hooks/useNetworkSelection/useNetworkSelection';
import { useIsOnBridgeRoute } from '../../UI/Bridge/hooks/useIsOnBridgeRoute';
import { handleShowNetworkActiveToast } from './utils';
import { CardVerification } from '../../UI/Card/sdk';

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
  const [forceReload, setForceReload] = useState(false);
  const [showDeprecatedAlert, setShowDeprecatedAlert] = useState(true);
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const backgroundMode = useRef(false);
  const locale = useRef(I18n.locale);
  const removeConnectionStatusListener = useRef();

  const isSeedlessPasswordOutdated = useSelector(
    selectIsSeedlessPasswordOutdated,
  );

  useEffect(() => {
    const checkIsSeedlessPasswordOutdated = async () => {
      if (isSeedlessPasswordOutdated) {
        // Check for latest seedless password outdated state
        // isSeedlessPasswordOutdated is true when navigate to wallet main screen after login with password sync
        const isOutdated = await Authentication.checkIsSeedlessPasswordOutdated(
          false,
        );
        if (!isOutdated) {
          return;
        }

        // show seedless password outdated modal and force user to lock app
        props.navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
          screen: Routes.SHEET.SUCCESS_ERROR_SHEET,
          params: {
            title: strings('login.seedless_password_outdated_modal_title'),
            description: strings(
              'login.seedless_password_outdated_modal_content',
            ),
            primaryButtonLabel: strings(
              'login.seedless_password_outdated_modal_confirm',
            ),
            type: 'error',
            icon: IconName.Danger,
            isInteractable: false,
            onPrimaryButtonPress: async () => {
              await Authentication.lockApp({ locked: true });
            },
            closeOnPrimaryButtonPress: true,
          },
        });
      }
    };
    checkIsSeedlessPasswordOutdated();
  }, [isSeedlessPasswordOutdated, props.navigation]);

  const { connectionChangeHandler } = useConnectionHandler(props.navigation);

  const removeNotVisibleNotifications = props.removeNotVisibleNotifications;
  useCompletedOnboardingEffect();
  useNotificationHandler();
  useIdentityEffects();
  useMinimumVersions();

  const { chainId, networkClientId } = props;

  useEffect(() => {
    if (DEPRECATED_NETWORKS.includes(props.chainId)) {
      setShowDeprecatedAlert(true);
    } else {
      setShowDeprecatedAlert(false);
    }
  }, [props.chainId]);

  useEffect(() => {
    stopIncomingTransactionPolling();
    startIncomingTransactionPolling();
  }, [chainId, networkClientId, props.networkConfigurations]);

  const checkInfuraAvailability = useCallback(async () => {
    if (props.providerType !== 'rpc') {
      try {
        const ethQuery = getGlobalEthQuery();
        await query(ethQuery, 'blockNumber', []);
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
  const skipAccountModalSecureNow = () => {
    props.navigation.navigate(Routes.SET_PASSWORD_FLOW.ROOT, {
      screen: Routes.SET_PASSWORD_FLOW.MANUAL_BACKUP_STEP_1,
      params: { backupFlow: true },
    });
  };

  const navigation = useNavigation();

  const toggleRemindLater = () => {
    props.navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.SHEET.SKIP_ACCOUNT_SECURITY_MODAL,
      params: {
        onConfirm: () => navigation.goBack(),
        onCancel: skipAccountModalSecureNow,
      },
    });
  };

  /**
   * Current network
   */
  const providerConfig = useSelector(selectProviderConfig);
  const networkConfigurations = useSelector(selectNetworkConfigurations);
  const networkName = useSelector(selectNetworkName);
  const isEvmSelected = useSelector(selectIsEvmNetworkSelected);
  const previousProviderConfig = useRef(undefined);
  const previousNetworkConfigurations = useRef(undefined);
  const { toastRef } = useContext(ToastContext);
  const { networks } = useNetworksByNamespace({
    networkType: NetworkType.Popular,
  });
  const { selectNetwork } = useNetworkSelection({
    networks,
  });
  const enabledEVMNetworks = useSelector(selectEVMEnabledNetworks);
  const networkImage = useSelector(selectNetworkImageSource);

  const isAllNetworks = useSelector(selectIsAllNetworks);
  const tokenNetworkFilter = useSelector(selectTokenNetworkFilter);
  const isOnBridgeRoute = useIsOnBridgeRoute();

  const hasNetworkChanged = useCallback(
    (chainId, previousConfig, isEvmSelected) => {
      if (!previousConfig) return false;

      return isEvmSelected
        ? chainId !== previousConfig.chainId ||
            providerConfig.type !== previousConfig.type
        : chainId !== previousConfig.chainId;
    },
    [providerConfig.type],
  );

  // Show network switch confirmation.
  useEffect(() => {
    if (
      hasNetworkChanged(chainId, previousProviderConfig.current, isEvmSelected)
    ) {
      //set here token network filter if portfolio view is enabled
      if (isPortfolioViewEnabled()) {
        const { PreferencesController } = Engine.context;
        if (Object.keys(tokenNetworkFilter).length === 1) {
          PreferencesController.setTokenNetworkFilter({
            [chainId]: true,
          });
        } else {
          PreferencesController.setTokenNetworkFilter({
            ...tokenNetworkFilter,
            [chainId]: true,
          });
        }
      }
      if (
        isRemoveGlobalNetworkSelectorEnabled() &&
        enabledEVMNetworks.length === 0
      ) {
        selectNetwork(chainId);
      }
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

      handleShowNetworkActiveToast(
        isOnBridgeRoute,
        toastRef,
        networkName,
        networkImage,
      );
    }
    previousProviderConfig.current = !isEvmSelected
      ? { chainId }
      : providerConfig;
  }, [
    providerConfig,
    networkName,
    networkImage,
    toastRef,
    chainId,
    isEvmSelected,
    hasNetworkChanged,
    isAllNetworks,
    tokenNetworkFilter,
    selectNetwork,
    enabledEVMNetworks,
    isOnBridgeRoute,
  ]);

  // Show add network confirmation.
  useEffect(() => {
    if (!isNetworkUiRedesignEnabled()) return;

    // Memoized values to avoid recalculations
    const currentNetworkValues = Object.values(networkConfigurations);
    const previousNetworkValues = Object.values(
      previousNetworkConfigurations.current ?? {},
    );

    if (
      previousNetworkValues.length &&
      currentNetworkValues.length !== previousNetworkValues.length
    ) {
      // Find the newly added network
      const newNetwork = currentNetworkValues.find(
        (network) => !previousNetworkValues.includes(network),
      );
      const deletedNetwork = previousNetworkValues.find(
        (network) => !currentNetworkValues.includes(network),
      );

      toastRef?.current?.showToast({
        variant: ToastVariants.Plain,
        labelOptions: [
          {
            label: `${
              (newNetwork?.name || deletedNetwork?.name) ??
              strings('asset_details.network')
            } `,
            isBold: true,
          },
          {
            label: deletedNetwork
              ? strings('toast.network_removed')
              : strings('toast.network_added'),
          },
        ],
        networkImageSource: networkImage,
      });
    }
    previousNetworkConfigurations.current = networkConfigurations;
  }, [networkConfigurations, networkName, networkImage, toastRef]);

  useEffect(() => {
    if (locale.current !== I18n.locale) {
      locale.current = I18n.locale;
      initForceReload();
      return;
    }
  });

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
  }, [connectionChangeHandler]);

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
        <CardVerification />
        <BackupAlert
          onDismiss={toggleRemindLater}
          navigation={props.navigation}
        />
        {renderDeprecatedNetworkAlert(
          props.chainId,
          props.backUpSeedphraseVisible,
        )}
        <ProtectYourWalletModal navigation={props.navigation} />
        <InfoNetworkModal />
        <RootRPCMethodsUI navigation={props.navigation} />
        <ProtectWalletMandatoryModal />
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
   * Current chain id
   */
  chainId: PropTypes.string,
  /**
   * backup seed phrase modal visible
   */
  backUpSeedphraseVisible: PropTypes.bool,
  /**
   * ID of the global network client
   */
  networkClientId: PropTypes.string,
  /**
   * Network configurations
   */
  networkConfigurations: PropTypes.object,
};

const mapStateToProps = (state) => ({
  providerType: selectProviderType(state),
  chainId: selectChainId(state),
  networkClientId: selectNetworkClientId(state),
  backUpSeedphraseVisible: state.user.backUpSeedphraseVisible,
  networkConfigurations: selectNetworkConfigurations(state),
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
