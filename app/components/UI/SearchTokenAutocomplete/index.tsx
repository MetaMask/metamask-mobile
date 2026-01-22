import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  InteractionManager,
  Text,
  LayoutAnimation,
  Platform,
} from 'react-native';
import { strings } from '../../../../locales/i18n';
import AssetSearch from '../AssetSearch';
import Engine from '../../../core/Engine';
import { MetaMetricsEvents } from '../../../core/Analytics';

import Alert, { AlertType } from '../../Base/Alert';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import { useSelector } from 'react-redux';
import { FORMATTED_NETWORK_NAMES } from '../../../constants/on-ramp';
import NotificationManager from '../../../core/NotificationManager';
import { useTheme } from '../../../util/theme';
import { selectEvmTicker } from '../../../selectors/networkController';
import { selectNetworkName } from '../../../selectors/networkInfos';
import { selectUseTokenDetection } from '../../../selectors/preferencesController';
import { getDecimalChainId } from '../../../util/networks';
import { useMetrics } from '../../../components/hooks/useMetrics';
import Routes from '../../../constants/navigation/Routes';
import MultiAssetListItems from '../MultiAssetListItems/MultiAssetListItems';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../component-library/components/Buttons/Button';
import { ImportTokenViewSelectorsIDs } from '../../Views/AddAsset/ImportTokenView.testIds';
import Logger from '../../../util/Logger';
import { Hex } from '@metamask/utils';
import { SupportedCaipChainId } from '@metamask/multichain-network-controller';
import { BridgeToken } from '../Bridge/types';
import { isNonEvmChainId } from '../../../core/Multichain/utils';
import { selectSelectedInternalAccountByScope } from '../../../selectors/multichainAccounts/accounts';
import { selectTokensByChainIdAndAddress } from '../../../selectors/tokensController';
import { selectMultichainAssets } from '../../../selectors/multichain/multichain';
import { RootState } from '../../../reducers';

// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    content: {
      flex: 1,
    },
    base: {
      padding: 16,
    },
    tokenDetectionBanner: {
      marginHorizontal: 20,
      marginTop: 20,
      paddingRight: 0,
    },
    tokenDetectionDescription: { color: colors.text.default },
    tokenDetectionLink: { color: colors.primary.default },
    tokenDetectionIcon: {
      paddingTop: 4,
      paddingRight: 8,
    },
    alertBar: {
      width: '100%',
      marginBottom: 15,
    },
    button: {
      paddingHorizontal: 16,
      paddingTop: 24,
      paddingBottom: Platform.OS === 'android' ? 0 : 16,
    },
    searchInput: {
      margin: 16,
    },
  });

interface Props {
  /**
	/* navigation object required to push new views
	*/
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  navigation: any;
  tabLabel: string;

  /**
   * The selected network chain ID
   */
  selectedChainId: SupportedCaipChainId | Hex | null;

  allTokens: BridgeToken[];
}

/**
 * Component that provides ability to add searched assets with metadata.
 */
const SearchTokenAutocomplete = ({
  navigation,
  selectedChainId,
  allTokens,
}: Props) => {
  const { trackEvent, createEventBuilder } = useMetrics();
  const [searchResults, setSearchResults] = useState<BridgeToken[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [selectedAssets, setSelectedAssets] = useState<any[]>([]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const { colors } = useTheme();
  const styles = createStyles(colors);

  const isTokenDetectionEnabled = useSelector(selectUseTokenDetection);
  const ticker = useSelector(selectEvmTicker);

  const selectInternalAccountByScope = useSelector(
    selectSelectedInternalAccountByScope,
  );

  // Get already added EVM tokens for the selected chain
  const addedEvmTokens = useSelector((state: RootState) =>
    selectedChainId && !isNonEvmChainId(selectedChainId)
      ? selectTokensByChainIdAndAddress(state, selectedChainId as Hex)
      : {},
  );

  // Get already added non-EVM tokens
  const multichainAssets = useSelector(selectMultichainAssets);

  // Create a Set of already added token addresses for quick lookup
  const alreadyAddedTokens = useMemo(() => {
    const addresses = new Set<string>();

    if (selectedChainId) {
      if (isNonEvmChainId(selectedChainId)) {
        // For non-EVM chains
        const selectedNonEvmAccount = selectInternalAccountByScope(
          selectedChainId as SupportedCaipChainId,
        );
        if (selectedNonEvmAccount?.id) {
          const accountAssets =
            multichainAssets?.[selectedNonEvmAccount.id] || [];
          // accountAssets is an array of CAIP asset address strings
          accountAssets.forEach((assetAddress: string) => {
            // Extract the token address from CAIP format (e.g., "bip122:..." or "solana:...")
            // The address is already the full identifier, just normalize it
            addresses.add(assetAddress.toLowerCase());
          });
        }
      } else {
        // For EVM chains
        Object.keys(addedEvmTokens).forEach((address) => {
          addresses.add(address.toLowerCase());
        });
      }
    }

    return addresses;
  }, [
    selectedChainId,
    addedEvmTokens,
    multichainAssets,
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

  const handleSearch = useCallback(
    (opts: { results: BridgeToken[]; searchQuery: string }) => {
      if (opts.searchQuery.length === 0) {
        setSearchResults(allTokens);
      } else {
        setSearchResults(opts.results);
      }
      setSearchQuery(opts.searchQuery);
    },
    [setSearchResults, setSearchQuery, allTokens],
  );

  const handleSelectAsset = useCallback(
    (asset: { address: string }) => {
      const assetAddressLower = asset.address.toLowerCase();

      const newSelectedAsset = selectedAssets.reduce(
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
    if (!selectedChainId) {
      return;
    }

    const addresses = selectedAssets.map((asset) => asset.address);
    if (isNonEvmChainId(selectedChainId)) {
      const selectedNonEvmAccount = selectInternalAccountByScope(
        selectedChainId as SupportedCaipChainId,
      );

      if (!selectedNonEvmAccount) {
        Logger.log('SearchTokenAutoComplete: No account ID found');
        return;
      }

      const { MultichainAssetsController } = Engine.context;
      await MultichainAssetsController.addAssets(
        addresses,
        selectedNonEvmAccount.id,
      );
    } else {
      const networkConfig =
        Engine.context.NetworkController.state
          ?.networkConfigurationsByChainId?.[selectedChainId as Hex];

      if (!networkConfig) {
        return;
      }

      const networkClient =
        networkConfig?.rpcEndpoints?.[networkConfig?.defaultRpcEndpointIndex]
          ?.networkClientId;

      if (!networkClient) {
        return;
      }

      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { TokensController } = Engine.context;
      await TokensController.addTokens(selectedAssets, networkClient);
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

    setSearchResults([]);
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
    navigation.push('ConfirmAddAsset', {
      selectedAsset: selectedAssets,
      networkName,
      chainId: selectedChainId,
      ticker,
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
        style={styles.tokenDetectionBanner}
        renderIcon={() => (
          <FontAwesome
            style={styles.tokenDetectionIcon}
            name={'exclamation-circle'}
            color={colors.primary.default}
            size={18}
          />
        )}
      >
        <>
          <Text style={styles.tokenDetectionDescription}>
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
            style={styles.tokenDetectionLink}
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
    styles,
    selectedChainId,
  ]);

  return (
    <View style={styles.container}>
      {renderTokenDetectionBanner()}

      <View style={styles.content}>
        <View style={styles.searchInput}>
          <AssetSearch
            onSearch={handleSearch}
            onFocus={() => {
              setFocusState(true);
            }}
            onBlur={() => setFocusState(false)}
            allTokens={allTokens}
          />
        </View>

        <MultiAssetListItems
          searchResults={searchResults}
          searchQuery={searchQuery}
          handleSelectAsset={handleSelectAsset}
          selectedAsset={selectedAssets}
          chainId={selectedChainId ?? ''}
          networkName={networkName}
          alreadyAddedTokens={alreadyAddedTokens}
        />
      </View>

      <View style={styles.button}>
        <Button
          variant={ButtonVariants.Primary}
          size={ButtonSize.Lg}
          width={ButtonWidthTypes.Full}
          label={strings('transaction.next')}
          onPress={goToConfirmAddToken}
          isDisabled={selectedAssets.length < 1}
          testID={ImportTokenViewSelectorsIDs.NEXT_BUTTON}
        />
      </View>
    </View>
  );
};

export default SearchTokenAutocomplete;
