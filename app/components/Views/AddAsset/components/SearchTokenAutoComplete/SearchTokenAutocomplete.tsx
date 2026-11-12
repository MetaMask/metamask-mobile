import React, { useCallback, useMemo, useState } from 'react';
import { InteractionManager, Platform } from 'react-native';
import { strings } from '../../../../../../locales/i18n';
import { MetaMetricsEvents } from '../../../../../core/Analytics';

import Alert, { AlertType } from '../../../../Base/Alert';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import { useSelector } from 'react-redux';
import NotificationManager from '../../../../../core/NotificationManager';
import { useTheme } from '../../../../../util/theme';
import { selectUseTokenDetection } from '../../../../../selectors/preferencesController';
import { getDecimalChainId } from '../../../../../util/networks';
import {
  parseCaipChainId,
  CaipAssetType,
  CaipChainId,
  Hex,
  parseCaipAssetType,
} from '@metamask/utils';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import SearchTokenResults from '../SearchTokenResults/SearchTokenResults';
import {
  Button,
  ButtonVariant,
  ButtonSize,
  Box,
  Text,
} from '@metamask/design-system-react-native';
import { ImportTokenViewSelectorsIDs } from '../../ImportAssetView.testIds';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import Logger from '../../../../../util/Logger';
import { SupportedCaipChainId } from '@metamask/multichain-network-controller';
import { isNonEvmChainId } from '../../../../../core/Multichain/utils';
import { selectSelectedInternalAccountByScope } from '../../../../../selectors/multichainAccounts/accounts';
import {
  getAssetPreferences,
  getAssetsBalance,
  getCustomAssets,
} from '../../../../../selectors/assets/assets-controller';
import { formatChainIdToCaip } from '@metamask/bridge-controller';
import { getCaipChainIdFromAssetId } from '../../../../UI/Trending/components/TrendingTokenRowItem/utils';
import { useNetworkName } from '../../../../UI/Trending/hooks/useNetworkName/useNetworkName';
import { useTrendingSearch } from '../../../../UI/Trending/hooks/useTrendingSearch/useTrendingSearch';
import {
  PriceChangeOption,
  SortDirection,
} from '../../../../UI/Trending/components/TrendingTokensBottomSheet';
import {
  convertTrendingAssetsToImporAssets,
  getImportAssetKey,
  ImportAsset,
} from '../../utils/utils';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import { toAssetId } from '../../../../UI/Bridge/hooks/useAssetMetadata/utils';
import useAssetVisibility, {
  type UseAssetVisibilityReturn,
} from '../../../../UI/TokenDetails/components/useAssetVisibility';
import { isExcludedImportAsset } from '../../../../../enablement/assets/networks-customization';
import type { InternalAccount } from '@metamask/keyring-internal-api';

interface Props {
  /**
	/* navigation object required to push new views
	*/
  navigation: AppNavigationProp;

  /**
   * Network to search in. `null` means all networks.
   */
  selectedChainId: CaipChainId | null;

  /**
   * Search query owned by the parent screen's search field
   */
  searchQuery: string;

  /**
   * Whether the user is searching (hides the detection banner)
   */
  isSearching?: boolean;

  /**
   * Opens the custom token screen from the empty state
   */
  onAddCustomToken?: () => void;
}

// Non-EVM import assets use the full CAIP-19 id as `address`, EVM the contract.
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

/** Adds one searched asset to the account that matches the asset's chain. */
async function addSingleToken(
  asset: ImportAsset,
  selectInternalAccountByScope: (
    scope: SupportedCaipChainId,
  ) => InternalAccount | undefined,
  handleAddCustomAsset: UseAssetVisibilityReturn['handleAddCustomAsset'],
): Promise<boolean> {
  const chainId = asset.chainId;
  const isNonEvm = isNonEvmChainId(chainId);
  const caipChainId = formatChainIdToCaip(chainId);
  const account = selectInternalAccountByScope(
    caipChainId as SupportedCaipChainId,
  );
  if (!account?.id) {
    return false;
  }

  const assetId = isNonEvm
    ? (asset.address as CaipAssetType)
    : toAssetId(asset.address, caipChainId);
  if (!assetId) {
    return true;
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
  return true;
}

/**
 * Component that provides ability to add searched assets with metadata.
 */
const SearchTokenAutocomplete = ({
  navigation,
  selectedChainId,
  searchQuery,
  isSearching = false,
  onAddCustomToken,
}: Props) => {
  const tw = useTailwind();
  const selectedChainIds = useMemo(
    () => (selectedChainId ? [selectedChainId] : null),
    [selectedChainId],
  );
  const { trackEvent, createEventBuilder } = useAnalytics();

  // Fetch search results from the API based on user's search query.
  // Debouncing and loading state (including debounce period) are handled
  // internally by useSearchRequest.
  const { data: apiResults, isLoading } = useTrendingSearch({
    chainIds: selectedChainIds,
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
  const allTokens = useMemo(
    () =>
      convertTrendingAssetsToImporAssets(apiResults).filter(
        (token) => !isExcludedImportAsset(token),
      ),
    [apiResults],
  );

  const [selectedAssets, setSelectedAssets] = useState<ImportAsset[]>([]);

  const { colors } = useTheme();

  const isTokenDetectionEnabled = useSelector(selectUseTokenDetection);

  const selectInternalAccountByScope = useSelector(
    selectSelectedInternalAccountByScope,
  );

  const { handleAddCustomAsset } = useAssetVisibility();

  const customAssets = useSelector(getCustomAssets);
  const assetsBalance = useSelector(getAssetsBalance);
  const assetPreferences = useSelector(getAssetPreferences);

  // Already added tokens (custom + detected, not hidden), keyed by chain and address.
  const alreadyAddedTokens = useMemo(() => {
    const keys = new Set<string>();
    const scope = selectedChainIds ? new Set<string>(selectedChainIds) : null;

    const accountIds = new Set([
      ...Object.keys(customAssets),
      ...Object.keys(assetsBalance),
    ]);

    accountIds.forEach((accountId) => {
      const assetIds = new Set<string>([
        ...(customAssets[accountId] ?? []),
        ...Object.keys(assetsBalance[accountId] ?? {}),
      ]);

      assetIds.forEach((assetId) => {
        const caipChainId = getCaipChainIdFromAssetId(assetId);
        if (scope && !scope.has(caipChainId)) {
          return;
        }
        // Only the account that owns this chain's assets counts.
        const account = selectInternalAccountByScope(
          caipChainId as SupportedCaipChainId,
        );
        if (account?.id !== accountId) {
          return;
        }
        if (assetPreferences[assetId as CaipAssetType]?.hidden === true) {
          return;
        }
        const addressKey = addressKeyFromAssetId(
          assetId,
          isNonEvmChainId(caipChainId),
        );
        if (addressKey) {
          keys.add(getImportAssetKey(caipChainId, addressKey));
        }
      });
    });

    return keys;
  }, [
    selectedChainIds,
    customAssets,
    assetsBalance,
    assetPreferences,
    selectInternalAccountByScope,
  ]);

  const getTokenAddedAnalyticsParams = useCallback(
    ({
      address,
      symbol,
      chainId,
    }: {
      address: Hex;
      symbol: string;
      chainId: CaipChainId | Hex | null;
    }) => {
      const getAnalyticsChainId = () =>
        chainId ? getDecimalChainId(chainId) : undefined;
      try {
        return {
          token_address: address,
          token_symbol: symbol,
          chain_id: getAnalyticsChainId(),
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
    [],
  );

  const handleSelectAsset = useCallback((asset: ImportAsset) => {
    const assetKey = getImportAssetKey(asset.chainId, asset.address);

    setSelectedAssets((current) =>
      current.some(
        (item) => getImportAssetKey(item.chainId, item.address) === assetKey,
      )
        ? current.filter(
            (item) =>
              getImportAssetKey(item.chainId, item.address) !== assetKey,
          )
        : [...current, asset],
    );
  }, []);

  const addTokens = useCallback(async () => {
    if (selectedAssets.length === 0) {
      return;
    }

    try {
      await Promise.all(
        selectedAssets.map(async (asset) => {
          await addSingleToken(
            asset,
            selectInternalAccountByScope,
            handleAddCustomAsset,
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
        chainId: asset.chainId,
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

  const networkName = useNetworkName(selectedChainIds);

  const goToConfirmAddToken = () => {
    navigation.navigate('ConfirmAddAsset', {
      selectedAsset: selectedAssets,
      addTokenList,
    });

    trackEvent(
      createEventBuilder(MetaMetricsEvents.TOKEN_IMPORT_CLICKED)
        .addProperties({
          source: 'manual',
          chain_id: selectedChainId
            ? getDecimalChainId(parseCaipChainId(selectedChainId).reference)
            : undefined,
        })
        .build(),
    );
  };

  const renderTokenDetectionBanner = useCallback(() => {
    if (isTokenDetectionEnabled || isSearching || !selectedChainId) {
      return null;
    }
    return (
      <Alert
        type={AlertType.Info}
        style={tw.style('mx-4 mt-3 pr-0')}
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
              network: networkName,
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
    isSearching,
    isTokenDetectionEnabled,
    selectedChainId,
    networkName,
    colors,
    tw,
  ]);

  return (
    <Box twClassName="flex-1">
      {renderTokenDetectionBanner()}

      <Box twClassName="flex-1">
        <SearchTokenResults
          searchResults={allTokens}
          searchQuery={searchQuery}
          handleSelectAsset={handleSelectAsset}
          selectedAsset={selectedAssets}
          alreadyAddedTokens={alreadyAddedTokens}
          isLoading={isLoading}
          onAddCustomToken={onAddCustomToken}
        />
      </Box>

      <Box style={tw.style('px-4 pt-3', Platform.OS !== 'android' && 'pb-4')}>
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
