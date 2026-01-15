import React, { useCallback, useMemo, useRef, useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { FlatList } from 'react-native-gesture-handler';
import Fuse from 'fuse.js';
import { useSelector } from 'react-redux';

import Text, {
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../../component-library/components/BottomSheets/BottomSheet';
import HeaderCenter from '../../../../../../component-library/components-temp/HeaderCenter';
import ListItemSelect from '../../../../../../component-library/components/List/ListItemSelect';
import ListItemColumn, {
  WidthType,
} from '../../../../../../component-library/components/List/ListItemColumn';
import BadgeNetwork from '../../../../../../component-library/components/Badges/Badge/variants/BadgeNetwork';
import BadgeWrapper, {
  BadgePosition,
} from '../../../../../../component-library/components/Badges/BadgeWrapper';
import TextFieldSearch from '../../../../../../component-library/components/Form/TextFieldSearch';

import { useStyles } from '../../../../../hooks/useStyles';
import { useTheme } from '../../../../../../util/theme';
import { CryptoCurrency } from '@consensys/on-ramp-sdk';
import {
  createNavigationDetails,
  useParams,
} from '../../../../../../util/navigation/navUtils';
import Routes from '../../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../../locales/i18n';
import { selectTokenSelectors } from './SelectToken.testIds';
import { useRampSDK } from '../../sdk';

import styleSheet from './TokenSelectModal.styles';
import { selectNetworkConfigurationsByCaipChainId } from '../../../../../../selectors/networkController';
import { NetworkConfiguration } from '@metamask/network-controller';
import { getNetworkImageSource } from '../../../../../../util/networks';
import { getCaipChainIdFromCryptoCurrency } from '../../utils';
import NetworksFilterBar from '../../../Deposit/components/NetworksFilterBar';
import { CaipChainId } from '@metamask/utils';
import NetworksFilterSelector from '../../../Deposit/components/NetworksFilterSelector/NetworksFilterSelector';
import {
  AvatarToken,
  AvatarTokenSize,
} from '@metamask/design-system-react-native';

const MAX_TOKENS_RESULTS = 20;

interface TokenSelectModalNavigationDetails {
  tokens: CryptoCurrency[];
}

export const createTokenSelectModalNavigationDetails =
  createNavigationDetails<TokenSelectModalNavigationDetails>(
    Routes.RAMP.MODALS.ID,
    Routes.RAMP.MODALS.TOKEN_SELECTOR,
  );

function TokenSelectModal() {
  const sheetRef = useRef<BottomSheetRef>(null);
  const listRef = useRef<FlatList>(null);

  const { tokens } = useParams<TokenSelectModalNavigationDetails>();
  const [searchString, setSearchString] = useState('');
  const [networkFilter, setNetworkFilter] = useState<CaipChainId[] | null>(
    null,
  );
  const [isEditingNetworkFilter, setIsEditingNetworkFilter] = useState(false);
  const networksByCaipChainId = useSelector(
    selectNetworkConfigurationsByCaipChainId,
  );
  const { setSelectedAsset, selectedAsset } = useRampSDK();

  const { height: screenHeight } = useWindowDimensions();
  const { styles } = useStyles(styleSheet, {
    screenHeight,
  });

  const { colors } = useTheme();

  const getNetworkImageForToken = useCallback(
    (token: CryptoCurrency) => {
      if (!token.network?.chainId) return undefined;

      try {
        const caipChainId = getCaipChainIdFromCryptoCurrency(token);
        if (!caipChainId) return undefined;

        const networkConfig = networksByCaipChainId[
          caipChainId
        ] as NetworkConfiguration;
        const networkType = networkConfig?.rpcEndpoints?.[0]?.type || 'custom';

        return getNetworkImageSource({
          networkType,
          chainId: caipChainId,
        });
      } catch (error) {
        console.warn(
          'Error getting network image for token:',
          token.symbol,
          error,
        );
        return undefined;
      }
    },
    [networksByCaipChainId],
  );

  const networkFilteredTokens = useMemo(() => {
    if (!networkFilter || networkFilter.length === 0) {
      return tokens;
    }
    return tokens.filter((token) => {
      const caipChainId = getCaipChainIdFromCryptoCurrency(token);
      return caipChainId ? networkFilter.includes(caipChainId) : false;
    });
  }, [tokens, networkFilter]);

  const tokenFuse = useMemo(
    () =>
      new Fuse(networkFilteredTokens, {
        shouldSort: true,
        threshold: 0.45,
        location: 0,
        distance: 100,
        maxPatternLength: 32,
        minMatchCharLength: 1,
        keys: [
          'symbol',
          'address',
          'name',
          'network.shortName',
          'network.name',
        ],
      }),
    [networkFilteredTokens],
  );

  const searchTokenResults = useMemo(
    () =>
      searchString.length > 0
        ? tokenFuse.search(searchString)?.slice(0, MAX_TOKENS_RESULTS) || []
        : networkFilteredTokens || [],
    [networkFilteredTokens, searchString, tokenFuse],
  );

  const handleSelectTokenCallback = useCallback(
    (newAsset: CryptoCurrency) => {
      setSelectedAsset(newAsset);
      sheetRef.current?.onCloseBottomSheet();
    },
    [setSelectedAsset],
  );

  const scrollToTop = useCallback(() => {
    if (listRef?.current) {
      listRef?.current.scrollToOffset({
        animated: false,
        offset: 0,
      });
    }
  }, []);

  const handleSearchTextChange = useCallback(
    (text: string) => {
      setSearchString(text);
      scrollToTop();
    },
    [scrollToTop],
  );

  const clearSearchText = useCallback(() => {
    handleSearchTextChange('');
  }, [handleSearchTextChange]);

  const renderToken = useCallback(
    ({ item: token }: { item: CryptoCurrency }) => (
      <ListItemSelect
        onPress={() => handleSelectTokenCallback(token)}
        isSelected={selectedAsset?.id === token.id}
        accessibilityRole="button"
        accessible
      >
        <ListItemColumn widthType={WidthType.Auto}>
          <BadgeWrapper
            badgePosition={BadgePosition.BottomRight}
            badgeElement={
              <BadgeNetwork
                name={token.network?.shortName}
                imageSource={getNetworkImageForToken(token)}
              />
            }
          >
            <AvatarToken
              name={token.symbol}
              src={{ uri: token.logo }}
              size={AvatarTokenSize.Lg}
              key={token.logo}
            />
          </BadgeWrapper>
        </ListItemColumn>
        <ListItemColumn widthType={WidthType.Fill}>
          <Text variant={TextVariant.BodyLGMedium}>{token.symbol}</Text>
          <Text variant={TextVariant.BodyMD} color={colors.text.alternative}>
            {token.name}
          </Text>
        </ListItemColumn>
      </ListItemSelect>
    ),
    [
      selectedAsset?.id,
      getNetworkImageForToken,
      colors.text.alternative,
      handleSelectTokenCallback,
    ],
  );

  const renderEmptyList = useCallback(
    () => (
      <ListItemSelect isSelected={false} isDisabled>
        <Text variant={TextVariant.BodyLGMedium}>
          {strings('fiat_on_ramp_aggregator.no_tokens_match', {
            searchString,
          })}
        </Text>
      </ListItemSelect>
    ),
    [searchString],
  );

  const uniqueNetworks = useMemo(() => {
    const uniqueNetworksSet = new Set<CaipChainId>();
    for (const token of tokens) {
      const caipChainId = getCaipChainIdFromCryptoCurrency(token);
      if (caipChainId) {
        uniqueNetworksSet.add(caipChainId);
      }
    }
    return Array.from(uniqueNetworksSet);
  }, [tokens]);

  return (
    <BottomSheet ref={sheetRef} shouldNavigateBack>
      <HeaderCenter
        title={strings('fiat_on_ramp_aggregator.select_a_cryptocurrency')}
        onClose={() => sheetRef.current?.onCloseBottomSheet()}
      />
      {isEditingNetworkFilter ? (
        <NetworksFilterSelector
          networks={uniqueNetworks}
          networkFilter={networkFilter}
          setNetworkFilter={setNetworkFilter}
          setIsEditingNetworkFilter={setIsEditingNetworkFilter}
        />
      ) : (
        <>
          <NetworksFilterBar
            networks={uniqueNetworks}
            networkFilter={networkFilter}
            setNetworkFilter={setNetworkFilter}
            setIsEditingNetworkFilter={setIsEditingNetworkFilter}
          />
          <View style={styles.searchContainer}>
            <TextFieldSearch
              value={searchString}
              showClearButton={searchString.length > 0}
              onPressClearButton={clearSearchText}
              onFocus={scrollToTop}
              onChangeText={handleSearchTextChange}
              placeholder={strings(
                'fiat_on_ramp_aggregator.search_by_cryptocurrency',
              )}
              testID={selectTokenSelectors.TOKEN_SELECT_MODAL_SEARCH_INPUT}
            />
          </View>
          <FlatList
            style={styles.list}
            ref={listRef}
            data={searchTokenResults}
            extraData={selectedAsset?.id}
            renderItem={renderToken}
            keyExtractor={(item) => item.id}
            ListEmptyComponent={renderEmptyList}
            keyboardDismissMode="none"
            keyboardShouldPersistTaps="always"
          />
        </>
      )}
    </BottomSheet>
  );
}

export default TokenSelectModal;
