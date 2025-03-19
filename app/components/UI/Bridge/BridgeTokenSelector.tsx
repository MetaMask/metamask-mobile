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
import Badge, { BadgeVariant } from '../../../component-library/components/Badges/Badge';
import { useSortedSourceNetworks } from './useSortedSourceNetworks';

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
    networkOverflowCircle: {
      backgroundColor: theme.colors.background.alternative,
      width: 20,
      height: 20,
      borderRadius: 10,
    },
  });
};

const MAX_NETWORK_ICONS = 2;

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

  const numNetworksLabel = useMemo(() => {
    let networkText = '';
    if (selectedSourceChainIds.length === enabledSourceChains.length) {
      networkText = strings('bridge.all_networks');
    } else if (selectedSourceChainIds.length === 1) {
      networkText = strings('bridge.one_network');
    } else {
      networkText = strings('bridge.num_networks', { numNetworks: selectedSourceChainIds.length });
    }

    const networksToShow = sortedSourceNetworks
      .filter(({ chainId }) => selectedSourceChainIds.includes(chainId))
      .filter((_, i) => i < MAX_NETWORK_ICONS);

    return (
      <Box flexDirection={FlexDirection.Row} alignItems={AlignItems.center} gap={4}>
        <Box flexDirection={FlexDirection.Row} alignItems={AlignItems.center} gap={-8}>
          {networksToShow.map(({ chainId }) => (
            <Badge
              key={chainId}
            variant={BadgeVariant.Network}
            // @ts-expect-error - The utils/network file is still JS and this function expects a networkType, and should be optional
            imageSource={getNetworkImageSource({ chainId })}
            name={networkConfigurations[chainId]?.name}
            />
          ))}
          {selectedSourceChainIds.length > MAX_NETWORK_ICONS && (
            <Box style={styles.networkOverflowCircle} justifyContent={JustifyContent.center} alignItems={AlignItems.center}>
              <Text variant={TextVariant.BodySM}>+{selectedSourceChainIds.length - MAX_NETWORK_ICONS}</Text>
            </Box>
          )}
        </Box>
        <Text>{networkText}</Text>
      </Box>
    );
  }, [selectedSourceChainIds, enabledSourceChains, networkConfigurations, sortedSourceNetworks, styles]);

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
            label={numNetworksLabel}
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
