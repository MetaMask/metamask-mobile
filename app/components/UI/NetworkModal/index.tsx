import Modal from 'react-native-modal';
import React, { useCallback, useEffect } from 'react';
import { View } from 'react-native';
import { strings } from '../../../../locales/i18n';
import Text from '../../Base/Text';
import NetworkDetails from './NetworkDetails';
import NetworkAdded from './NetworkAdded';
import Engine from '../../../core/Engine';
import { isPrivateConnection } from '../../../util/networks';
import { toggleUseSafeChainsListValidation } from '../../../util/networks/engineNetworkUtils';
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
import { NetworkApprovalBottomSheetSelectorsIDs } from '../../../../e2e/selectors/Network/NetworkApprovalBottomSheet.selectors';
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
import { selectEvmNetworkConfigurationsByChainId } from '../../../selectors/networkController';

import {
  NetworkConfiguration,
  RpcEndpointType,
  AddNetworkFields,
} from '@metamask/network-controller';
import { Network } from '../../Views/Settings/NetworksSettings/NetworkSettings/CustomNetworkView/CustomNetwork.types';
import { Hex } from '@metamask/utils';
import { addItemToChainIdList } from '../../../util/metrics/MultichainAPI/networkMetricUtils';
import { useNetworkSelection } from '../../hooks/useNetworkSelection/useNetworkSelection';
import {
  useNetworksByNamespace,
  NetworkType,
} from '../../hooks/useNetworksByNamespace/useNetworksByNamespace';

export interface SafeChain {
  chainId: string;
  name: string;
  nativeCurrency: { symbol: string };
  rpc: string[];
}

export type NetworkConfigurationOptions = Omit<Network, 'rpcPrefs'> & {
  formattedRpcUrl?: string | null;
  rpcPrefs: Omit<Network['rpcPrefs'], 'imageSource'>;
};

interface NetworkProps {
  isVisible: boolean;
  onClose: () => void;
  networkConfiguration: NetworkConfigurationOptions;
  showPopularNetworkModal: boolean;
  safeChains?: SafeChain[];
  onReject?: () => void;
  onAccept?: () => void;
  autoSwitchNetwork?: boolean;
  allowNetworkSwitch?: boolean;
  skipEnableNetwork?: boolean;
}

const NetworkModals = (props: NetworkProps) => {
  const {
    isVisible,
    onClose,
    networkConfiguration: {
      chainId,
      nickname,
      ticker,
      rpcUrl,
      failoverRpcUrls,
      formattedRpcUrl,
      rpcPrefs: { blockExplorerUrl, imageUrl },
    },
    showPopularNetworkModal,
    safeChains,
    onReject,
    onAccept,
    autoSwitchNetwork,
    allowNetworkSwitch = true,
    skipEnableNetwork = false,
  } = props;
  const { trackEvent, createEventBuilder, addTraitsToUser } = useMetrics();

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

  const showDetailsModal = () => setShowDetails(!showDetails);
  const showCheckNetworkModal = () => setShowCheckNetwork(!showCheckNetwork);

  const { colors } = useTheme();
  const styles = createNetworkModalStyles(colors);

  const dispatch = useDispatch();
  const { networks } = useNetworksByNamespace({
    networkType: NetworkType.Popular,
  });
  const { selectNetwork } = useNetworkSelection({
    networks,
  });

  const validateRpcUrl = (url: string) => {
    if (!isWebUri(url)) return false;
    return true;
  };

  const customNetworkInformation = {
    chainId,
    blockExplorerUrl,
    chainName: nickname,
    rpcUrl,
    icon: imageUrl,
    ticker,
    alerts,
  };

  const onUpdateNetworkFilter = useCallback(() => {
    selectNetwork(chainId as `0x${string}`);
  }, [chainId, selectNetwork]);

  const cancelButtonProps: ButtonProps = {
    variant: ButtonVariants.Secondary,
    label: strings('accountApproval.cancel'),
    size: ButtonSize.Lg,
    onPress: showCheckNetworkModal,
    testID: NetworkApprovalBottomSheetSelectorsIDs.CANCEL_BUTTON,
  };

  const confirmButtonProps: ButtonProps = {
    variant: ButtonVariants.Primary,
    label: strings('enter_password.confirm_button'),
    size: ButtonSize.Lg,
    onPress: () => {
      toggleUseSafeChainsListValidation(true);
      showCheckNetworkModal();
    },
    testID: NetworkApprovalBottomSheetSelectorsIDs.CONFIRM_NETWORK_CHECK,
  };

  const useSafeChainsListValidation = useSelector(
    selectUseSafeChainsListValidation,
  );

  const networkConfigurationByChainId = useSelector(
    selectEvmNetworkConfigurationsByChainId,
  );

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
    !isPrivateConnection(url.hostname) && url.set('protocol', 'https:');

    const existingNetwork = networkConfigurationByChainId[chainId as Hex];
    let networkClientId;

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

      networkClientId =
        updatedNetwork?.rpcEndpoints?.[updatedNetwork.defaultRpcEndpointIndex]
          ?.networkClientId;
    } else {
      const addedNetwork = await NetworkController.addNetwork({
        chainId: chainId as Hex,
        blockExplorerUrls: [blockExplorerUrl],
        defaultRpcEndpointIndex: 0,
        defaultBlockExplorerUrlIndex: 0,
        name: nickname,
        nativeCurrency: ticker,
        rpcEndpoints: [
          {
            url: rpcUrl,
            failoverUrls: failoverRpcUrls,
            name: nickname,
            type: RpcEndpointType.Custom,
          },
        ],
      });

      addTraitsToUser(addItemToChainIdList(chainId));

      networkClientId =
        addedNetwork?.rpcEndpoints?.[addedNetwork.defaultRpcEndpointIndex]
          ?.networkClientId;
    }

    if (networkClientId && !skipEnableNetwork) {
      onUpdateNetworkFilter();
    }

    onClose();
    onAccept?.();
  };

  const handleExistingNetwork = async (
    existingNetwork: NetworkConfiguration,
    networkId: string,
  ) => {
    const { NetworkController, MultichainNetworkController } = Engine.context;
    const updatedNetwork = await NetworkController.updateNetwork(
      existingNetwork.chainId,
      existingNetwork,
      existingNetwork.chainId === networkId
        ? {
            replacementSelectedRpcEndpointIndex:
              existingNetwork.defaultRpcEndpointIndex,
          }
        : undefined,
    );

    const { networkClientId } =
      updatedNetwork?.rpcEndpoints?.[updatedNetwork.defaultRpcEndpointIndex] ??
      {};
    onUpdateNetworkFilter();
    await MultichainNetworkController.setActiveNetwork(networkClientId);
  };

  const handleNewNetwork = async (
    networkId: `0x${string}`,
    networkRpcUrl: string,
    networkFailoverRpcUrls: string[] | undefined,
    name: string,
    nativeCurrency: string,
    networkBlockExplorerUrl: string,
  ) => {
    const { NetworkController } = Engine.context;
    const networkConfig = {
      chainId: networkId,
      blockExplorerUrls: networkBlockExplorerUrl
        ? [networkBlockExplorerUrl]
        : [],
      defaultRpcEndpointIndex: 0,
      defaultBlockExplorerUrlIndex: blockExplorerUrl ? 0 : undefined,
      name,
      nativeCurrency,
      rpcEndpoints: [
        {
          url: networkRpcUrl,
          failoverUrls: networkFailoverRpcUrls,
          name,
          type: RpcEndpointType.Custom,
        },
      ],
    } satisfies AddNetworkFields;

    return NetworkController.addNetwork(networkConfig);
  };

  const switchNetwork = async () => {
    const { MultichainNetworkController } = Engine.context;
    const url = new URLPARSE(rpcUrl);
    const existingNetwork = networkConfigurationByChainId[chainId as Hex];

    if (!isPrivateConnection(url.hostname)) {
      url.set('protocol', 'https:');
    }

    if (existingNetwork) {
      await handleExistingNetwork(existingNetwork, chainId);
    } else {
      const addedNetwork = await handleNewNetwork(
        chainId as Hex,
        rpcUrl,
        failoverRpcUrls,
        nickname,
        ticker,
        blockExplorerUrl,
      );

      addTraitsToUser(addItemToChainIdList(chainId));

      const { networkClientId } =
        addedNetwork?.rpcEndpoints?.[addedNetwork.defaultRpcEndpointIndex] ??
        {};

      onUpdateNetworkFilter();
      await MultichainNetworkController.setActiveNetwork(networkClientId);
    }
    onClose();

    dispatch(networkSwitched({ networkUrl: url.href, networkStatus: true }));
    onAccept?.();
  };

  const addNetwork = async () => {
    const isValidUrl = validateRpcUrl(rpcUrl);
    if (showPopularNetworkModal) {
      // track popular network
      trackEvent(
        createEventBuilder(MetaMetricsEvents.NETWORK_ADDED)
          .addProperties({
            chain_id: toHex(chainId),
            source: 'Popular network list',
            symbol: ticker,
          })
          .build(),
      );
    } else if (safeChains) {
      const { safeChain, safeRPCUrl } = rpcIdentifierUtility(
        rpcUrl,
        safeChains,
      );
      // track custom network, this shouldn't be in popular networks modal
      trackEvent(
        createEventBuilder(MetaMetricsEvents.NETWORK_ADDED)
          .addProperties({
            chain_id: toHex(safeChain.chainId),
            source: { anonymous: true, value: 'Custom Network Added' },
            symbol: safeChain.nativeCurrency.symbol,
          })
          .addSensitiveProperties({ rpcUrl: safeRPCUrl })
          .build(),
      );
    } else {
      Logger.log('MetaMetrics - Unable to capture custom network');
    }

    if (autoSwitchNetwork) {
      switchNetwork();
    } else {
      setNetworkAdded(isValidUrl);
    }
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
      onBackdropPress={onClose}
      onSwipeComplete={onClose}
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
                onReject={() => {
                  onReject?.();
                  onClose();
                }}
                onConfirm={allowNetworkSwitch ? addNetwork : closeModal}
                isCustomNetwork={!showPopularNetworkModal}
              />
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
};

export default NetworkModals;
