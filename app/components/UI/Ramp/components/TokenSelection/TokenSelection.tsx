import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { FlatList } from 'react-native-gesture-handler';
import { CaipChainId } from '@metamask/utils';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';

import ScreenLayout from '../../Aggregator/components/ScreenLayout';
import TokenNetworkFilterBar from '../TokenNetworkFilterBar';
import TokenListItem from '../TokenListItem';
import { createUnsupportedTokenModalNavigationDetails } from '../UnsupportedTokenModal/UnsupportedTokenModal';

import { Box } from '@metamask/design-system-react-native';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import ListItemSelect from '../../../../../component-library/components/List/ListItemSelect';
import TextFieldSearch from '../../../../../component-library/components/Form/TextFieldSearch';

import useSearchTokenResults from '../../Deposit/hooks/useSearchTokenResults';

import {
  createNavigationDetails,
  useParams,
} from '../../../../../util/navigation/navUtils';
import { strings } from '../../../../../../locales/i18n';
import { getDepositNavbarOptions } from '../../../Navbar';
import Routes from '../../../../../constants/navigation/Routes';
import { getRampRoutingDecision } from '../../../../../reducers/fiatOrders';
import { useTheme } from '../../../../../util/theme';
import {
  MOCK_CRYPTOCURRENCIES,
  MockDepositCryptoCurrency,
} from '../../Deposit/constants/mockCryptoCurrencies';
import { RampIntent } from '../../Aggregator/types';
// TODO: Fetch these tokens from the API new enpoint for top 25 with supported status
//https://consensyssoftware.atlassian.net/browse/TRAM-2816

interface TokenSelectionParams {
  intent?: RampIntent;
}

export const createTokenSelectionNavDetails =
  createNavigationDetails<TokenSelectionParams>(Routes.RAMP.TOKEN_SELECTION);

function TokenSelection() {
  const listRef = useRef<FlatList>(null);
  const [searchString, setSearchString] = useState('');
  const [networkFilter, setNetworkFilter] = useState<CaipChainId[] | null>(
    null,
  );
  const theme = useTheme();

  const navigation = useNavigation();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const rampRoutingDecision = useSelector(getRampRoutingDecision);

  const { intent } = useParams<TokenSelectionParams>();
  const selectedCryptoAssetId = intent?.assetId;

  const supportedTokens = MOCK_CRYPTOCURRENCIES;

  const searchTokenResults = useSearchTokenResults({
    tokens: supportedTokens,
    networkFilter,
    searchString,
  });

  const handleSelectAssetIdCallback = useCallback((_assetId: string) => {
    // TODO: Handle token by routing to the appropriate agg or deposit screen with asset id as param and pre-select it
    // https://consensyssoftware.atlassian.net/browse/TRAM-2795
  }, []);

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

  const handleUnsupportedInfoPress = useCallback(() => {
    navigation.navigate(...createUnsupportedTokenModalNavigationDetails());
  }, [navigation]);

  const renderToken = useCallback(
    ({ item: token }: { item: MockDepositCryptoCurrency }) => (
      <TokenListItem
        token={token}
        isSelected={selectedCryptoAssetId === token.assetId}
        onPress={() => handleSelectAssetIdCallback(token.assetId)}
        isDisabled={token.unsupported}
        onInfoPress={handleUnsupportedInfoPress}
      />
    ),
    [
      handleSelectAssetIdCallback,
      selectedCryptoAssetId,
      handleUnsupportedInfoPress,
    ],
  );

  const renderEmptyList = useCallback(
    () => (
      <ListItemSelect isSelected={false} isDisabled>
        <Text variant={TextVariant.BodyLGMedium}>
          {strings('deposit.token_modal.no_tokens_found', {
            searchString,
          })}
        </Text>
      </ListItemSelect>
    ),
    [searchString],
  );

  const uniqueNetworks = useMemo(() => {
    const uniqueNetworksSet = new Set<CaipChainId>();
    for (const token of supportedTokens) {
      uniqueNetworksSet.add(token.chainId);
    }
    return Array.from(uniqueNetworksSet);
  }, [supportedTokens]);

  useEffect(() => {
    navigation.setOptions(
      getDepositNavbarOptions(
        navigation,
        {
          title: strings('deposit.token_modal.select_token'),
          showBack: false,
        },
        theme,
      ),
    );
  }, [navigation, theme]);

  return (
    <ScreenLayout>
      <ScreenLayout.Body>
        <Box twClassName="py-2">
          <TokenNetworkFilterBar
            networks={uniqueNetworks}
            networkFilter={networkFilter}
            setNetworkFilter={setNetworkFilter}
          />
        </Box>
        <Box twClassName="px-4 py-3">
          <TextFieldSearch
            value={searchString}
            showClearButton={searchString.length > 0}
            onPressClearButton={clearSearchText}
            onFocus={scrollToTop}
            onChangeText={handleSearchTextChange}
            placeholder={strings(
              'deposit.token_modal.search_by_name_or_address',
            )}
          />
        </Box>
        <FlatList
          ref={listRef}
          data={searchTokenResults}
          renderItem={renderToken}
          extraData={selectedCryptoAssetId}
          keyExtractor={(item) => item.assetId}
          ListEmptyComponent={renderEmptyList}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="always"
        />
      </ScreenLayout.Body>
    </ScreenLayout>
  );
}

export default TokenSelection;
