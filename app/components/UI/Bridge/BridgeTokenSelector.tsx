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
import { selectNetworkConfigurations } from '../../../selectors/networkController';
import { selectSelectedSourceChainIds, selectEnabledSourceChains, setSourceToken } from '../../../core/redux/slices/bridge';
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
import { useSortedSourceNetworks } from './useSortedSourceNetworks';
import { MAX_NETWORK_ICONS, SourceNetworksButtonLabel } from './SourceNetworksButtonLabel';

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
    emptyList: {
      marginVertical: 10,
      marginHorizontal: 24,
    },
    networksButton: {
      borderColor: theme.colors.border.muted,
    },
    buttonContainer: {
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
  });
};

export const BridgeTokenSelector: React.FC = () => {
  const { styles, theme } = useStyles(createStyles, {});
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const networkConfigurations = useSelector(selectNetworkConfigurations);
  const enabledSourceChains = useSelector(selectEnabledSourceChains);
  const selectedSourceChainIds = useSelector(selectSelectedSourceChainIds);
  const tokensList = useSourceTokens();
  const { searchString, setSearchString, searchResults } = useTokenSearch({
    tokens: tokensList || [],
  });
  const tokensToRender = useMemo(() =>
    searchString ? searchResults : tokensList,
    [searchString, searchResults, tokensList]
  );
  const { sortedSourceNetworks } = useSortedSourceNetworks();

  const handleTokenPress = useCallback((token: TokenI) => {
    dispatch(setSourceToken(token));
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
    const networkDetails = getNetworkBadgeDetails(item.chainId as Hex);

    return (
      <TokenSelectorItem
        token={item}
        onPress={handleTokenPress}
        networkName={networkDetails.name}
        networkImageSource={networkDetails.imageSource}
      />
    );
  }, [getNetworkBadgeDetails, handleTokenPress]);

  const keyExtractor = useCallback((token: TokenI) => `${token.chainId}-${token.address}`, []);

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

  const navigateToNetworkSelector = useCallback(() => {
    navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.SHEET.BRIDGE_NETWORK_SELECTOR,
      params: {
        testing: 'testing',
      },
    });
  }, [navigation]);

  const networksToShow = useMemo(() =>
    sortedSourceNetworks
      .filter(({ chainId }) => selectedSourceChainIds.includes(chainId))
      .filter((_, i) => i < MAX_NETWORK_ICONS),
    [selectedSourceChainIds, sortedSourceNetworks],
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
        </Box>

        <Box style={styles.buttonContainer} gap={16}>
          <Button
            onPress={navigateToNetworkSelector}
            variant={ButtonVariants.Secondary}
            label={<SourceNetworksButtonLabel
              networksToShow={networksToShow}
              networkConfigurations={networkConfigurations}
              selectedSourceChainIds={selectedSourceChainIds as Hex[]}
              enabledSourceChains={enabledSourceChains}
            />}
            style={styles.networksButton}
            endIconName={IconName.ArrowDown}
            />

          <TextFieldSearch
            value={searchString}
            onChangeText={handleSearchTextChange}
            placeholder={strings('swaps.search_token')}
            testID="bridge-token-search-input"
            />
        </Box>

        <FlatList
          data={tokensToRender}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmptyList}
        />
      </Box>
    </BottomSheet>
  );
};
