import { useNavigation } from '@react-navigation/native';
import React, { useMemo, useRef } from 'react';
import { TouchableOpacity, View } from 'react-native';
import {
  Text,
  TextVariant,
  Icon,
  IconName,
} from '@metamask/design-system-react-native';
import { useSelector } from 'react-redux';
import Engine from '../../../../../core/Engine';
import NotificationManager from '../../../../../core/NotificationManager';
import Routes from '../../../../../constants/navigation/Routes';
import { useStyles } from '../../../../../component-library/hooks';
import { useMetrics } from '../../../../hooks/useMetrics';
import { strings } from '../../../../../../locales/i18n';
import { selectEvmChainId } from '../../../../../selectors/networkController';
import styleSheet from './AssetOptions.styles';
import { selectTokenList } from '../../../../../selectors/tokenListController';
import Logger from '../../../../../util/Logger';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import AppConstants from '../../../../../core/AppConstants';
import { getDecimalChainId } from '../../../../../util/networks';
import { isPortfolioUrl } from '../../../../../util/url';
import { BrowserTab, TokenI } from '../../../Tokens/types';
import { CaipAssetType, Hex } from '@metamask/utils';
import { useBuildPortfolioUrl } from '../../../../hooks/useBuildPortfolioUrl';
import InAppBrowser from 'react-native-inappbrowser-reborn';
import { isNonEvmChainId } from '../../../../../core/Multichain/utils';
import { selectSelectedInternalAccountByScope } from '../../../../../selectors/multichainAccounts/accounts';
import { removeNonEvmToken } from '../../../Tokens/util';
import {
  toChecksumAddress,
  areAddressesEqual,
} from '../../../../../util/address';
import { selectAssetsBySelectedAccountGroup } from '../../../../../selectors/assets/assets-list';
import useBlockExplorer from '../../../../hooks/useBlockExplorer';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../../component-library/components/BottomSheets/BottomSheetHeader';

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
  const { styles } = useStyles(styleSheet);
  const navigation = useNavigation();
  const modalRef = useRef<BottomSheetRef>(null);
  const tokenList = useSelector(selectTokenList);
  const chainId = useSelector(selectEvmChainId);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const browserTabs = useSelector((state: any) => state.browser.tabs);
  // Get the selected account for the current network (works for all non-EVM chains)
  const selectInternalAccountByScope = useSelector(
    selectSelectedInternalAccountByScope,
  );
  const buildPortfolioUrlWithMetrics = useBuildPortfolioUrl();
  const assets = useSelector(selectAssetsBySelectedAccountGroup);

  // Check if token exists in state
  const tokenExistsInState = useMemo(() => {
    // selectAssetsBySelectedAccountGroup returns { [chainId: string]: Asset[] }
    const chainAssets = assets[networkId] || [];
    if (!chainAssets.length) {
      return false;
    }

    if (isNonEvmChainId(networkId)) {
      // For non-EVM chains, the address is already in CAIP asset format (e.g., "solana:mainnet/token:...")
      // Check if any asset has a matching assetId
      return chainAssets.some((assetItem) => assetItem.assetId === address);
    }

    // For EVM tokens, asset.assetId equals the address (already in hex)
    return chainAssets.some((assetItem) =>
      assetItem.assetId ? areAddressesEqual(assetItem.assetId, address) : false,
    );
  }, [assets, networkId, address]);

  const explorer = useBlockExplorer(asset.chainId ?? networkId);
  const { trackEvent, createEventBuilder } = useMetrics();

  const goToBrowserUrl = (url: string, title: string) => {
    modalRef.current?.onCloseBottomSheet(() => {
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
    // Extract actual token address from CAIP format for non-EVM chains
    const tokenAddress = isNonEvmChainId(networkId)
      ? extractTokenAddressFromCaip(address)
      : address;

    // Check if this is a native currency or wrapped native token (like wSOL)
    const isNativeToken =
      isNativeCurrency || isNativeTokenAddress(address, networkId);

    // For native currencies, go to the base block explorer URL
    // For tokens, go to the address/account page
    const url = isNativeToken
      ? explorer.getBlockExplorerBaseUrl(networkId)
      : explorer.getBlockExplorerUrl(tokenAddress, networkId);

    if (url) {
      goToBrowserUrl(url, explorer.getBlockExplorerName(networkId));
    }
  };

  const openTokenDetails = () => {
    modalRef.current?.onCloseBottomSheet(() => {
      // Extract the actual token address from CAIP format only for non-EVM chains
      const tokenAddress = isNonEvmChainId(networkId)
        ? extractTokenAddressFromCaip(address)
        : address;
      navigation.navigate('AssetDetails', {
        address: toChecksumAddress(tokenAddress),
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
      const portfolioUrl = buildPortfolioUrlWithMetrics(
        AppConstants.PORTFOLIO.URL,
      );

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
    navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: 'AssetHideConfirmation',
      params: {
        onConfirm: async () => {
          navigation.navigate('WalletView');
          try {
            let tokenSymbol;
            if (isNonEvmChainId(networkId)) {
              // Use the utility function for non-EVM token removal
              await removeNonEvmToken({
                tokenAddress: address,
                tokenChainId: networkId,
                selectInternalAccountByScope,
              });

              // Get token symbol for notification
              const { MultichainAssetsController } = Engine.context;
              tokenSymbol =
                MultichainAssetsController.state.assetsMetadata[
                  address as CaipAssetType
                ]?.symbol || null;
            } else {
              const { TokensController, NetworkController } = Engine.context;

              const networkClientId =
                NetworkController.findNetworkClientIdByChainId(
                  networkId as Hex,
                );
              await TokensController.ignoreTokens([address], networkClientId);
              tokenSymbol = tokenList[address.toLowerCase()]?.symbol || null;
            }

            NotificationManager.showSimpleNotification({
              status: `simple_notification`,
              duration: 5000,
              title: strings('wallet.token_toast.token_hidden_title'),
              description: strings('wallet.token_toast.token_hidden_desc', {
                tokenSymbol,
              }),
            });
            trackEvent(
              createEventBuilder(MetaMetricsEvents.TOKENS_HIDDEN)
                .addProperties({
                  location: 'token_details',
                  token_standard: 'ERC20',
                  asset_type: 'token',
                  tokens: [
                    `${tokenList[address.toLowerCase()]?.symbol} - ${address}`,
                  ],
                  chain_id: getDecimalChainId(chainId),
                })
                .build(),
            );
          } catch (err) {
            Logger.log(err, 'AssetDetails: Failed to hide token!');
          }
        },
      },
    });
  };

  const renderOptions = () => {
    const options: Option[] = [];

    // Check if this is a native currency or wrapped native token (like wSOL)
    const isNativeToken =
      isNativeCurrency || isNativeTokenAddress(address, networkId);

    !isNonEvmChainId(networkId) &&
      options.push({
        label: strings('asset_details.options.view_on_portfolio'),
        onPress: openPortfolio,
        icon: IconName.Export,
      });
    Boolean(explorer.getBlockExplorerName(networkId)) &&
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
      tokenExistsInState &&
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
                <Icon name={icon} />
                <Text>{label}</Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </>
    );
  };

  return (
    <BottomSheet ref={modalRef}>
      <BottomSheetHeader onClose={() => modalRef.current?.onCloseBottomSheet()}>
        <Text variant={TextVariant.HeadingMd}>
          {strings('asset_details.options.title')}
        </Text>
      </BottomSheetHeader>
      <View>{renderOptions()}</View>
    </BottomSheet>
  );
};

export default AssetOptions;
