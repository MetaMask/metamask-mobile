import React, { useCallback, useMemo, useState } from 'react';
import {
  InteractionManager,
  TextInput,
  TouchableOpacity,
  LayoutAnimation,
  Platform,
} from 'react-native';
import { strings } from '../../../../../../locales/i18n';
import Engine from '../../../../../core/Engine';
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
import Routes from '../../../../../constants/navigation/Routes';
import SearchTokenResults from '../SearchTokenResults/SearchTokenResults';
import {
  Button,
  ButtonVariant,
  ButtonSize,
  Box,
  BoxFlexDirection,
  BoxAlignItems,
  Text,
  Icon,
  IconName,
  IconSize,
  IconColor,
} from '@metamask/design-system-react-native';
import { ImportTokenViewSelectorsIDs } from '../../ImportAssetView.testIds';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import Logger from '../../../../../util/Logger';
import { CaipAssetType, Hex } from '@metamask/utils';
import { SupportedCaipChainId } from '@metamask/multichain-network-controller';
import { isNonEvmChainId } from '../../../../../core/Multichain/utils';
import { selectSelectedInternalAccountByScope } from '../../../../../selectors/multichainAccounts/accounts';
import {
  selectTokensByChainIdAndAddress,
  selectIgnoreTokens,
} from '../../../../../selectors/tokensController';
import {
  selectMultichainAssets,
  selectMultichainAssetsAllIgnoredAssets,
} from '../../../../../selectors/multichain/multichain';
import { RootState } from '../../../../../reducers';
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
import { selectIsAssetsUnifyStateEnabled } from '../../../../../selectors/featureFlagController/assetsUnifyState';
import { toAssetId } from '../../../../UI/Bridge/hooks/useAssetMetadata/utils';
import useAssetVisibility from '../../../../UI/TokenDetails/components/useAssetVisibility';

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

  // Convert API search results to ImportAsset format
  const allTokens = useMemo(() => {
    if (!selectedChainId) return [];

    return convertTrendingAssetsToImporAssets(apiResults);
  }, [apiResults, selectedChainId]);

  const [selectedAssets, setSelectedAssets] = useState<ImportAsset[]>([]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const { colors, themeAppearance } = useTheme();

  const isTokenDetectionEnabled = useSelector(selectUseTokenDetection);

  const selectInternalAccountByScope = useSelector(
    selectSelectedInternalAccountByScope,
  );

  const isAssetsUnifyStateEnabled = useSelector(
    selectIsAssetsUnifyStateEnabled,
  );
  const { handleAddCustomAsset } = useAssetVisibility();

  // Get already added EVM tokens for the selected chain
  const addedEvmTokens = useSelector((state: RootState) =>
    selectedChainId && !isNonEvmChainId(selectedChainId)
      ? selectTokensByChainIdAndAddress(state, selectedChainId as Hex)
      : {},
  );

  // Ignored/hidden tokens for the active chain+account — these should remain
  // importable even if they appear in allTokens.
  const ignoredTokenAddresses = useSelector(selectIgnoreTokens);
  const ignoredTokenSet = useMemo(
    () =>
      new Set((ignoredTokenAddresses ?? []).map((addr) => addr.toLowerCase())),
    [ignoredTokenAddresses],
  );

  // Get already added non-EVM tokens
  const multichainAssets = useSelector(selectMultichainAssets);

  // Ignored/hidden non-EVM assets — keyed by accountId, value is array of CAIP asset IDs.
  // These should remain importable even if they appear in accountsAssets.
  const allIgnoredNonEvmAssets = useSelector(
    selectMultichainAssetsAllIgnoredAssets,
  );

  // Create a Set of already added token addresses for quick lookup
  const alreadyAddedTokens = useMemo(() => {
    const addresses = new Set<string>();

    // Native tokens are always "added" since they're inherent to the chain
    addresses.add(NATIVE_SWAPS_TOKEN_ADDRESS.toLowerCase());

    if (selectedChainId) {
      if (isNonEvmChainId(selectedChainId)) {
        // For non-EVM chains
        const selectedNonEvmAccount = selectInternalAccountByScope(
          selectedChainId as SupportedCaipChainId,
        );
        if (selectedNonEvmAccount?.id) {
          const accountAssets =
            multichainAssets?.[selectedNonEvmAccount.id] || [];
          const ignoredNonEvmSet = new Set(
            (allIgnoredNonEvmAssets[selectedNonEvmAccount.id] ?? []).map((a) =>
              a.toLowerCase(),
            ),
          );
          // Exclude ignored/hidden assets so the user can re-import them.
          accountAssets.forEach((assetAddress: string) => {
            if (!ignoredNonEvmSet.has(assetAddress.toLowerCase())) {
              addresses.add(assetAddress.toLowerCase());
            }
          });
        }
      } else {
        // For EVM chains — exclude tokens that are ignored/hidden so the user
        // can re-import them from the search UI.
        Object.keys(addedEvmTokens).forEach((address) => {
          if (!ignoredTokenSet.has(address.toLowerCase())) {
            addresses.add(address.toLowerCase());
          }
        });
      }
    }

    return addresses;
  }, [
    selectedChainId,
    addedEvmTokens,
    ignoredTokenSet,
    multichainAssets,
    allIgnoredNonEvmAssets,
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

    const addresses = selectedAssets.map((asset) => asset.address);

    if (isNonEvmChainId(selectedChainId)) {
      const selectedNonEvmAccount = selectInternalAccountByScope(
        selectedChainId as SupportedCaipChainId,
      );

      if (!selectedNonEvmAccount) {
        Logger.log(
          'SearchTokenAutoComplete: No account ID found for non-EVM chain',
        );
        return;
      }

      const { MultichainAssetsController } = Engine.context;
      await MultichainAssetsController.addAssets(
        addresses as CaipAssetType[],
        selectedNonEvmAccount.id,
      );

      if (isAssetsUnifyStateEnabled) {
        try {
          await Promise.all(
            (addresses as CaipAssetType[]).map((assetId) =>
              // Pass the chain-scoped account ID explicitly — the hook was
              // initialised without an asset so its internal accountId would
              // fall back to the globally selected account, which may be on a
              // different chain (e.g. an EVM account when importing Solana tokens).
              handleAddCustomAsset(assetId, selectedNonEvmAccount.id),
            ),
          );
        } catch (error) {
          Logger.error(
            error as Error,
            'SearchTokenAutoComplete: addCustomAsset failed for non-EVM',
          );
        }
      }
    } else {
      const caipChainId = formatChainIdToCaip(
        selectedChainId as SupportedCaipChainId,
      );

      const networkConfig =
        Engine.context.NetworkController.state
          ?.networkConfigurationsByChainId?.[selectedChainId as Hex];

      if (!networkConfig) {
        return;
      }

      const networkClient =
        networkConfig.rpcEndpoints?.[networkConfig.defaultRpcEndpointIndex]
          ?.networkClientId;

      if (!networkClient) {
        return;
      }

      const { TokensController } = Engine.context;
      await TokensController.addTokens(selectedAssets, networkClient);

      if (isAssetsUnifyStateEnabled) {
        const caipAssetTypes = addresses
          .map((address) => toAssetId(address, caipChainId))
          .filter((assetId): assetId is CaipAssetType => Boolean(assetId));

        // Resolve the account scoped to this EVM chain. The hook was
        // initialised without an asset so its internal accountId falls back to
        // the globally selected account, which may be a non-EVM account.
        const evmAccount = selectInternalAccountByScope(
          caipChainId as SupportedCaipChainId,
        );

        if (evmAccount?.id) {
          try {
            await Promise.all(
              caipAssetTypes.map((assetId) =>
                handleAddCustomAsset(assetId, evmAccount.id),
              ),
            );
          } catch (error) {
            Logger.error(
              error as Error,
              'SearchTokenAutoComplete: addCustomAsset failed',
            );
          }
        }
      }
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
    isAssetsUnifyStateEnabled,
    handleAddCustomAsset,
  ]);

  /**
   * Go to wallet page
   */
  const goToWalletPage = useCallback(() => {
    navigation.navigate(Routes.WALLET.HOME, {
      screen: Routes.WALLET.TAB_STACK_FLOW,
      params: {
        screen: Routes.WALLET_VIEW,
      },
    });
  }, [navigation]);

  const addTokenList = useCallback(async () => {
    await addTokens();

    setSelectedAssets([]);

    InteractionManager.runAfterInteractions(() => {
      goToWalletPage();
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
  }, [addTokens, selectedAssets, goToWalletPage]);

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
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            twClassName="bg-muted rounded-lg px-3"
            style={tw.style('min-h-[44px]')}
            testID={ImportTokenViewSelectorsIDs.ASSET_SEARCH_CONTAINER}
          >
            <Icon
              name={IconName.Search}
              size={IconSize.Md}
              color={IconColor.IconMuted}
              style={tw.style('mr-2')}
            />
            <TextInput
              style={tw.style('flex-1 text-base text-default')}
              value={searchQuery}
              onFocus={() => setFocusState(true)}
              onBlur={() => setFocusState(false)}
              placeholder={strings('token.search_tokens_placeholder')}
              placeholderTextColor={colors.text.muted}
              onChangeText={setSearchQuery}
              testID={ImportTokenViewSelectorsIDs.SEARCH_BAR}
              keyboardAppearance={themeAppearance}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                testID={ImportTokenViewSelectorsIDs.CLEAR_SEARCH_BAR}
              >
                <Icon
                  name={IconName.CircleX}
                  size={IconSize.Md}
                  color={IconColor.IconAlternative}
                />
              </TouchableOpacity>
            )}
          </Box>
        </Box>

        <SearchTokenResults
          searchResults={allTokens}
          searchQuery={searchQuery}
          handleSelectAsset={handleSelectAsset}
          selectedAsset={selectedAssets}
          chainId={selectedChainId ?? ''}
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
