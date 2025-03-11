import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, FlatList, TouchableOpacity, TextInput, View, Platform } from 'react-native';
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
import Engine from '../../../core/Engine';
import Icon, { IconName } from '../../../component-library/components/Icons/Icon';
import { IconSize } from '../../../component-library/components/Icons/Icon/Icon.types';
import { TokenSelectorItem } from './TokenSelectorItem';
import { useSourceTokens } from './useSourceTokens';
import { strings } from '../../../../locales/i18n';
import { FlexDirection, AlignItems, JustifyContent } from '../Box/box.types';
import Fuse from 'fuse.js';

const MAX_TOKENS_RESULTS = 20;

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
    inputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: 24,
      marginVertical: 10,
      paddingVertical: Platform.OS === 'android' ? 0 : 10,
      paddingHorizontal: 16,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.colors.border.default,
    },
    searchIcon: {
      marginRight: 8,
    },
    input: {
      flex: 1,
      color: theme.colors.text.default,
      fontSize: 16,
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
  const searchInput = useRef<TextInput>(null);
  const [searchString, setSearchString] = useState('');

  useEffect(() => {
    const { BridgeController } = Engine.context;
    BridgeController.setBridgeFeatureFlags();
  }, []);

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

  const tokenFuse = useMemo(
    () =>
      new Fuse(tokensList || [], {
        shouldSort: true,
        threshold: 0.45,
        location: 0,
        distance: 100,
        maxPatternLength: 32,
        minMatchCharLength: 1,
        keys: ['symbol', 'address', 'name'],
      }),
    [tokensList],
  );

  const tokenSearchResults = useMemo(
    () =>
      searchString.length > 0
        ? (tokenFuse.search(searchString)).slice(0, MAX_TOKENS_RESULTS)
        : tokensList,
    [searchString, tokenFuse, tokensList],
  );

  const renderItem = useCallback(({ item }: { item: TokenI }) => {
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

  const handleSearchPress = useCallback(() => {
    searchInput?.current?.focus();
  }, []);

  const handleSearchTextChange = useCallback((text: string) => {
    setSearchString(text);
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearchString('');
    searchInput?.current?.focus();
  }, []);

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

          <TouchableOpacity onPress={handleSearchPress}>
            <View style={styles.inputWrapper}>
              <Icon
                name={IconName.Search}
                size={IconSize.Sm}
                color={theme.colors.icon.alternative}
                style={styles.searchIcon}
              />
              <TextInput
                ref={searchInput}
                style={styles.input}
                placeholder={strings('swaps.search_token')}
                placeholderTextColor={theme.colors.text.muted}
                value={searchString}
                onChangeText={handleSearchTextChange}
                testID="bridge-token-search-input"
              />
              {searchString.length > 0 && (
                <TouchableOpacity onPress={handleClearSearch}>
                  <Icon
                    name={IconName.Close}
                    size={IconSize.Sm}
                    color={theme.colors.icon.alternative}
                  />
                </TouchableOpacity>
              )}
            </View>
          </TouchableOpacity>
        </Box>

        <FlatList
          data={tokenSearchResults}
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
