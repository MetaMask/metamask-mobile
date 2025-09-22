import { useNavigation } from '@react-navigation/native';
import React, { useMemo, useRef } from 'react';
import { Text, TouchableOpacity, View, InteractionManager } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import Engine from '../../../core/Engine';
import NotificationManager from '../../../core/NotificationManager';
import Routes from '../../../constants/navigation/Routes';
import { useStyles } from '../../../component-library/hooks';
import { useMetrics } from '../../../components/hooks/useMetrics';
import { strings } from '../../../../locales/i18n';
import Icon, {
  IconName,
} from '../../../component-library/components/Icons/Icon';
import useBlockExplorer from '../../../components/UI/Swaps/utils/useBlockExplorer';
import {
  createProviderConfig,
  selectEvmChainId,
  selectEvmNetworkConfigurationsByChainId,
  selectProviderConfig,
} from '../../../selectors/networkController';
import ReusableModal, { ReusableModalRef } from '../../UI/ReusableModal';
import styleSheet from './AssetOptions.styles';
import { selectTokenList } from '../../../selectors/tokenListController';
import Logger from '../../../util/Logger';
import { MetaMetricsEvents } from '../../../core/Analytics';
import AppConstants from '../../../core/AppConstants';
import {
  findBlockExplorerForNonEvmChainId,
  getDecimalChainId,
  isPortfolioViewEnabled,
} from '../../../util/networks';
import { isPortfolioUrl } from '../../../util/url';
import { BrowserTab, TokenI } from '../../../components/UI/Tokens/types';
import { RootState } from '../../../reducers';
import { Hex } from '@metamask/utils';
import { appendURLParams } from '../../../util/browser';
import InAppBrowser from 'react-native-inappbrowser-reborn';
import { isNonEvmChainId } from '../../../core/Multichain/utils';

// Wrapped SOL token address on Solana
const WRAPPED_SOL_ADDRESS = 'So11111111111111111111111111111111111111111';

/**
 * Extracts the token address from a CAIP (Chain Agnostic Improvement Proposal) formatted address
 * Format: {namespace}:{chainId}/token:{tokenAddress}
 * Example: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
 * Returns: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
 */
const extractTokenAddressFromCaip = (caipAddress: string): string => {
  // Check if it's a CAIP formatted address with token prefix
  if (caipAddress.includes('/token:')) {
    const parts = caipAddress.split('/token:');
    return parts[1] || caipAddress;
  }

  // If not CAIP format, return the original address
  return caipAddress;
};

/**
 * Checks if the given address represents a native token for the chain
 * For Solana, wrapped SOL is considered native
 */
const isNativeTokenAddress = (address: string, chainId: string): boolean => {
  if (isNonEvmChainId(chainId)) {
    // Extract token address from CAIP format if needed
    const tokenAddress = extractTokenAddressFromCaip(address);
    // For Solana, wrapped SOL is considered native
    return tokenAddress === WRAPPED_SOL_ADDRESS;
  }
  return false;
};

interface Option {
  label: string;
  onPress: () => void;
  icon: IconName;
}

interface Props {
  route: {
    params: {
      address: string;
      isNativeCurrency: boolean;
      chainId: string;
      asset: TokenI;
    };
  };
}

const AssetOptions = (props: Props) => {
  const {
    address,
    isNativeCurrency,
    chainId: networkId,
    asset,
  } = props.route.params;
  const { styles } = useStyles(styleSheet, {});
  const safeAreaInsets = useSafeAreaInsets();
  const navigation = useNavigation();
  const modalRef = useRef<ReusableModalRef>(null);
  const providerConfig = useSelector(selectProviderConfig);
  const networkConfigurations = useSelector(
    selectEvmNetworkConfigurationsByChainId,
  );
  const tokenList = useSelector(selectTokenList);
  const chainId = useSelector(selectEvmChainId);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const browserTabs = useSelector((state: any) => state.browser.tabs);
  const isDataCollectionForMarketingEnabled = useSelector(
    (state: RootState) => state.security.dataCollectionForMarketing,
  );

  // Memoize the provider config for the token explorer
  const { providerConfigTokenExplorer } = useMemo(() => {
    if (isNonEvmChainId(networkId)) {
      return {
        providerConfigTokenExplorer: null,
      };
    }
    const tokenNetworkConfig = networkConfigurations[networkId as Hex];
    const tokenRpcEndpoint =
      tokenNetworkConfig?.rpcEndpoints?.[
        tokenNetworkConfig?.defaultRpcEndpointIndex
      ];
    let providerConfigToken;
    if (isPortfolioViewEnabled()) {
      providerConfigToken = createProviderConfig(
        tokenNetworkConfig,
        tokenRpcEndpoint,
      );
    } else {
      providerConfigToken = providerConfig;
    }

    const providerConfigTokenExplorerToken = providerConfigToken;

    return {
      providerConfigTokenExplorer: providerConfigTokenExplorerToken,
    };
  }, [networkId, networkConfigurations, providerConfig]);

  const explorer = useBlockExplorer(
    networkConfigurations,
    providerConfigTokenExplorer,
  );
  const { trackEvent, isEnabled, createEventBuilder } = useMetrics();

  const goToBrowserUrl = (url: string, title: string) => {
    modalRef.current?.dismissModal(() => {
      (async () => {
        if (await InAppBrowser.isAvailable()) {
          await InAppBrowser.open(url);
        } else {
          navigation.navigate('Webview', {
            screen: 'SimpleWebview',
            params: {
              url,
              title,
            },
          });
        }
      })();
    });
  };

  const openOnBlockExplorer = () => {
    let explorerToUse = explorer;
    if (isNonEvmChainId(networkId)) {
      const solanaExplorer = findBlockExplorerForNonEvmChainId(networkId);
      explorerToUse = {
        baseUrl: solanaExplorer,
        token: (tokenAddress: string) =>
          `${solanaExplorer}/token/${tokenAddress}`,
        account: (accountAddress: string) =>
          `${solanaExplorer}/account/${accountAddress}`,
        tx: (hash: string) => `${solanaExplorer}/tx/${hash}`,
        name: 'Block Explorer',
        value: null,
        isValid: true,
        isRPC: false,
      };
    }
    let url = '';
    const title = new URL(explorerToUse.baseUrl).hostname;

    // Check if this is a native currency or wrapped native token (like wSOL)
    const isNativeToken =
      isNativeCurrency || isNativeTokenAddress(address, networkId);

    if (isNativeToken) {
      // Go to block explorer base URL for native tokens
      url = explorerToUse.baseUrl;
    } else {
      // Extract the actual token address from CAIP format only for non-EVM chains
      const tokenAddress = isNonEvmChainId(networkId)
        ? extractTokenAddressFromCaip(address)
        : address;
      // Go to token on block explorer
      url = explorerToUse.token(tokenAddress);
    }
    goToBrowserUrl(url, title);
  };

  const openTokenDetails = () => {
    modalRef.current?.dismissModal(() => {
      // Extract the actual token address from CAIP format only for non-EVM chains
      const tokenAddress = isNonEvmChainId(networkId)
        ? extractTokenAddressFromCaip(address)
        : address;
      navigation.navigate('AssetDetails', {
        address: tokenAddress,
        chainId: networkId,
        asset,
      });
    });
  };

  const openPortfolio = () => {
    const existingPortfolioTab = browserTabs.find(({ url }: BrowserTab) =>
      isPortfolioUrl(url),
    );

    let existingTabId;
    let newTabUrl;
    if (existingPortfolioTab) {
      existingTabId = existingPortfolioTab.id;
    } else {
      const analyticsEnabled = isEnabled();

      const portfolioUrl = appendURLParams(AppConstants.PORTFOLIO.URL, {
        metamaskEntry: 'mobile',
        metricsEnabled: analyticsEnabled,
        marketingEnabled: isDataCollectionForMarketingEnabled ?? false,
      });

      newTabUrl = portfolioUrl.href;
    }
    const params = {
      ...(newTabUrl && { newTabUrl }),
      ...(existingTabId && { existingTabId, newTabUrl: undefined }),
      timestamp: Date.now(),
    };
    navigation.navigate(Routes.BROWSER.HOME, {
      screen: Routes.BROWSER.VIEW,
      params,
    });
    trackEvent(
      createEventBuilder(MetaMetricsEvents.PORTFOLIO_LINK_CLICKED)
        .addProperties({
          portfolioUrl: AppConstants.PORTFOLIO.URL,
        })
        .build(),
    );
  };

  const removeToken = () => {
    const { TokensController } = Engine.context;
    navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: 'AssetHideConfirmation',
      params: {
        onConfirm: () => {
          navigation.navigate('WalletView');
          InteractionManager.runAfterInteractions(async () => {
            try {
              const { NetworkController } = Engine.context;

              const chainIdToUse = isPortfolioViewEnabled()
                ? networkId
                : chainId;

              const networkClientId =
                NetworkController.findNetworkClientIdByChainId(
                  chainIdToUse as Hex,
                );

              // Extract the actual token address from CAIP format only for non-EVM chains
              const tokenAddress = isNonEvmChainId(networkId)
                ? extractTokenAddressFromCaip(address)
                : address;
              await TokensController.ignoreTokens(
                [tokenAddress],
                networkClientId,
              );
              NotificationManager.showSimpleNotification({
                status: `simple_notification`,
                duration: 5000,
                title: strings('wallet.token_toast.token_hidden_title'),
                description: strings('wallet.token_toast.token_hidden_desc', {
                  tokenSymbol: tokenList[address.toLowerCase()]?.symbol || null,
                }),
              });
              trackEvent(
                createEventBuilder(MetaMetricsEvents.TOKENS_HIDDEN)
                  .addProperties({
                    location: 'token_details',
                    token_standard: 'ERC20',
                    asset_type: 'token',
                    tokens: [
                      `${
                        tokenList[address.toLowerCase()]?.symbol
                      } - ${address}`,
                    ],
                    chain_id: getDecimalChainId(chainId),
                  })
                  .build(),
              );
            } catch (err) {
              Logger.log(err, 'AssetDetails: Failed to hide token!');
            }
          });
        },
      },
    });
  };

  const renderOptions = () => {
    const options: Option[] = [];

    // Check if this is a native currency or wrapped native token (like wSOL)
    const isNativeToken =
      isNativeCurrency || isNativeTokenAddress(address, networkId);

    options.push({
      label: strings('asset_details.options.view_on_portfolio'),
      onPress: openPortfolio,
      icon: IconName.Export,
    });
    Boolean(explorer.baseUrl) &&
      options.push({
        label: strings('asset_details.options.view_on_block'),
        onPress: openOnBlockExplorer,
        icon: IconName.Export,
      });
    !isNativeToken &&
      !isNonEvmChainId(networkId) &&
      options.push({
        label: strings('asset_details.options.token_details'),
        onPress: openTokenDetails,
        icon: IconName.DocumentCode,
      });
    !isNativeToken &&
      !isNonEvmChainId(networkId) &&
      options.push({
        label: strings('asset_details.options.remove_token'),
        onPress: removeToken,
        icon: IconName.Trash,
      });
    return (
      <>
        {options.map((option) => {
          const { label, onPress, icon } = option;
          return (
            <View key={label}>
              <TouchableOpacity style={styles.optionButton} onPress={onPress}>
                <Icon name={icon} style={styles.icon} />
                <Text style={styles.optionLabel}>{label}</Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </>
    );
  };

  return (
    <ReusableModal ref={modalRef} style={styles.screen}>
      <View style={[styles.sheet, { paddingBottom: safeAreaInsets.bottom }]}>
        <View style={styles.notch} />
        {renderOptions()}
      </View>
    </ReusableModal>
  );
};

export default AssetOptions;
