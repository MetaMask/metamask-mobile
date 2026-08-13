import React, { useCallback, useMemo, useState } from 'react';
import { InteractionManager, LayoutAnimation, Platform } from 'react-native';
import { strings } from '../../../../../../locales/i18n';
import { MetaMetricsEvents } from '../../../../../core/Analytics';

import Alert, { AlertType } from '../../../../Base/Alert';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import { useSelector } from 'react-redux';
import { FORMATTED_NETWORK_NAMES } from '../../../../../constants/on-ramp';
import NotificationManager from '../../../../../core/NotificationManager';
import { useTheme } from '../../../../../util/theme';
import { selectNetworkName } from '../../../../../selectors/networkInfos';
import { selectUseTokenDetection } from '../../../../../selectors/preferencesController';
import { getDecimalChainId } from '../../../../../util/networks';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import SearchTokenResults from '../SearchTokenResults/SearchTokenResults';
import {
  Button,
  ButtonVariant,
  ButtonSize,
  Box,
  Text,
  TextFieldSearch,
} from '@metamask/design-system-react-native';
import { ImportTokenViewSelectorsIDs } from '../../ImportAssetView.testIds';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import Logger from '../../../../../util/Logger';
import { CaipAssetType, Hex, parseCaipAssetType } from '@metamask/utils';
import { SupportedCaipChainId } from '@metamask/multichain-network-controller';
import { isNonEvmChainId } from '../../../../../core/Multichain/utils';
import { selectSelectedInternalAccountByScope } from '../../../../../selectors/multichainAccounts/accounts';
import {
  getAssetPreferences,
  getAssetsBalance,
  getCustomAssets,
} from '../../../../../selectors/assets/assets-controller';
import { NATIVE_SWAPS_TOKEN_ADDRESS } from '../../../../../constants/bridge';
import { formatChainIdToCaip } from '@metamask/bridge-controller';
import { useTrendingSearch } from '../../../../UI/Trending/hooks/useTrendingSearch/useTrendingSearch';
import {
  PriceChangeOption,
  SortDirection,
} from '../../../../UI/Trending/components/TrendingTokensBottomSheet';
import {
  convertTrendingAssetsToImporAssets,
  ImportAsset,
} from '../../utils/utils';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import { toAssetId } from '../../../../UI/Bridge/hooks/useAssetMetadata/utils';
import useAssetVisibility from '../../../../UI/TokenDetails/components/useAssetVisibility';
import { filterExcludedImportAssets } from '../../../../../enablement/assets/networks-customization';

interface Props {
  /**
	/* navigation object required to push new views
	*/
  navigation: AppNavigationProp;
  tabLabel: string;

  /**
   * The selected network chain ID
   */
  selectedChainId: SupportedCaipChainId | Hex | null;
}

/**
 * Address key used by SearchTokenResults for already-added checks.
 * Non-EVM import assets use the CAIP-19 id as `address`; EVM uses the
 * contract address extracted from the CAIP asset id.
 */
function addressKeyFromAssetId(
  assetId: string,
  isNonEvm: boolean,
): string | undefined {
  if (isNonEvm) {
    return assetId.toLowerCase();
  }
  try {
    return parseCaipAssetType(
      assetId as CaipAssetType,
    ).assetReference.toLowerCase();
  } catch {
    return undefined;
  }
}

function assetIdBelongsToChain(assetId: string, caipChainId: string): boolean {
  try {
    const { chain } = parseCaipAssetType(assetId as CaipAssetType);
    return `${chain.namespace}:${chain.reference}` === caipChainId;
  } catch {
    return false;
  }
}

/**
 * Component that provides ability to add searched assets with metadata.
 */
const SearchTokenAutocomplete = ({ navigation, selectedChainId }: Props) => {
  const tw = useTailwind();
  const { trackEvent, createEventBuilder } = useAnalytics();
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch search results from the API based on user's search query.
  // Debouncing and loading state (including debounce period) are handled
  // internally by useSearchRequest.
  const { data: apiResults, isLoading } = useTrendingSearch({
    chainIds: selectedChainId ? [formatChainIdToCaip(selectedChainId)] : [],
    searchQuery,
    sortBy: 'h24_trending',
    includeMarketData: false,
    enableDebounce: true,
    sortTrendingTokensOptions: {
      option: PriceChangeOption.MarketCap,
      direction: SortDirection.Descending,
    },
    includeStocks: true,
  });

  // Convert API search results to ImportAsset format, hiding excluded
  // homonym ERC-20s (e.g. Arc USDC) which duplicate the native gas token.
  const allTokens = useMemo(() => {
    if (!selectedChainId) return [];

    return filterExcludedImportAssets(
      convertTrendingAssetsToImporAssets(apiResults),
      selectedChainId,
    );
  }, [apiResults, selectedChainId]);

  const [selectedAssets, setSelectedAssets] = useState<ImportAsset[]>([]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const { colors, themeAppearance } = useTheme();

  const isTokenDetectionEnabled = useSelector(selectUseTokenDetection);

  const selectInternalAccountByScope = useSelector(
    selectSelectedInternalAccountByScope,
  );

  const { handleAddCustomAsset } = useAssetVisibility();

  const customAssets = useSelector(getCustomAssets);
  const assetsBalance = useSelector(getAssetsBalance);
  const assetPreferences = useSelector(getAssetPreferences);

  // Create a Set of already added token addresses for quick lookup, sourced
  // from AssetsController (custom + detected, excluding hidden).
  const alreadyAddedTokens = useMemo(() => {
    const addresses = new Set<string>();

    // Native tokens are always "added" since they're inherent to the chain
    addresses.add(NATIVE_SWAPS_TOKEN_ADDRESS.toLowerCase());

    if (!selectedChainId) {
      return addresses;
    }

    const caipChainId = formatChainIdToCaip(selectedChainId);
    const account = selectInternalAccountByScope(
      caipChainId as SupportedCaipChainId,
    );
    if (!account?.id) {
      return addresses;
    }

    const isNonEvm = isNonEvmChainId(selectedChainId);
    const presentAssetIds = new Set<string>([
      ...(customAssets[account.id] ?? []),
      ...Object.keys(assetsBalance[account.id] ?? {}),
    ]);

    presentAssetIds.forEach((assetId) => {
      if (!assetIdBelongsToChain(assetId, caipChainId)) {
        return;
      }
      if (assetPreferences[assetId]?.hidden === true) {
        return;
      }
      const addressKey = addressKeyFromAssetId(assetId, isNonEvm);
      if (addressKey) {
        addresses.add(addressKey);
      }
    });

    return addresses;
  }, [
    selectedChainId,
    customAssets,
    assetsBalance,
    assetPreferences,
    selectInternalAccountByScope,
  ]);

  const setFocusState = useCallback(
    (isFocused: boolean) => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setIsSearchFocused(isFocused);
    },
    [setIsSearchFocused],
  );

  const getTokenAddedAnalyticsParams = useCallback(
    ({ address, symbol }: { address: Hex; symbol: string }) => {
      try {
        return {
          token_address: address,
          token_symbol: symbol,
          chain_id: selectedChainId
            ? getDecimalChainId(selectedChainId)
            : undefined,
          source: 'Add token dropdown',
        };
      } catch (error) {
        Logger.error(
          error as Error,
          'SearchTokenAutocomplete.getTokenAddedAnalyticsParams',
        );
        return undefined;
      }
    },
    [selectedChainId],
  );

  const handleSelectAsset = useCallback(
    (asset: ImportAsset) => {
      const assetAddressLower = asset.address.toLowerCase();

      const newSelectedAsset = selectedAssets.reduce<ImportAsset[]>(
        (filteredAssets, currentAsset) => {
          const currentAssetAddressLower = currentAsset.address.toLowerCase();
          if (currentAssetAddressLower === assetAddressLower) {
            return filteredAssets;
          }

          return [...filteredAssets, currentAsset];
        },
        [],
      );

      if (newSelectedAsset.length === selectedAssets.length) {
        newSelectedAsset.push(asset);
      }

      setSelectedAssets(newSelectedAsset);
    },
    [selectedAssets, setSelectedAssets],
  );

  const addTokens = useCallback(async () => {
    if (!selectedChainId || selectedAssets.length === 0) {
      return;
    }

    const isNonEvm = isNonEvmChainId(selectedChainId);
    const caipChainId = formatChainIdToCaip(selectedChainId);
    const account = selectInternalAccountByScope(
      caipChainId as SupportedCaipChainId,
    );

    if (!account?.id) {
      Logger.log(
        'SearchTokenAutoComplete: No account found for selected chain',
      );
      return;
    }

    try {
      await Promise.all(
        selectedAssets.map(async (asset) => {
          const assetId = isNonEvm
            ? (asset.address as CaipAssetType)
            : toAssetId(asset.address, caipChainId);
          if (!assetId) {
            return;
          }

          await handleAddCustomAsset(
            assetId,
            {
              address: asset.address,
              symbol: asset.symbol,
              name: asset.name ?? '',
              decimals: asset.decimals ?? 0,
              chainId: isNonEvm ? asset.chainId : caipChainId,
            },
            account.id,
          );
        }),
      );
    } catch (error) {
      Logger.error(
        error as Error,
        'SearchTokenAutoComplete: addCustomAsset failed',
      );
    }

    selectedAssets.forEach((asset) => {
      const analyticsParams = getTokenAddedAnalyticsParams({
        address: asset.address as Hex,
        symbol: asset.symbol,
      });

      if (analyticsParams) {
        trackEvent(
          createEventBuilder(MetaMetricsEvents.TOKEN_ADDED)
            .addProperties(analyticsParams)
            .build(),
        );
      }
    });
  }, [
    getTokenAddedAnalyticsParams,
    trackEvent,
    createEventBuilder,
    selectInternalAccountByScope,
    selectedAssets,
    selectedChainId,
    handleAddCustomAsset,
  ]);

  const addTokenList = useCallback(async () => {
    await addTokens();

    setSelectedAssets([]);

    InteractionManager.runAfterInteractions(() => {
      NotificationManager.showSimpleNotification({
        status: `import_success`,
        duration: 5000,
        title: strings('wallet.token_toast.token_imported_title'),
        description:
          selectedAssets.length > 1
            ? strings('wallet.token_toast.tokens_import_success_multiple', {
                tokensNumber: selectedAssets.length,
              })
            : strings('wallet.token_toast.token_imported_desc_1'),
      });
    });
  }, [addTokens, selectedAssets]);

  const networkName = useSelector(selectNetworkName);

  const goToConfirmAddToken = () => {
    navigation.navigate('ConfirmAddAsset', {
      selectedAsset: selectedAssets,
      networkName,
      addTokenList,
    });

    trackEvent(
      createEventBuilder(MetaMetricsEvents.TOKEN_IMPORT_CLICKED)
        .addProperties({
          source: 'manual',
          chain_id: selectedChainId
            ? getDecimalChainId(selectedChainId)
            : undefined,
        })
        .build(),
    );
  };

  const renderTokenDetectionBanner = useCallback(() => {
    if (isTokenDetectionEnabled || isSearchFocused) {
      return null;
    }
    return (
      <Alert
        type={AlertType.Info}
        style={tw.style('mx-5 mt-5 pr-0')}
        renderIcon={() => (
          <FontAwesome
            style={tw.style('pt-1 pr-2')}
            name={'exclamation-circle'}
            color={colors.primary.default}
            size={18}
          />
        )}
      >
        <>
          <Text style={tw.style('text-default')}>
            {strings('add_asset.banners.search_desc', {
              network: selectedChainId
                ? FORMATTED_NETWORK_NAMES[selectedChainId]
                : '',
            })}
          </Text>
          <Text
            suppressHighlighting
            onPress={() => {
              navigation.navigate('SettingsView', {
                screen: 'AdvancedSettings',
                params: {
                  scrollToBottom: true,
                },
              });
            }}
            style={tw.style('text-primary-default')}
          >
            {strings('add_asset.banners.search_link')}
          </Text>
        </>
      </Alert>
    );
  }, [
    navigation,
    isSearchFocused,
    isTokenDetectionEnabled,
    colors,
    tw,
    selectedChainId,
  ]);

  return (
    <Box twClassName="flex-1">
      {renderTokenDetectionBanner()}

      <Box twClassName="flex-1">
        <Box twClassName="m-4">
          <Box testID={ImportTokenViewSelectorsIDs.ASSET_SEARCH_CONTAINER}>
            <TextFieldSearch
              value={searchQuery}
              onChangeText={setSearchQuery}
              onPressClearButton={() => setSearchQuery('')}
              clearButtonProps={{
                testID: ImportTokenViewSelectorsIDs.CLEAR_SEARCH_BAR,
              }}
              inputProps={{
                autoCapitalize: 'none',
                keyboardAppearance: themeAppearance,
                testID: ImportTokenViewSelectorsIDs.SEARCH_BAR,
              }}
              onFocus={() => setFocusState(true)}
              onBlur={() => setFocusState(false)}
              autoFocus={false}
              placeholder={strings('token.search_tokens_placeholder')}
            />
          </Box>
        </Box>

        <SearchTokenResults
          searchResults={allTokens}
          searchQuery={searchQuery}
          handleSelectAsset={handleSelectAsset}
          selectedAsset={selectedAssets}
          networkName={networkName}
          alreadyAddedTokens={alreadyAddedTokens}
          isLoading={isLoading}
        />
      </Box>

      <Box style={tw.style('px-4 pt-6', Platform.OS !== 'android' && 'pb-4')}>
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          isFullWidth
          onPress={goToConfirmAddToken}
          isDisabled={selectedAssets.length < 1}
          testID={ImportTokenViewSelectorsIDs.NEXT_BUTTON}
        >
          {strings('transaction.next')}
        </Button>
      </Box>
    </Box>
  );
};

export default SearchTokenAutocomplete;
