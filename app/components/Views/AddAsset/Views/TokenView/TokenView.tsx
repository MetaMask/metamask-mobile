import React, { useCallback, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
} from 'react-native-reanimated';
import {
  AvatarNetwork,
  AvatarNetworkSize,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Icon,
  IconColor,
  IconName,
  IconSize,
  ContentVariant,
  ListItem,
  SelectButton,
  SelectButtonVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { CaipChainId } from '@metamask/utils';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import ExploreSearchBar from '../../../TrendingView/components/ExploreSearchBar/ExploreSearchBar';
import { getNetworkImageSource } from '../../../../../util/networks';
import { useNetworkName } from '../../../../UI/Trending/hooks/useNetworkName/useNetworkName';
import { useHiddenAssetIds } from '../../hooks/useHiddenAssetIds';
import SearchTokenAutocomplete from '../../components/SearchTokenAutoComplete/SearchTokenAutocomplete';
import { ImportTokenViewSelectorsIDs } from '../../ImportAssetView.testIds';

interface ShortcutRowProps {
  iconName: IconName;
  title: string;
  onPress: () => void;
  testID: string;
}

const ShortcutRow = ({
  iconName,
  title,
  onPress,
  testID,
}: ShortcutRowProps) => (
  <ListItem
    isInteractive
    variant={ContentVariant.OneLine}
    title={title}
    startAccessory={<Icon name={iconName} size={IconSize.Md} />}
    endAccessory={
      <Icon
        name={IconName.ArrowRight}
        size={IconSize.Sm}
        color={IconColor.IconAlternative}
      />
    }
    accessoryGap={3}
    onPress={onPress}
    accessibilityRole="button"
    testID={testID}
  />
);

/**
 * Import tokens: search first, then (when not searching) two shortcuts, then
 * the importable token list. Tapping the search pill enters search mode
 * (keyboard opens, shortcuts fade away) and Cancel leaves it. While searching,
 * a network pill under the search filters the results (all networks by
 * default).
 */
const TokenView = () => {
  const tw = useTailwind();
  const navigation = useNavigation<AppNavigationProp>();

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [selectedNetwork, setSelectedNetwork] = useState<CaipChainId | null>(
    null,
  );

  const networkName = useNetworkName(
    selectedNetwork ? [selectedNetwork] : null,
  );
  // Matches the Tokens list control bar, which says "Popular networks".
  const selectedNetworkName = selectedNetwork
    ? networkName
    : strings('wallet.popular_networks');
  const hasHiddenTokens = useHiddenAssetIds().length > 0;

  const placeholder = strings('token.search_tokens_placeholder');
  const handleCancel = useCallback(() => {
    setSearchQuery('');
    setSelectedNetwork(null);
    setIsSearchActive(false);
  }, []);

  return (
    <Box twClassName="flex-1">
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        gap={2}
        twClassName={`px-4 pt-2 ${isSearchActive ? '' : 'pb-2'}`}
        testID={ImportTokenViewSelectorsIDs.ASSET_SEARCH_CONTAINER}
      >
        <Box twClassName="h-12 flex-1">
          {isSearchActive ? (
            <ExploreSearchBar
              type="interactive"
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onCancel={handleCancel}
              placeholder={placeholder}
            />
          ) : (
            <ExploreSearchBar
              type="button"
              onPress={() => setIsSearchActive(true)}
              placeholder={placeholder}
            />
          )}
        </Box>
      </Box>

      {isSearchActive ? (
        <Animated.View
          key="network-pill"
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(150)}
          style={tw.style('flex-row px-4 py-3')}
        >
          <SelectButton
            testID={ImportTokenViewSelectorsIDs.SELECT_NETWORK_BUTTON}
            variant={SelectButtonVariant.Primary}
            placeholder={selectedNetworkName}
            value={selectedNetworkName}
            startAccessory={
              selectedNetwork ? (
                <AvatarNetwork
                  src={getNetworkImageSource({ chainId: selectedNetwork })}
                  size={AvatarNetworkSize.Xs}
                  name={selectedNetworkName}
                />
              ) : undefined
            }
            textProps={{ numberOfLines: 1, ellipsizeMode: 'tail' }}
            twClassName="shrink-0"
            onPress={() =>
              navigation.navigate(Routes.MODAL.TOKEN_NETWORK_FILTER, {
                selectedNetwork,
                onSelect: setSelectedNetwork,
              })
            }
          />
        </Animated.View>
      ) : (
        <Animated.View
          key="shortcuts"
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(150)}
        >
          <ShortcutRow
            iconName={IconName.Add}
            title={strings('add_asset.custom_token')}
            onPress={() => navigation.navigate(Routes.WALLET.ADD_CUSTOM_TOKEN)}
            testID={ImportTokenViewSelectorsIDs.CUSTOM_TOKEN_BUTTON}
          />
          {hasHiddenTokens ? (
            <ShortcutRow
              iconName={IconName.EyeSlash}
              title={strings('add_asset.hidden_tokens')}
              onPress={() => navigation.navigate(Routes.WALLET.HIDDEN_TOKENS)}
              testID={ImportTokenViewSelectorsIDs.HIDDEN_TOKENS_BUTTON}
            />
          ) : null}
        </Animated.View>
      )}

      <Animated.View
        style={tw.style('flex-1')}
        layout={LinearTransition.duration(200)}
      >
        <SearchTokenAutocomplete
          navigation={navigation}
          selectedChainId={selectedNetwork}
          searchQuery={searchQuery}
          isSearching={isSearchActive}
          onAddCustomToken={() =>
            navigation.navigate(Routes.WALLET.ADD_CUSTOM_TOKEN)
          }
        />
      </Animated.View>
    </Box>
  );
};

export default TokenView;
