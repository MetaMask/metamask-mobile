import React, { useCallback, useRef, useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { FlatList } from 'react-native-gesture-handler';
import { useSelector } from 'react-redux';

import Text, {
  TextVariant,
} from '../../../../../../../component-library/components/Texts/Text';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import ListItemSelect from '../../../../../../../component-library/components/List/ListItemSelect';
import ListItemColumn, {
  WidthType,
} from '../../../../../../../component-library/components/List/ListItemColumn';
import AvatarToken from '../../../../../../../component-library/components/Avatars/Avatar/variants/AvatarToken';
import { AvatarSize } from '../../../../../../../component-library/components/Avatars/Avatar';
import BadgeNetwork from '../../../../../../../component-library/components/Badges/Badge/variants/BadgeNetwork';
import BadgeWrapper, {
  BadgePosition,
} from '../../../../../../../component-library/components/Badges/BadgeWrapper';
import TextFieldSearch from '../../../../../../../component-library/components/Form/TextFieldSearch';

import styleSheet from './TokenSelectorModal.styles';
import { useStyles } from '../../../../../../hooks/useStyles';
import useSupportedTokens from '../../../hooks/useSupportedTokens';
import useSearchTokenResults from '../../../hooks/useSearchTokenResults';

import { selectNetworkConfigurationsByCaipChainId } from '../../../../../../../selectors/networkController';
import {
  createNavigationDetails,
  useParams,
} from '../../../../../../../util/navigation/navUtils';
import { getNetworkImageSource } from '../../../../../../../util/networks';
import { DepositCryptoCurrency } from '../../../constants';
import Routes from '../../../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../../../locales/i18n';

interface TokenSelectorModalNavigationDetails {
  selectedAssetId?: string;
  handleSelectAssetId?: (assetId: string) => void;
}

export const createTokenSelectorModalNavigationDetails =
  createNavigationDetails(
    Routes.DEPOSIT.MODALS.ID,
    Routes.DEPOSIT.MODALS.TOKEN_SELECTOR,
  );

function TokenSelectorModal() {
  const sheetRef = useRef<BottomSheetRef>(null);
  const listRef = useRef<FlatList>(null);

  const { selectedAssetId, handleSelectAssetId } =
    useParams<TokenSelectorModalNavigationDetails>();
  const [searchString, setSearchString] = useState('');
  const { height: screenHeight } = useWindowDimensions();
  const { styles } = useStyles(styleSheet, {
    screenHeight,
  });

  const supportedTokens = useSupportedTokens();
  const searchTokenResults = useSearchTokenResults({
    tokens: supportedTokens,
    searchString,
  });

  const allNetworkConfigurations = useSelector(
    selectNetworkConfigurationsByCaipChainId,
  );

  const handleSelectAssetIdCallback = useCallback(
    (assetId: string) => {
      if (handleSelectAssetId) {
        handleSelectAssetId(assetId);
      }
      sheetRef.current?.onCloseBottomSheet();
    },
    [handleSelectAssetId],
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
    ({ item: token }: { item: DepositCryptoCurrency }) => {
      const networkName = allNetworkConfigurations[token.chainId]?.name;
      const networkImageSource = getNetworkImageSource({
        chainId: token.chainId,
      });
      return (
        <ListItemSelect
          isSelected={selectedAssetId === token.assetId}
          onPress={() => handleSelectAssetIdCallback(token.assetId)}
          accessibilityRole="button"
          accessible
        >
          <ListItemColumn widthType={WidthType.Auto}>
            <BadgeWrapper
              badgePosition={BadgePosition.BottomRight}
              badgeElement={
                <BadgeNetwork
                  name={networkName}
                  imageSource={networkImageSource}
                />
              }
            >
              <AvatarToken
                name={token.name}
                imageSource={{ uri: token.iconUrl }}
                size={AvatarSize.Md}
              />
            </BadgeWrapper>
          </ListItemColumn>
          <ListItemColumn widthType={WidthType.Fill}>
            <Text variant={TextVariant.BodyLGMedium}>{token.name}</Text>
            <Text variant={TextVariant.BodySM}>{token.symbol}</Text>
          </ListItemColumn>
        </ListItemSelect>
      );
    },
    [allNetworkConfigurations, handleSelectAssetIdCallback, selectedAssetId],
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

  return (
    <BottomSheet ref={sheetRef} shouldNavigateBack>
      <BottomSheetHeader onClose={() => sheetRef.current?.onCloseBottomSheet()}>
        <Text variant={TextVariant.HeadingMD}>
          {strings('deposit.token_modal.select_a_token')}
        </Text>
      </BottomSheetHeader>
      <View style={styles.searchContainer}>
        <TextFieldSearch
          value={searchString}
          showClearButton={searchString.length > 0}
          onPressClearButton={clearSearchText}
          onFocus={scrollToTop}
          onChangeText={handleSearchTextChange}
          placeholder={strings('deposit.token_modal.search_by_name_or_address')}
        />
      </View>
      <FlatList
        style={styles.list}
        ref={listRef}
        data={searchTokenResults}
        renderItem={renderToken}
        extraData={selectedAssetId}
        keyExtractor={(item) => item.assetId}
        ListEmptyComponent={renderEmptyList}
        keyboardDismissMode="none"
        keyboardShouldPersistTaps="always"
      ></FlatList>
    </BottomSheet>
  );
}
export default TokenSelectorModal;
