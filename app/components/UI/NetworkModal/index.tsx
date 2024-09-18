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
import { rpcIdentifierUtility } from '../../../components/hooks/useSafeChains';
import Logger from '../../../util/Logger';
import { selectNetworkConfigurations } from '../../../selectors/networkController';
import { RpcEndpointType } from '@metamask/network-controller';

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
  safeChains?: SafeChain[];
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
    safeChains,
  } = props;
  const { trackEvent } = useMetrics();
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
  const styles = createNetworkModalStyles(colors);

  const dispatch = useDispatch();

  const validateRpcUrl = (url: string) => {
    if (!isWebUri(url)) return false;
    return true;
  };

  const addNetwork = async () => {
    const isValidUrl = validateRpcUrl(rpcUrl);
    if (showPopularNetworkModal) {
      // emit popular network
      trackEvent(MetaMetricsEvents.NETWORK_ADDED, {
        chain_id: toHex(chainId),
        source: 'Popular network list',
        symbol: ticker,
      });
    } else if (safeChains) {
      const { safeChain, safeRPCUrl } = rpcIdentifierUtility(
        rpcUrl,
        safeChains,
      );
      // emit custom network, this shouldn't be in popular networks modal
      trackEvent(MetaMetricsEvents.NETWORK_ADDED, {
        chain_id: toHex(safeChain.chainId),
        source: 'Custom Network Added',
        symbol: safeChain.nativeCurrency.symbol,
        sensitiveProperties: {
          rpcUrl: safeRPCUrl,
        },
      });
    } else {
      Logger.log('MetaMetrics - Unable to capture custom network');
    }
    setNetworkAdded(isValidUrl);
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

  const networkConfigurationByChainId = useSelector(
    selectNetworkConfigurations,
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

  const closeModal = async () => {
    const { NetworkController } = Engine.context;
    const url = new URLPARSE(rpcUrl);
    !isprivateConnection(url.hostname) && url.set('protocol', 'https:');

    const existingNetwork = networkConfigurationByChainId[chainId];

    if (existingNetwork) {
      const updatedNetwork = await NetworkController.updateNetwork(
        existingNetwork.chainId,
        existingNetwork,
        existingNetwork.chainId === chainId
          ? {
              replacementSelectedRpcEndpointIndex:
                existingNetwork.defaultRpcEndpointIndex,
            }
          : undefined,
      );
      await NetworkController.setActiveNetwork(
        updatedNetwork.rpcEndpoints[updatedNetwork.defaultRpcEndpointIndex]
          .networkClientId,
      );
    } else {
      const addedNetwork = await NetworkController.addNetwork({
        chainId,
        blockExplorerUrls: [blockExplorerUrl],
        defaultRpcEndpointIndex: 0,
        defaultBlockExplorerUrlIndex: 0,
        name: nickname,
        nativeCurrency: ticker,
        rpcEndpoints: [
          {
            url: rpcUrl,
            name: nickname,
            type: RpcEndpointType.Custom,
          },
        ],
      });
      await NetworkController.setActiveNetwork(
        addedNetwork.rpcEndpoints[addedNetwork.defaultRpcEndpointIndex]
          .networkClientId,
      );
    }
    onClose();
  };

  const handleExistingNetwork = async (
    existingNetwork,
    chainId,
    NetworkController,
  ) => {
    const updatedNetwork = await NetworkController.updateNetwork(
      existingNetwork.chainId,
      existingNetwork,
      existingNetwork.chainId === chainId
        ? {
            replacementSelectedRpcEndpointIndex:
              existingNetwork.defaultRpcEndpointIndex,
          }
        : undefined,
    );

    await NetworkController.setActiveNetwork(
      updatedNetwork.rpcEndpoints[updatedNetwork.defaultRpcEndpointIndex]
        .networkClientId,
    );
  };

  const handleNewNetwork = async (
    chainId,
    rpcUrl,
    nickname,
    ticker,
    blockExplorerUrl,
    NetworkController,
  ) => {
    const networkConfig = {
      chainId,
      blockExplorerUrls: blockExplorerUrl ? [blockExplorerUrl] : [],
      defaultRpcEndpointIndex: 0,
      defaultBlockExplorerUrlIndex: blockExplorerUrl ? 0 : undefined,
      name: nickname,
      nativeCurrency: ticker,
      rpcEndpoints: [
        {
          url: rpcUrl,
          name: nickname,
          type: RpcEndpointType.Custom,
        },
      ],
    };

    return NetworkController.addNetwork(networkConfig);
  };

  const handleNavigation = (
    onNetworkSwitch,
    shouldNetworkSwitchPopToWallet,
    navigation,
  ) => {
    if (onNetworkSwitch) {
      onNetworkSwitch();
    } else {
      shouldNetworkSwitchPopToWallet
        ? navigation.navigate('WalletView')
        : navigation.goBack();
    }
  };

  const switchNetwork = async () => {
    const { NetworkController, CurrencyRateController } = Engine.context;
    const url = new URLPARSE(rpcUrl);
    const existingNetwork = networkConfigurationByChainId[chainId];

    CurrencyRateController.updateExchangeRate(ticker);

    if (!isprivateConnection(url.hostname)) {
      url.set('protocol', 'https:');
    }

    if (existingNetwork) {
      await handleExistingNetwork(existingNetwork, chainId, NetworkController);
    } else {
      const addedNetwork = await handleNewNetwork(
        chainId,
        rpcUrl,
        nickname,
        ticker,
        blockExplorerUrl,
        NetworkController,
      );
      await NetworkController.setActiveNetwork(
        addedNetwork.rpcEndpoints[addedNetwork.defaultRpcEndpointIndex]
          .networkClientId,
      );
    }

    closeModal();
    handleNavigation(
      onNetworkSwitch,
      shouldNetworkSwitchPopToWallet,
      navigation,
    );
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
