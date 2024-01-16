import Modal from 'react-native-modal';
import React, { useCallback, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { fontStyles } from '../../../styles/common';
import { strings } from '../../../../locales/i18n';
import Text from '../../Base/Text';
import NetworkDetails from './NetworkDetails';
import NetworkAdded from './NetworkAdded';
import Engine from '../../../core/Engine';
import { isprivateConnection } from '../../../util/networks';
import getDecimalChainId from '../../../util/networks/getDecimalChainId';
import URLPARSE from 'url-parse';
import scaling from '../../../util/scaling';
import { isWebUri } from 'valid-url';
import { useDispatch, useSelector } from 'react-redux';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { BannerAlertSeverity } from '../../../component-library/components/Banners/Banner';
import {
  ButtonSize,
  ButtonVariants,
} from '../../../component-library/components/Buttons/Button';
import AnalyticsV2 from '../../../util/analyticsV2';

import { useTheme } from '../../../util/theme';
import { networkSwitched } from '../../../actions/onboardNetwork';
import { NetworkApprovalModalSelectorsIDs } from '../../../../e2e/selectors/Modals/NetworkApprovalModal.selectors';
import type { ThemeColors } from '@metamask/design-tokens/dist/types/js/themes/types';
import { selectUseSafeChainsListValidation } from '../../../selectors/preferencesController';
import BottomSheetFooter, {
  ButtonsAlignment,
} from '../../../component-library/components/BottomSheets/BottomSheetFooter';
import { ButtonProps } from '../../../component-library/components/Buttons/Button/Button.types';
import checkSafeNetwork from '../../../core/SDKConnect/utils/networkChecker.util';
import NetworkVerificationInfo from '../NetworkVerificationInfo';

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    root: {
      backgroundColor: colors.background.default,
      paddingHorizontal: 0,
      maxHeight: '85%',
      paddingBottom: 20,
    },
    bottomModal: {
      justifyContent: 'flex-end',
      margin: 0,
    },
    alertBar: {
      width: '100%',
      marginBottom: 15,
    },
    modalContainer: {
      borderRadius: 10,
      backgroundColor: colors.background.default,
      padding: 4,
      paddingTop: 4,
      maxHeight: '80%',
    },
    title: {
      ...fontStyles.bold,
      fontSize: scaling.scale(18),
      textAlign: 'center',
      color: colors.text.default,
      lineHeight: 34,
      marginVertical: 10,
      paddingHorizontal: 16,
    },
    bottomSpace: {
      marginBottom: 10,
    },
    actionContainer: {
      flex: 0,
      paddingVertical: 16,
      justifyContent: 'center',
    },
    notch: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border.muted,
    },
    notchWrapper: {
      alignSelf: 'stretch',
      padding: 4,
      alignItems: 'center',
    },
    textSection: {
      marginBottom: 8,
    },
    accountCardWrapper: {
      borderWidth: 1,
      borderColor: colors.border.default,
      borderRadius: 10,
      padding: 16,
      marginVertical: 16,
      maxHeight: '70%',
    },
    nestedScrollContent: { paddingBottom: 24 },
    networkSection: { marginBottom: 16 },
    textCentred: {
      textAlign: 'center',
    },
  });

interface NetworkProps {
  isVisible: boolean;
  onClose: () => void;
  networkConfiguration: any;
  navigation: any;
  shouldNetworkSwitchPopToWallet: boolean;
  onNetworkSwitch?: () => void;
}

const NetworkModals = (props: NetworkProps) => {
  const {
    navigation,
    isVisible,
    onClose,
    networkConfiguration: {
      chainId,
      nickname,
      ticker,
      rpcUrl,
      formattedRpcUrl,
      rpcPrefs: { blockExplorerUrl, imageUrl },
    },
    shouldNetworkSwitchPopToWallet,
    onNetworkSwitch,
  } = props;

  const [showDetails, setShowDetails] = React.useState(false);
  const [networkAdded, setNetworkAdded] = React.useState(false);
  const [showCheckNetwork, setShowCheckNetwork] = React.useState(false);
  const [alerts, setAlerts] = React.useState<
    {
      alertError: string;
      alertSeverity: BannerAlertSeverity;
      alertOrigin: string;
    }[]
  >([]);

  const isCustomNetwork = true;
  const showDetailsModal = () => setShowDetails(!showDetails);
  const showCheckNetworkModal = () => setShowCheckNetwork(!showCheckNetwork);

  const { colors } = useTheme();
  const styles = createStyles(colors);

  const dispatch = useDispatch();

  const validateRpcUrl = (url: string) => {
    if (!isWebUri(url)) return false;
    return true;
  };

  const addNetwork = async () => {
    const validUrl = validateRpcUrl(rpcUrl);

    setNetworkAdded(validUrl);
  };

  const toggleUseSafeChainsListValidation = (value: boolean) => {
    const { PreferencesController } = Engine.context;
    PreferencesController?.setUseSafeChainsListValidation(value);
    if (!value) PreferencesController?.setUseSafeChainsListValidation(value);
  };

  const cancelButtonProps: ButtonProps = {
    variant: ButtonVariants.Secondary,
    label: strings('accountApproval.cancel'),
    size: ButtonSize.Lg,
    onPress: showCheckNetworkModal,
    testID: NetworkApprovalModalSelectorsIDs.CANCEL_BUTTON,
  };

  const confirmButtonProps: ButtonProps = {
    variant: ButtonVariants.Primary,
    label: strings('enter_password.confirm_button'),
    size: ButtonSize.Lg,
    onPress: () => {
      toggleUseSafeChainsListValidation(true);
      showCheckNetworkModal();
    },
    testID: NetworkApprovalModalSelectorsIDs.CONFIRM_NETWORK_CHECK,
  };

  const useSafeChainsListValidation = useSelector(
    selectUseSafeChainsListValidation,
  );

  const customNetworkInformation = {
    chainId,
    blockExplorerUrl,
    chainName: nickname,
    rpcUrl,
    icon: imageUrl,
    ticker,
    alerts,
  };

  const checkNetwork = useCallback(async () => {
    if (useSafeChainsListValidation) {
      const alertsNetwork = await checkSafeNetwork(
        chainId,
        rpcUrl,
        nickname,
        ticker,
      );

      setAlerts(alertsNetwork);
    }
  }, [chainId, rpcUrl, nickname, ticker, useSafeChainsListValidation]);

  useEffect(() => {
    checkNetwork();
  }, [checkNetwork]);

  const closeModal = () => {
    const { NetworkController } = Engine.context;
    const url = new URLPARSE(rpcUrl);
    const decimalChainId = getDecimalChainId(chainId);
    !isprivateConnection(url.hostname) && url.set('protocol', 'https:');
    NetworkController.upsertNetworkConfiguration(
      {
        rpcUrl: url.href,
        chainId: decimalChainId,
        ticker,
        nickname,
        rpcPrefs: { blockExplorerUrl },
      },
      {
        // Metrics-related properties required, but the metric event is a no-op
        // TODO: Use events for controller metric events
        referrer: 'ignored',
        source: 'ignored',
      },
    );
    onClose();
  };

  const switchNetwork = () => {
    const { NetworkController, CurrencyRateController } = Engine.context;
    const url = new URLPARSE(rpcUrl);
    const decimalChainId = getDecimalChainId(chainId);
    CurrencyRateController.setNativeCurrency(ticker);
    !isprivateConnection(url.hostname) && url.set('protocol', 'https:');
    NetworkController.upsertNetworkConfiguration(
      {
        rpcUrl: url.href,
        chainId: decimalChainId,
        ticker,
        nickname,
        rpcPrefs: { blockExplorerUrl },
      },
      {
        setActive: true,
        // Metrics-related properties required, but the metric event is a no-op
        // TODO: Use events for controller metric events
        referrer: 'ignored',
        source: 'ignored',
      },
    );

    const analyticsParamsAdd = {
      chain_id: decimalChainId,
      source: 'Popular network list',
      symbol: ticker,
    };

    AnalyticsV2.trackEvent(MetaMetricsEvents.NETWORK_ADDED, analyticsParamsAdd);

    closeModal();
    if (onNetworkSwitch) {
      onNetworkSwitch();
    } else {
      shouldNetworkSwitchPopToWallet
        ? navigation.navigate('WalletView')
        : navigation.goBack();
    }
    dispatch(networkSwitched({ networkUrl: url.href, networkStatus: true }));
  };

  return (
    <Modal
      isVisible={isVisible}
      animationIn="slideInUp"
      animationOut="slideOutDown"
      style={styles.bottomModal}
      backdropOpacity={0.7}
      animationInTiming={600}
      animationOutTiming={600}
      propagateSwipe
    >
      <View style={styles.modalContainer}>
        {showCheckNetwork ? (
          <View>
            <View>
              <Text reset style={styles.title}>
                {strings('app_settings.use_safe_chains_list_validation')}
              </Text>
              <Text style={styles.bottomSpace}>
                {strings('app_settings.use_safe_chains_list_validation_desc')}
              </Text>

              <Text>
                {strings('networks.network_select_confirm_use_safe_check')}
                <Text bold>
                  {strings('networks.network_settings_security_privacy')}
                </Text>{' '}
              </Text>

              <View style={styles.actionContainer}>
                <BottomSheetFooter
                  buttonsAlignment={ButtonsAlignment.Horizontal}
                  buttonPropsArray={[cancelButtonProps, confirmButtonProps]}
                />
              </View>
            </View>
          </View>
        ) : showDetails ? (
          <NetworkDetails
            goBack={showDetailsModal}
            chainId={chainId}
            nickname={nickname}
            ticker={ticker}
            rpcUrl={formattedRpcUrl || rpcUrl}
            blockExplorerUrl={blockExplorerUrl}
          />
        ) : networkAdded ? (
          <NetworkAdded
            nickname={nickname}
            closeModal={closeModal}
            switchNetwork={switchNetwork}
          />
        ) : (
          <View>
            <View style={styles.notchWrapper}>
              <View style={styles.notch} />
            </View>

            <View style={styles.root}>
              <NetworkVerificationInfo
                customNetworkInformation={customNetworkInformation}
                onReject={onClose}
                onConfirm={addNetwork}
                isCustomNetwork={isCustomNetwork}
              />
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
};

export default NetworkModals;
