import React, { useCallback, useState } from 'react';
import {
  View,
  StyleSheet,
  InteractionManager,
  Text,
  LayoutAnimation,
  TouchableOpacity,
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
import {
  selectChainId,
  selectEvmTicker,
} from '../../../selectors/networkController';
import { selectNetworkName } from '../../../selectors/networkInfos';
import { selectUseTokenDetection } from '../../../selectors/preferencesController';
import { getDecimalChainId } from '../../../util/networks';
import { useMetrics } from '../../../components/hooks/useMetrics';
import Routes from '../../../constants/navigation/Routes';
import MultiAssetListItems from '../MultiAssetListItems/MultiAssetListItems';
import { ScrollView } from 'react-native-gesture-handler';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../component-library/components/Buttons/Button';
import { ImportTokenViewSelectorsIDs } from '../../../../e2e/selectors/wallet/ImportTokenView.selectors';
import Logger from '../../../util/Logger';
import { Hex } from '@metamask/utils';
import NetworkImageComponent from '../NetworkImages';
import {
  startPerformanceTrace,
  endPerformanceTrace,
} from '../../../core/redux/slices/performance';
import { PerformanceEventNames } from '../../../core/redux/slices/performance/constants';
import { store } from '../../../store';

// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
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
      paddingTop: 16,
    },
    searchInput: {
      paddingBottom: 16,
    },
    networkCell: {
      alignItems: 'center',
    },
    networkSelectorContainer: {
      borderWidth: 1,
      marginTop: 16,
      borderColor: colors.border.default,
      borderRadius: 8,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
    },
    buttonIconContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    title: {
      color: colors.text.default,
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
  onPress: () => void;
  isAllNetworksEnabled: boolean;
  allNetworksEnabled: { [key: string]: boolean };
}

/**
 * Component that provides ability to add searched assets with metadata.
 */
const SearchTokenAutocomplete = ({
  navigation,
  onPress,
  isAllNetworksEnabled,
  allNetworksEnabled,
}: Props) => {
  const { trackEvent, createEventBuilder } = useMetrics();
  const [searchResults, setSearchResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [selectedAssets, setSelectedAssets] = useState<any[]>([]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const { colors } = useTheme();
  const styles = createStyles(colors);

  const isTokenDetectionEnabled = useSelector(selectUseTokenDetection);
  const chainId = useSelector(selectChainId);
  const ticker = useSelector(selectEvmTicker);

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
          chain_id: getDecimalChainId(chainId),
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
    [chainId],
  );

  const handleSearch = useCallback(
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (opts: any) => {
      setSearchResults(opts.results);
      setSearchQuery(opts.searchQuery);
    },
    [setSearchResults, setSearchQuery],
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

  const addToken = useCallback(
    async ({
      address,
      symbol,
      decimals,
      iconUrl,
      name,
      chainId: networkId,
    }: {
      address: Hex;
      symbol: string;
      decimals: number;
      iconUrl: string;
      name: string;
      chainId: Hex;
    }) => {
      store.dispatch(
        startPerformanceTrace({
          eventName: PerformanceEventNames.AddToken,
        }),
      );
      const networkConfig =
        Engine.context.NetworkController.state
          ?.networkConfigurationsByChainId?.[networkId];

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
      const { TokensController } = Engine.context as any;
      await TokensController.addToken({
        address,
        symbol,
        decimals,
        image: iconUrl,
        name,
        networkClientId: networkClient,
      });

      const analyticsParams = getTokenAddedAnalyticsParams({
        address,
        symbol,
      });

      if (analyticsParams) {
        trackEvent(
          createEventBuilder(MetaMetricsEvents.TOKEN_ADDED)
            .addProperties(analyticsParams)
            .build(),
        );
      }
      store.dispatch(
        endPerformanceTrace({
          eventName: PerformanceEventNames.AddToken,
        }),
      );
    },
    [getTokenAddedAnalyticsParams, trackEvent, createEventBuilder],
  );

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
    for (const asset of selectedAssets) {
      await addToken({ ...asset });
    }

    setSearchResults([]);
    setSearchQuery('');
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
  }, [addToken, selectedAssets, goToWalletPage]);

  const networkName = useSelector(selectNetworkName);

  const goToConfirmAddToken = () => {
    navigation.push('ConfirmAddAsset', {
      selectedAsset: selectedAssets,
      networkName,
      chainId,
      ticker,
      addTokenList,
    });

    trackEvent(
      createEventBuilder(MetaMetricsEvents.TOKEN_IMPORT_CLICKED)
        .addProperties({
          source: 'manual',
          chain_id: getDecimalChainId(chainId),
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
              network: FORMATTED_NETWORK_NAMES[chainId],
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
    chainId,
  ]);

  return (
    <View style={styles.container}>
      <ScrollView>
        <View>
          {renderTokenDetectionBanner()}
          <TouchableOpacity
            style={styles.networkSelectorContainer}
            onPress={onPress}
            onLongPress={onPress}
            testID="filter-controls-button"
          >
            <TouchableOpacity
              style={styles.base}
              disabled={false}
              onPress={onPress}
              onLongPress={onPress}
            >
              <Text style={styles.title}>
                {isAllNetworksEnabled
                  ? strings('wallet.popular_networks')
                  : networkName}
              </Text>
            </TouchableOpacity>
            <NetworkImageComponent
              isAllNetworksEnabled={isAllNetworksEnabled}
              allNetworksEnabled={allNetworksEnabled}
              onPress={onPress}
            />
          </TouchableOpacity>

          <View style={styles.searchInput}>
            <AssetSearch
              onSearch={handleSearch}
              onFocus={() => {
                setFocusState(true);
              }}
              onBlur={() => setFocusState(false)}
              allNetworksEnabled={isAllNetworksEnabled}
            />
          </View>
          <MultiAssetListItems
            searchResults={searchResults}
            handleSelectAsset={handleSelectAsset}
            selectedAsset={selectedAssets}
            searchQuery={searchQuery}
            chainId={chainId}
            networkName={networkName}
          />
        </View>
      </ScrollView>
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
