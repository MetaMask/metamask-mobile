import React, { useCallback, useState } from 'react';
import {
  View,
  StyleSheet,
  InteractionManager,
  Text,
  LayoutAnimation,
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
  selectTicker,
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

// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createStyles = (colors: any) =>
  StyleSheet.create({
    wrapper: {
      height: '85%',
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
      padding: 16,
    },
    searchInput: {
      paddingBottom: 16,
    },
  });

interface Props {
  /**
	/* navigation object required to push new views
	*/
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  navigation: any;
}

/**
 * Component that provides ability to add searched assets with metadata.
 */
const SearchTokenAutocomplete = ({ navigation }: Props) => {
  const { trackEvent } = useMetrics();
  const [searchResults, setSearchResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [selectedAsset, setSelectedAsset] = useState<any[]>([]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

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
    (asset) => {
      const assetAddressLower = asset.address.toLowerCase();

      const newSelectedAsset = selectedAsset.reduce(
        (filteredAssets, currentAsset) => {
          const currentAssetAddressLower = currentAsset.address.toLowerCase();
          if (currentAssetAddressLower === assetAddressLower) {
            return filteredAssets;
          }

          return [...filteredAssets, currentAsset];
        },
        [],
      );

      if (newSelectedAsset.length === selectedAsset.length) {
        newSelectedAsset.push(asset);
      }

      setSelectedAsset(newSelectedAsset);
    },
    [selectedAsset, setSelectedAsset],
  );

  const addToken = useCallback(
    async ({ address, symbol, decimals, iconUrl, name }) => {
      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { TokensController } = Engine.context as any;
      await TokensController.addToken({
        address,
        symbol,
        decimals,
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
        description:
          selectedAsset.length > 1
            ? strings('wallet.token_toast.tokens_import_success_multiple', {
                tokensNumber: selectedAsset.length,
              })
            : strings('wallet.token_toast.token_imported_desc_1'),
      });
    });
  }, [addToken, selectedAsset, goToWalletPage]);

  const networkName = useSelector(selectNetworkName);

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
    <View>
      <ScrollView style={styles.wrapper}>
        <View>
          {renderTokenDetectionBanner()}

          <View style={styles.searchInput}>
            <AssetSearch
              onSearch={handleSearch}
              onFocus={() => {
                setFocusState(true);
              }}
              onBlur={() => setFocusState(false)}
            />
          </View>
          <MultiAssetListItems
            searchResults={searchResults}
            handleSelectAsset={handleSelectAsset}
            selectedAsset={selectedAsset}
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
          isDisabled={selectedAsset.length < 1}
          testID="token-import-next-button"
        />
      </View>
    </View>
  );
};

export default SearchTokenAutocomplete;
