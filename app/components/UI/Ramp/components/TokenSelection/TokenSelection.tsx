import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ActivityIndicator } from 'react-native';
import { FlatList } from 'react-native-gesture-handler';
import { CaipChainId } from '@metamask/utils';
import { useNavigation } from '@react-navigation/native';

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
import { useRampTokens, RampsToken } from '../../hooks/useRampTokens';

import {
  createNavigationDetails,
  useParams,
} from '../../../../../util/navigation/navUtils';
import { strings } from '../../../../../../locales/i18n';
import { getDepositNavbarOptions } from '../../../Navbar';
import Routes from '../../../../../constants/navigation/Routes';
import { useTheme } from '../../../../../util/theme';
import { RampIntent } from '../../Aggregator/types';

export const createTokenSelectionNavDetails = createNavigationDetails<{
  intent?: RampIntent;
}>(Routes.RAMP.TOKEN_SELECTION);

function TokenSelection() {
  const listRef = useRef<FlatList>(null);
  const [searchString, setSearchString] = useState('');
  const [networkFilter, setNetworkFilter] = useState<CaipChainId[] | null>(
    null,
  );
  const theme = useTheme();

  const navigation = useNavigation();

  const { intent } = useParams<{ intent?: RampIntent }>();
  const selectedCryptoAssetId = intent?.assetId;

  const { topTokens, allTokens, isLoading, error } = useRampTokens();

  // Use topTokens for initial display, allTokens when searching
  const supportedTokens = useMemo(() => {
    const tokensToUse = searchString.trim() ? allTokens : topTokens;
    return tokensToUse || [];
  }, [searchString, allTokens, topTokens]);

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
    ({ item: token }: { item: RampsToken }) => (
      <TokenListItem
        token={token}
        onPress={() => handleSelectAssetIdCallback(token.assetId)}
        isDisabled={!token.tokenSupported}
        onInfoPress={handleUnsupportedInfoPress}
      />
    ),
    [handleSelectAssetIdCallback, handleUnsupportedInfoPress],
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

  if (isLoading) {
    return (
      <ScreenLayout>
        <ScreenLayout.Body>
          <Box twClassName="flex-1 items-center justify-center">
            <ActivityIndicator
              size="large"
              color={theme.colors.primary.default}
            />
          </Box>
        </ScreenLayout.Body>
      </ScreenLayout>
    );
  }

  if (error) {
    return (
      <ScreenLayout>
        <ScreenLayout.Body>
          <Box twClassName="flex-1 items-center justify-center px-4">
            <Box twClassName="text-center">
              <Text variant={TextVariant.BodyMD}>
                {strings('deposit.token_modal.error_loading_tokens')}
              </Text>
            </Box>
          </Box>
        </ScreenLayout.Body>
      </ScreenLayout>
    );
  }

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
          data={searchTokenResults as unknown as RampsToken[]}
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
