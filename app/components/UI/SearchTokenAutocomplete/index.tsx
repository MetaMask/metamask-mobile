import React, { useCallback, useState } from 'react';
import {
  View,
  StyleSheet,
  InteractionManager,
  Text,
  LayoutAnimation,
} from 'react-native';
import { strings } from '../../../../locales/i18n';
import ActionView from '../ActionView';
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
  selectProviderConfig,
  selectTicker,
} from '../../../selectors/networkController';
import { selectUseTokenDetection } from '../../../selectors/preferencesController';
import {
  getDecimalChainId,
  getNetworkNameFromProviderConfig,
} from '../../../util/networks';
import { useMetrics } from '../../../components/hooks/useMetrics';
import { EngineState } from '../../../selectors/types';
import Routes from '../../../constants/navigation/Routes';
import MultiAssetListItems from '../MultiAssetListItems/MultiAssetListItems';

const createStyles = (colors: any) =>
  StyleSheet.create({
    wrapper: {
      backgroundColor: colors.background.default,
      flex: 1,
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
  });

interface Props {
  /**
	/* navigation object required to push new views
	*/
  navigation: any;
}

/**
 * Component that provides ability to add searched assets with metadata.
 */
const SearchTokenAutocomplete = ({ navigation }: Props) => {
  const { trackEvent } = useMetrics();
  const [searchResults, setSearchResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAsset, setSelectedAsset] = useState<any[]>([]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const enableImport =
    selectedAsset.length > 0 &&
    selectedAsset.every(
      (asset) =>
        asset.address && asset.symbol && typeof asset.decimals === 'number',
    );

  const { colors } = useTheme();
  const styles = createStyles(colors);

  const isTokenDetectionEnabled = useSelector(selectUseTokenDetection);
  const chainId = useSelector(selectChainId);
  const ticker = useSelector(selectTicker);

  const setFocusState = useCallback(
    (isFocused: boolean) => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setIsSearchFocused(isFocused);
    },
    [setIsSearchFocused],
  );

  const getAnalyticsParams = useCallback(() => {
    try {
      return selectedAsset.map((asset) => ({
        token_address: asset.address,
        token_symbol: asset.symbol,
        chain_id: getDecimalChainId(chainId),
        source: 'Add token dropdown',
      }));
    } catch (error) {
      return {};
    }
  }, [selectedAsset, chainId]);

  const cancelAddToken = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleSearch = useCallback(
    (opts: any) => {
      setSearchResults(opts.results);
      setSearchQuery(opts.searchQuery);
    },
    [setSearchResults, setSearchQuery],
  );

  const handleSelectAsset = useCallback(
    (asset) => {
      const assetAddressLower = asset.address.toLowerCase();

      const newSelectedAsset = selectedAsset.reduce((acc, currentAsset) => {
        const currentAssetAddressLower = currentAsset.address.toLowerCase();
        if (currentAssetAddressLower === assetAddressLower) {
          return acc;
        }

        return [...acc, currentAsset];
      }, []);

      if (newSelectedAsset.length === selectedAsset.length) {
        newSelectedAsset.push(asset);
      }

      setSelectedAsset(newSelectedAsset);
    },
    [selectedAsset, setSelectedAsset],
  );

  const addToken = useCallback(
    async ({ address, symbol, decimals, iconUrl, name }) => {
      const { TokensController } = Engine.context as any;
      await TokensController.addToken(address, symbol, decimals, {
        image: iconUrl,
        name,
      });

      trackEvent(MetaMetricsEvents.TOKEN_ADDED, getAnalyticsParams());
    },
    [getAnalyticsParams, trackEvent],
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
    for (const asset of selectedAsset) {
      await addToken({ ...asset });
    }

    setSearchResults([]);
    setSearchQuery('');
    setSelectedAsset([]);

    InteractionManager.runAfterInteractions(() => {
      goToWalletPage();
      NotificationManager.showSimpleNotification({
        status: `import_success`,
        duration: 5000,
        title: strings('wallet.token_toast.token_imported_title'),
        description: strings('wallet.token_toast.token_imported_desc_1', {
          tokensNumber: selectedAsset.length,
        }),
      });
    });
  }, [addToken, selectedAsset, goToWalletPage]);

  const networkName = useSelector((state: EngineState) => {
    const providerConfig = selectProviderConfig(state);
    return getNetworkNameFromProviderConfig(providerConfig);
  });

  const goToConfirmAddToken = () => {
    navigation.push('ConfirmAddAsset', {
      selectedAsset,
      networkName,
      chainId,
      ticker,
      addTokenList,
    });

    trackEvent(MetaMetricsEvents.TOKEN_IMPORT_CLICKED, {
      source: 'manual',
      chain_id: getDecimalChainId(chainId),
    });
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
    <View style={styles.wrapper}>
      <ActionView
        cancelText={strings('add_asset.tokens.cancel_add_token')}
        confirmText={strings('add_asset.tokens.add_token')}
        onCancelPress={cancelAddToken}
        onConfirmPress={goToConfirmAddToken}
        confirmDisabled={!enableImport}
      >
        <View>
          {renderTokenDetectionBanner()}
          <AssetSearch
            onSearch={handleSearch}
            onFocus={() => {
              setFocusState(true);
            }}
            onBlur={() => setFocusState(false)}
          />
          <MultiAssetListItems
            searchResults={searchResults}
            handleSelectAsset={handleSelectAsset}
            selectedAsset={selectedAsset}
            searchQuery={searchQuery}
            chainId={chainId}
            networkName={networkName}
          />
        </View>
      </ActionView>
    </View>
  );
};

export default SearchTokenAutocomplete;
