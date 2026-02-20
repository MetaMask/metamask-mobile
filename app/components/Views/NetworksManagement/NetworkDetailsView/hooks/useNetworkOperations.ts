import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import {
  useNavigation,
  NavigationProp,
  ParamListBase,
} from '@react-navigation/native';
import { toHex } from '@metamask/controller-utils';
import { Hex, hexToNumber } from '@metamask/utils';
import type {
  AddNetworkFields,
  UpdateNetworkFields,
} from '@metamask/network-controller';
import UrlParse from 'url-parse';
import Engine from '../../../../../core/Engine';
import {
  selectIsAllNetworks,
  selectEvmNetworkConfigurationsByChainId,
  selectProviderConfig,
} from '../../../../../selectors/networkController';
import { selectTokenNetworkFilter } from '../../../../../selectors/preferencesController';
import { isPrivateConnection } from '../../../../../util/networks';
import { compareSanitizedUrl } from '../../../../../util/sanitizeUrl';
import onlyKeepHost from '../../../../../util/onlyKeepHost';
import { isPublicEndpointUrl } from '../../../../../core/Engine/controllers/network-controller/utils';
import { RPC } from '../../../../../constants/network';
import { updateIncomingTransactions } from '../../../../../util/transaction-controller';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import {
  addItemToChainIdList,
  removeItemFromChainIdList,
} from '../../../../../util/metrics/MultichainAPI/networkMetricUtils';
import Routes from '../../../../../constants/navigation/Routes';
import { infuraProjectId } from '../NetworkDetailsView.constants';
import type {
  NetworkFormState,
  RpcEndpoint,
} from '../NetworkDetailsView.types';

export interface UseNetworkOperationsReturn {
  /** Main save handler: validates, updates preferences, adds/updates network. */
  saveNetwork: (
    form: NetworkFormState,
    params: {
      enableAction: boolean;
      disabledByChainId: boolean;
      disabledBySymbol: boolean;
      isCustomMainnet: boolean;
      shouldNetworkSwitchPopToWallet: boolean;
      trackRpcUpdateFromBanner: boolean;
      validateChainIdOnSubmit: (
        formChainId: string,
        parsedChainId: string,
        rpcUrl: string,
      ) => Promise<boolean>;
    },
  ) => Promise<void>;
  /** Remove the current network and navigate back. */
  removeNetwork: (rpcUrl: string) => Promise<void>;
  /** Navigate to the edit screen for the current network. */
  goToNetworkEdit: (rpcUrl: string) => void;
}

export const useNetworkOperations = (): UseNetworkOperationsReturn => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const networkConfigurations = useSelector(
    selectEvmNetworkConfigurationsByChainId,
  );
  const providerConfig = useSelector(selectProviderConfig);
  const isAllNetworks = useSelector(selectIsAllNetworks);
  const tokenNetworkFilter = useSelector(selectTokenNetworkFilter);
  const { trackEvent, addTraitsToUser, createEventBuilder } = useAnalytics();

  // ---- Handle network add/update ------------------------------------------
  const handleNetworkUpdate = useCallback(
    async ({
      rpcUrl,
      chainId,
      nickname,
      ticker,
      blockExplorerUrl,
      blockExplorerUrls,
      rpcUrls,
      isNetworkNew,
      isCustomMainnet,
      shouldNetworkSwitchPopToWallet,
      trackRpcUpdateFromBanner,
    }: {
      rpcUrl: string;
      chainId: string;
      nickname: string;
      ticker: string;
      blockExplorerUrl: string | undefined;
      blockExplorerUrls: string[];
      rpcUrls: RpcEndpoint[];
      isNetworkNew: boolean;
      isCustomMainnet: boolean;
      shouldNetworkSwitchPopToWallet: boolean;
      trackRpcUpdateFromBanner: boolean;
    }) => {
      const { NetworkController } = Engine.context;

      const url = new UrlParse(rpcUrl);
      if (!isPrivateConnection(url.hostname)) {
        url.set('protocol', 'https:');
      }

      const hexChainId = chainId as Hex;
      const existingNetwork = networkConfigurations[hexChainId];
      const indexRpc = rpcUrls.findIndex((r) => r.url === rpcUrl);
      const blockExplorerIndex = blockExplorerUrls.findIndex(
        (u) => u === blockExplorerUrl,
      );

      const networkConfig = {
        blockExplorerUrls,
        chainId: hexChainId,
        rpcEndpoints: rpcUrls,
        nativeCurrency: ticker,
        name: nickname,
        defaultRpcEndpointIndex: indexRpc,
        defaultBlockExplorerUrlIndex:
          blockExplorerIndex !== -1 ? blockExplorerIndex : undefined,
      };

      if (!isNetworkNew && existingNetwork) {
        await NetworkController.updateNetwork(
          existingNetwork.chainId,
          networkConfig as unknown as UpdateNetworkFields,
          existingNetwork.chainId === hexChainId
            ? { replacementSelectedRpcEndpointIndex: indexRpc }
            : undefined,
        );

        if (trackRpcUpdateFromBanner) {
          const newRpcEndpoint =
            networkConfig.rpcEndpoints[networkConfig.defaultRpcEndpointIndex];
          const oldRpcEndpoint =
            existingNetwork.rpcEndpoints?.[
              existingNetwork.defaultRpcEndpointIndex ?? 0
            ];
          const chainIdAsDecimal = hexToNumber(hexChainId);
          const sanitizeRpc = (u: string) =>
            isPublicEndpointUrl(u, infuraProjectId ?? '')
              ? onlyKeepHost(u)
              : 'custom';

          trackEvent(
            createEventBuilder(
              MetaMetricsEvents.NetworkConnectionBannerRpcUpdated,
            )
              .addProperties({
                chain_id_caip: `eip155:${chainIdAsDecimal}`,
                from_rpc_domain: oldRpcEndpoint?.url
                  ? sanitizeRpc(oldRpcEndpoint.url)
                  : 'unknown',
                to_rpc_domain: sanitizeRpc(newRpcEndpoint.url),
              })
              .build(),
          );
        }
      } else {
        await NetworkController.addNetwork({
          ...networkConfig,
        } as unknown as AddNetworkFields);
        addTraitsToUser(addItemToChainIdList(networkConfig.chainId));
      }

      if (isCustomMainnet) {
        navigation.navigate('OptinMetrics');
      } else if (shouldNetworkSwitchPopToWallet) {
        navigation.navigate('WalletView');
      } else {
        navigation.goBack();
      }
    },
    [
      navigation,
      networkConfigurations,
      trackEvent,
      addTraitsToUser,
      createEventBuilder,
    ],
  );

  // ---- Main save handler --------------------------------------------------
  const saveNetwork = useCallback(
    async (
      form: NetworkFormState,
      params: {
        enableAction: boolean;
        disabledByChainId: boolean;
        disabledBySymbol: boolean;
        isCustomMainnet: boolean;
        shouldNetworkSwitchPopToWallet: boolean;
        trackRpcUpdateFromBanner: boolean;
        validateChainIdOnSubmit: (
          formChainId: string,
          parsedChainId: string,
          rpcUrl: string,
        ) => Promise<boolean>;
      },
    ) => {
      const {
        enableAction,
        disabledByChainId,
        disabledBySymbol,
        isCustomMainnet,
        shouldNetworkSwitchPopToWallet,
        trackRpcUpdateFromBanner,
        validateChainIdOnSubmit,
      } = params;

      if (!enableAction || disabledByChainId || disabledBySymbol) return;

      const {
        rpcUrl,
        chainId: stateChainId,
        nickname,
        blockExplorerUrls,
        blockExplorerUrl,
        rpcUrls,
        addMode,
      } = form;

      const ticker = form.ticker ? form.ticker.toUpperCase() : undefined;

      if (!stateChainId || !rpcUrl) return;

      // Check if network with this chainId already exists
      const isNetworkNew = addMode
        ? !Object.values(networkConfigurations).some(
            (cfg) => cfg.chainId === toHex(stateChainId),
          )
        : false;

      const formChainId = stateChainId.trim().toLowerCase();
      let chainId = formChainId;
      if (!chainId.startsWith('0x')) {
        chainId = `0x${parseInt(chainId, 10).toString(16)}`;
      }

      if (!(await validateChainIdOnSubmit(formChainId, chainId, rpcUrl))) {
        return;
      }

      // Update token network filter
      const { PreferencesController } = Engine.context;
      if (!isAllNetworks) {
        PreferencesController.setTokenNetworkFilter({ [chainId]: true });
      } else {
        PreferencesController.setTokenNetworkFilter({
          ...tokenNetworkFilter,
          [chainId]: true,
        });
      }

      const { NetworkEnablementController } = Engine.context;
      NetworkEnablementController.enableNetwork(chainId as Hex);

      await handleNetworkUpdate({
        rpcUrl,
        chainId,
        nickname: nickname ?? '',
        ticker: ticker ?? '',
        blockExplorerUrl,
        blockExplorerUrls,
        rpcUrls,
        isNetworkNew,
        isCustomMainnet,
        shouldNetworkSwitchPopToWallet,
        trackRpcUpdateFromBanner,
      });
    },
    [
      networkConfigurations,
      isAllNetworks,
      tokenNetworkFilter,
      handleNetworkUpdate,
    ],
  );

  // ---- Remove network -----------------------------------------------------
  const removeNetwork = useCallback(
    async (rpcUrl: string) => {
      if (
        compareSanitizedUrl(rpcUrl, providerConfig.rpcUrl ?? '') &&
        providerConfig.type === RPC
      ) {
        const { MultichainNetworkController } = Engine.context;
        const mainnetConfig = networkConfigurations['0x1' as Hex];
        const { networkClientId } =
          mainnetConfig?.rpcEndpoints?.[
            mainnetConfig?.defaultRpcEndpointIndex
          ] ?? {};
        await MultichainNetworkController.setActiveNetwork(networkClientId);
        setTimeout(async () => {
          await updateIncomingTransactions();
        }, 1000);
      }

      const entry = Object.entries(networkConfigurations).find(
        ([, cfg]) =>
          cfg.rpcEndpoints[cfg.defaultRpcEndpointIndex]?.url === rpcUrl,
      );

      if (!entry) {
        throw new Error(`Unable to find network with RPC URL ${rpcUrl}`);
      }
      const [, networkConfiguration] = entry;
      const { NetworkController } = Engine.context;
      NetworkController.removeNetwork(networkConfiguration.chainId);

      addTraitsToUser(removeItemFromChainIdList(networkConfiguration.chainId));

      navigation.goBack();
    },
    [navigation, networkConfigurations, providerConfig, addTraitsToUser],
  );

  // ---- Navigate to edit ---------------------------------------------------
  const goToNetworkEdit = useCallback(
    (rpcUrl: string) => {
      navigation.goBack();
      navigation.navigate(Routes.EDIT_NETWORK, {
        network: rpcUrl,
        shouldNetworkSwitchPopToWallet: false,
        shouldShowPopularNetworks: false,
      });
    },
    [navigation],
  );

  return {
    saveNetwork,
    removeNetwork,
    goToNetworkEdit,
  };
};
