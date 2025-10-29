import React, {
  useRef,
  useState,
  useEffect,
  useMemo,
  useCallback,
} from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { strings } from '../../../../../../locales/i18n';
import { FlatList } from 'react-native-gesture-handler';
import { NetworkPills } from './NetworkPills';
import { Hex, CaipChainId, CaipAssetType , parseCaipAssetType } from '@metamask/utils';
import { useStyles } from '../../../../../component-library/hooks';
import TextFieldSearch from '../../../../../component-library/components/Form/TextFieldSearch';
import { Theme } from '../../../../../util/theme/models';
import {
  selectBridgeFeatureFlags,
  selectSourceToken,
  selectDestToken,
} from '../../../../../core/redux/slices/bridge';
import { RootState } from '../../../../../reducers';
import { formatChainIdToCaip } from '@metamask/bridge-controller';
import {
  Box,
  ButtonIcon,
  ButtonIconSize,
  IconColor,
  IconName,
} from '@metamask/design-system-react-native';
import { SolScope } from '@metamask/keyring-api';
import { SkeletonItem } from '../BridgeTokenSelectorBase';
import { TokenSelectorItem } from '../TokenSelectorItem';
import { getNetworkImageSource } from '../../../../../util/networks';

export interface BridgeTokenSelectorRouteParams {
  type: 'source' | 'dest';
}

interface PopularToken {
  assetId: CaipAssetType;
  chainId: CaipChainId;
  decimals: number;
  image: string;
  name: string;
  symbol: string;
}

const createStyles = (params: { theme: Theme }) => {
  const { theme } = params;
  return StyleSheet.create({
    tokensList: {
      marginTop: 10,
    },
    buttonContainer: {
      paddingHorizontal: 8,
      paddingVertical: 12,
    },
    searchInput: {
      marginVertical: 12,
      borderRadius: 12,
      borderWidth: 0,
      backgroundColor: theme.colors.background.section,
    },
    tokenItem: {
      paddingVertical: 8,
    },
  });
};

export const BridgeTokenSelector: React.FC = () => {
  const navigation = useNavigation();
  const route =
    useRoute<RouteProp<{ params: BridgeTokenSelectorRouteParams }, 'params'>>();
  const sheetRef = useRef<BottomSheetRef>(null);
  const { styles } = useStyles(createStyles, {});
  const [assets, setAssets] = useState<PopularToken[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const bridgeFeatureFlags = useSelector((state: RootState) =>
    selectBridgeFeatureFlags(state),
  );
  const sourceToken = useSelector(selectSourceToken);
  const destToken = useSelector(selectDestToken);

  // Get type from route params
  const type = route.params?.type || 'source';

  // Determine selected token based on type
  const selectedToken = type === 'source' ? sourceToken : destToken;

  // Initialize selectedChainId with the initial chain id
  const [selectedChainId, setSelectedChainId] = useState<
    Hex | CaipChainId | undefined
  >(
    selectedToken?.chainId
      ? formatChainIdToCaip(selectedToken.chainId)
      : undefined,
  );

  // Search string should always start empty
  const [searchString, setSearchString] = useState<string>('');

  // Generate chainIds for API request based on selection
  const chainIdsForApi = useMemo(() => {
    if (!bridgeFeatureFlags.chainRanking) {
      return [];
    }

    // If a specific chain is selected, use only that chain
    if (selectedChainId) {
      return [selectedChainId];
    }

    // If "All" is selected, use all chains from chainRanking
    return (
      bridgeFeatureFlags.chainRanking
        .map((chain) => chain.chainId)
        // Temporarily exclude Solana due to API not supporting it
        .filter((chainId) => chainId !== SolScope.Mainnet)
    );
  }, [selectedChainId, bridgeFeatureFlags]);

  const handleClose = () => {
    navigation.goBack();
  };

  const handleChainSelect = (chainId?: Hex | CaipChainId) => {
    setSelectedChainId(chainId);
    // TODO: Implement token filtering based on selected chain
  };

  const handleSearchTextChange = (text: string) => {
    setSearchString(text);
    // TODO: Implement token search functionality
  };

  useEffect(() => {
    const fetchPopularAssets = async () => {
      setIsLoading(true);
      // TODO: Implement assets with balance
      const assetsWithBalance: PopularToken[] = [];

      const response = await fetch(
        'https://bridge.dev-api.cx.metamask.io/getTokens/popular',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            chainIds: chainIdsForApi,
            excludeAssetIds: [],
          }),
        },
      );
      // Merge assets with balance and popular assets from API
      const popularAssets: PopularToken[] = await response.json();
      const mergedAssets = [...assetsWithBalance, ...popularAssets];

      setAssets(mergedAssets);
      setIsLoading(false);
    };

    fetchPopularAssets();
  }, [selectedChainId, chainIdsForApi]);

  // Create skeleton placeholders while loading
  const displayData = useMemo(() => {
    if (isLoading) {
      // Show 8 skeleton items while loading
      return Array(8).fill(null);
    }
    return assets;
  }, [isLoading, assets]);

  const handleTokenPress = useCallback(() => {
    // TODO: Implement token selection - dispatch to Redux and navigate back
    navigation.goBack();
  }, [navigation]);

  const renderToken = useCallback(
    ({ item }: { item: PopularToken | null }) => {
      // This is to support a partial loading state for top tokens
      // We can show tokens with balance immediately, but we need to wait for the top tokens to load
      if (!item) {
        return <SkeletonItem />;
      }

      // Parse the CAIP assetId to extract the address
      const { assetReference: itemAddress } = parseCaipAssetType(item.assetId);

      // Convert PopularToken to BridgeToken for TokenSelectorItem
      const tokenForDisplay = {
        ...item,
        address: itemAddress,
      };

      // Open the asset details screen as a bottom sheet
      // Use dispatch with unique key to force new modal instance
      const handleInfoButtonPress = () => {
        navigation.dispatch({
          type: 'NAVIGATE',
          payload: {
            name: 'Asset',
            key: `Asset-${itemAddress}-${item.chainId}-${Date.now()}`,
            params: { ...item },
          },
        });

        // TODO: update event props
        // Engine.context.BridgeController.trackUnifiedSwapBridgeEvent(
        //   UnifiedSwapBridgeEventName.AssetDetailTooltipClicked,
        //   {
        //     token_name: item.name ?? 'Unknown',
        //     token_symbol: item.symbol,
        //     token_contract: itemAddress,
        //     chain_name: networkName,
        //     chain_id: item.chainId,
        //   },
        // );
      };

      return (
        <TokenSelectorItem
          token={tokenForDisplay}
          isSelected={
            selectedToken &&
            selectedToken.address.toLowerCase() === itemAddress.toLowerCase() &&
            formatChainIdToCaip(selectedToken.chainId) === item.chainId
          }
          onPress={() => handleTokenPress(item)}
          networkImageSource={getNetworkImageSource({
            chainId: item.chainId,
          })}
        >
          <ButtonIcon
            iconName={IconName.Info}
            size={ButtonIconSize.Md}
            onPress={handleInfoButtonPress}
            iconProps={{ color: IconColor.IconAlternative }}
          />
        </TokenSelectorItem>
      );
    },
    [navigation, selectedToken, handleTokenPress],
  );

  const keyExtractor = (item: PopularToken | null, index: number) =>
    item?.assetId ? item.assetId : `skeleton-${index}`;

  return (
    <BottomSheet
      ref={sheetRef}
      isFullscreen
      keyboardAvoidingViewEnabled={false}
    >
      <BottomSheetHeader onClose={handleClose}>
        <Text variant={TextVariant.HeadingMD}>
          {strings('bridge.select_token')}
        </Text>
      </BottomSheetHeader>

      <Box style={styles.buttonContainer}>
        <NetworkPills
          selectedChainId={selectedChainId}
          onChainSelect={handleChainSelect}
        />

        <TextFieldSearch
          value={searchString}
          onChangeText={handleSearchTextChange}
          placeholder={strings('swaps.search_token')}
          testID="bridge-token-search-input"
          style={styles.searchInput}
        />
      </Box>

      <View>
        <FlatList
          style={styles.tokensList}
          data={displayData}
          renderItem={renderToken}
          keyExtractor={keyExtractor}
          showsVerticalScrollIndicator
          showsHorizontalScrollIndicator={false}
        />
      </View>
    </BottomSheet>
  );
};
