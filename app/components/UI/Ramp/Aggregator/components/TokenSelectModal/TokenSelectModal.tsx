import React, { useCallback, useMemo, useRef, useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { FlatList } from 'react-native-gesture-handler';
import Fuse from 'fuse.js';

import Text, {
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import ListItemSelect from '../../../../../../component-library/components/List/ListItemSelect';
import ListItemColumn, {
  WidthType,
} from '../../../../../../component-library/components/List/ListItemColumn';
import AvatarToken from '../../../../../../component-library/components/Avatars/Avatar/variants/AvatarToken';
import { AvatarSize } from '../../../../../../component-library/components/Avatars/Avatar';
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
import { selectTokenSelectors } from '../../../../../../../e2e/selectors/Ramps/SelectToken.selectors';
import { useRampSDK } from '../../sdk';

import styleSheet from './TokenSelectModal.styles';

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

  const { setSelectedAsset } = useRampSDK();

  const { height: screenHeight } = useWindowDimensions();
  const { styles } = useStyles(styleSheet, {
    screenHeight,
  });

  const { colors } = useTheme();

  const tokenFuse = useMemo(
    () =>
      new Fuse(tokens, {
        shouldSort: true,
        threshold: 0.45,
        location: 0,
        distance: 100,
        maxPatternLength: 32,
        minMatchCharLength: 1,
        keys: ['symbol', 'address', 'name'],
      }),
    [tokens],
  );

  const searchTokenResults = useMemo(
    () =>
      searchString.length > 0
        ? tokenFuse.search(searchString)?.slice(0, MAX_TOKENS_RESULTS)
        : tokens,
    [searchString, tokenFuse, tokens],
  );

  const handleSelectTokenCallback = useCallback(
    (token: CryptoCurrency) => {
      setSelectedAsset(token);
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
          accessibilityRole="button"
          accessible
        >
          <ListItemColumn widthType={WidthType.Auto}>
            <BadgeWrapper
              badgePosition={BadgePosition.BottomRight}
              badgeElement={<BadgeNetwork name={token.network?.shortName} />}
            >
              <AvatarToken
                name={token.name}
                imageSource={{ uri: token.logo }}
                size={AvatarSize.Md}
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
    [colors.text.alternative, handleSelectTokenCallback],
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

  return (
    <BottomSheet ref={sheetRef} shouldNavigateBack>
      <BottomSheetHeader onClose={() => sheetRef.current?.onCloseBottomSheet()}>
        <Text variant={TextVariant.HeadingMD}>
          {strings('fiat_on_ramp_aggregator.select_a_cryptocurrency')}
        </Text>
      </BottomSheetHeader>
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
        data={searchTokenResults || []}
        renderItem={renderToken}
        keyExtractor={(item) => item.id || 'unknown'}
        ListEmptyComponent={renderEmptyList}
        keyboardDismissMode="none"
        keyboardShouldPersistTaps="always"
      />
    </BottomSheet>
  );
}

export default TokenSelectModal;
