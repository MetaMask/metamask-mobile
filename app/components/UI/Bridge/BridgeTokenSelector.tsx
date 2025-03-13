import React, { useCallback, useMemo } from 'react';
import { StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { Box } from '../Box/Box';
import Text, { TextVariant, TextColor } from '../../../component-library/components/Texts/Text';
import { useStyles } from '../../../component-library/hooks';
import { Theme } from '../../../util/theme/models';
import BottomSheetHeader from '../../../component-library/components/BottomSheets/BottomSheetHeader';
import BottomSheet from '../../../component-library/components/BottomSheets/BottomSheet';
import { TokenI } from '../Tokens/types';
import { Hex } from '@metamask/utils';
import { selectChainId, selectNetworkConfigurations } from '../../../selectors/networkController';
import { BridgeToken } from './types';
import { SupportedCaipChainId } from '@metamask/multichain-network-controller';
import { setSourceToken } from '../../../core/redux/slices/bridge';
import { getNetworkImageSource } from '../../../util/networks';
import Icon, { IconName } from '../../../component-library/components/Icons/Icon';
import { IconSize } from '../../../component-library/components/Icons/Icon/Icon.types';
import { TokenSelectorItem } from './TokenSelectorItem';
import { useSourceTokens, TokenIWithFiatAmount } from './useSourceTokens';
import { strings } from '../../../../locales/i18n';
import { FlexDirection, AlignItems, JustifyContent } from '../Box/box.types';
import { useTokenSearch } from './useTokenSearch';
import TextFieldSearch from '../../../component-library/components/Form/TextFieldSearch';
import Button, { ButtonVariants } from '../../../component-library/components/Buttons/Button';
import Routes from '../../../constants/navigation/Routes';

const createStyles = (params: { theme: Theme }) => {
  const { theme } = params;
  return StyleSheet.create({
    content: {
      flex: 1,
      backgroundColor: theme.colors.background.default,
    },
    headerTitle: {
      flex: 1,
      textAlign: 'center',
    },
    closeButton: {
      position: 'absolute',
      right: 0,
    },
    closeIconBox: {
      padding: 8,
    },
    listContent: {
      padding: 4,
    },
    input: {
      marginHorizontal: 24,
      marginVertical: 10,
    },
    emptyList: {
      marginVertical: 10,
      marginHorizontal: 24,
    },
  });
};

export const BridgeTokenSelector: React.FC = () => {
  const { styles, theme } = useStyles(createStyles, {});
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const currentChainId = useSelector(selectChainId) as Hex;
  const networkConfigurations = useSelector(selectNetworkConfigurations);
  const tokensList = useSourceTokens();
  const { searchString, setSearchString, searchResults } = useTokenSearch({
    tokens: tokensList || [],
  });
  const tokensToRender = useMemo(() =>
    searchString ? searchResults : tokensList,
    [searchString, searchResults, tokensList]
  );

  const handleTokenPress = useCallback((token: TokenI) => {
    const bridgeToken: BridgeToken = {
      address: token.address,
      symbol: token.symbol,
      image: token.image,
      decimals: token.decimals,
      chainId: token.chainId as SupportedCaipChainId,
    };

    dispatch(setSourceToken(bridgeToken));
    navigation.goBack();
  }, [dispatch, navigation]);

  const getNetworkBadgeDetails = useCallback((chainId: Hex) => {
    const network = networkConfigurations[chainId];
    return {
      name: network?.name || '',
      //@ts-expect-error - The utils/network file is still JS and this function expects a networkType, and should be optional
      imageSource: getNetworkImageSource({ chainId }),
    };
  }, [networkConfigurations]);

  const renderItem = useCallback(({ item }: { item: TokenIWithFiatAmount }) => {
    const networkDetails = getNetworkBadgeDetails(currentChainId);

    return (
      <TokenSelectorItem
        token={item}
        onPress={handleTokenPress}
        networkName={networkDetails.name}
        networkImageSource={networkDetails.imageSource}
      />
    );
  }, [currentChainId, getNetworkBadgeDetails, handleTokenPress]);

  const keyExtractor = useCallback((token: TokenI) => token.address, []);

  const handleSearchTextChange = useCallback((text: string) => {
    setSearchString(text);
  }, [setSearchString]);

  const renderEmptyList = useMemo(
    () => (
      <Box style={styles.emptyList}>
        <Text color={TextColor.Alternative}>
          {strings('swaps.no_tokens_result', { searchString })}
        </Text>
      </Box>
    ),
    [searchString, styles],
  );

  return (
    <BottomSheet isFullscreen>
      <Box style={styles.content}>
        <Box gap={4}>
          <BottomSheetHeader>
            <Box
              flexDirection={FlexDirection.Row}
              alignItems={AlignItems.center}
              justifyContent={JustifyContent.center}
            >
              <Text variant={TextVariant.HeadingMD} style={styles.headerTitle}>
                {strings('bridge.select_token')}
              </Text>
              <Box style={[styles.closeButton, styles.closeIconBox]}>
                <TouchableOpacity
                  onPress={() => navigation.goBack()}
                  testID="bridge-token-selector-close-button"
                >
                  <Icon
                    name={IconName.Close}
                    size={IconSize.Sm}
                    color={theme.colors.icon.default}
                  />
                </TouchableOpacity>
              </Box>
            </Box>
          </BottomSheetHeader>

          <Box>
            <Button
              onPress={() => navigation.navigate(Routes.SHEET.BRIDGE_NETWORK_SELECTOR)}
              variant={ButtonVariants.Primary}
              label="All networks"
            />
          </Box>
          <TextFieldSearch
            value={searchString}
            onChangeText={handleSearchTextChange}
            placeholder={strings('swaps.search_token')}
            style={styles.input}
            testID="bridge-token-search-input"
          />
        </Box>

        <FlatList
          data={tokensToRender}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmptyList}
          removeClippedSubviews
          maxToRenderPerBatch={10}
          windowSize={10}
          initialNumToRender={20}
          keyboardShouldPersistTaps="always"
        />
      </Box>
    </BottomSheet>
  );
};
