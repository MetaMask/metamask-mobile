import Modal from 'react-native-modal';
import React, { useCallback, useEffect } from 'react';
import { View } from 'react-native';
import { strings } from '../../../../locales/i18n';
import Text from '../../Base/Text';
import NetworkDetails from './NetworkDetails';
import NetworkAdded from './NetworkAdded';
import Engine from '../../../core/Engine';
import {
  isprivateConnection,
  toggleUseSafeChainsListValidation,
} from '../../../util/networks';
import getDecimalChainId from '../../../util/networks/getDecimalChainId';
import URLPARSE from 'url-parse';
import { isWebUri } from 'valid-url';
import { useDispatch, useSelector } from 'react-redux';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { BannerAlertSeverity } from '../../../component-library/components/Banners/Banner';
import {
  ButtonSize,
  ButtonVariants,
} from '../../../component-library/components/Buttons/Button';

import { useTheme } from '../../../util/theme';
import { networkSwitched } from '../../../actions/onboardNetwork';
import { NetworkApprovalModalSelectorsIDs } from '../../../../e2e/selectors/Modals/NetworkApprovalModal.selectors';
import { selectUseSafeChainsListValidation } from '../../../selectors/preferencesController';
import BottomSheetFooter, {
  ButtonsAlignment,
} from '../../../component-library/components/BottomSheets/BottomSheetFooter';
import { ButtonProps } from '../../../component-library/components/Buttons/Button/Button.types';
import checkSafeNetwork from '../../../core/RPCMethods/networkChecker.util';
import NetworkVerificationInfo from '../NetworkVerificationInfo';
import createNetworkModalStyles from './index.styles';
import { useMetrics } from '../../../components/hooks/useMetrics';
import { toHex } from '@metamask/controller-utils';
import {
  rpcIdentifierUtility,
  useSafeChains,
} from '../../../components/hooks/useSafeChains';
// import { ethers } from 'ethers';

export interface SafeChain {
  chainId: string;
  name: string;
  nativeCurrency: { symbol: string };
  rpc: string[];
}

interface NetworkProps {
  isVisible: boolean;
  onClose: () => void;
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  networkConfiguration: any;
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  navigation: any;
  shouldNetworkSwitchPopToWallet: boolean;
  onNetworkSwitch?: () => void;
  showPopularNetworkModal: boolean;
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
    showPopularNetworkModal,
    shouldNetworkSwitchPopToWallet,
    onNetworkSwitch,
  } = props;
  const { trackEvent, trackAnonymousEvent } = useMetrics();
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
  const { safeChains } = useSafeChains();

  const { colors } = useTheme();
  const styles = createNetworkModalStyles(colors);

  const dispatch = useDispatch();

  const validateRpcUrl = (url: string) => {
    if (!isWebUri(url)) return false;
    return true;
  };

  const addNetwork = async () => {
    const validUrl = validateRpcUrl(rpcUrl);
    if (!showPopularNetworkModal && safeChains) {
      // emit custom network
      trackAnonymousEvent(MetaMetricsEvents.NETWORK_ADDED, {
        chain_id: toHex(chainId), // prefixed chainId
        source: 'Custom network form',
        symbol: ticker,
        rpcUrl: rpcIdentifierUtility(rpcUrl, safeChains),
      });
    } else {
      // emit popular network
      trackEvent(MetaMetricsEvents.NETWORK_ADDED, {
        chain_id: toHex(chainId),
        source: 'Popular network list',
        symbol: ticker,
      });
    }

    setNetworkAdded(validUrl);
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
        getDecimalChainId(chainId),
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
    !isprivateConnection(url.hostname) && url.set('protocol', 'https:');
    NetworkController.upsertNetworkConfiguration(
      {
        rpcUrl: url.href,
        chainId,
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
    CurrencyRateController.updateExchangeRate(ticker);
    !isprivateConnection(url.hostname) && url.set('protocol', 'https:');
    NetworkController.upsertNetworkConfiguration(
      {
        rpcUrl: url.href,
        chainId,
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
                {strings('wallet.network_details_check')}
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
