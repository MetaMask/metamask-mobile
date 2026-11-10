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
import { Hex } from '@metamask/utils';
import { SupportedCaipChainId } from '@metamask/multichain-network-controller';
import { formatChainIdToCaip } from '@metamask/bridge-controller';
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

/**
 * Import tokens: search, network filter, a Hidden tokens shortcut (only when
 * there are hidden tokens) and the importable token list.
 */
interface TokenViewProps {
  /** `null` means all networks. */
  selectedNetwork: SupportedCaipChainId | Hex | null;
  openNetworkSelector: () => void;
}

const TokenView = ({
  selectedNetwork,
  openNetworkSelector,
}: TokenViewProps) => {
  const tw = useTailwind();
  const navigation = useNavigation<AppNavigationProp>();

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchActive, setIsSearchActive] = useState(false);
  const selectedChainId = selectedNetwork
    ? formatChainIdToCaip(selectedNetwork)
    : null;
  const selectedNetworkName = useNetworkName(
    selectedChainId ? [selectedChainId] : null,
  );
  const hasHiddenTokens = useHiddenAssetIds().length > 0;

  const placeholder = strings('token.search_tokens_placeholder');
  const handleCancel = useCallback(() => {
    setSearchQuery('');
    setIsSearchActive(false);
  }, []);

  return (
    <Box twClassName="flex-1">
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        gap={2}
        twClassName="px-4 pt-2"
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

      <Box flexDirection={BoxFlexDirection.Row} twClassName="px-4 py-3">
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
          onPress={openNetworkSelector}
        />
      </Box>

      {!isSearchActive && hasHiddenTokens ? (
        <Animated.View
          key="shortcuts"
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(150)}
        >
          <ListItem
            isInteractive
            variant={ContentVariant.OneLine}
            title={strings('add_asset.hidden_tokens')}
            startAccessory={
              <Icon name={IconName.EyeSlash} size={IconSize.Md} />
            }
            endAccessory={
              <Icon
                name={IconName.ArrowRight}
                size={IconSize.Sm}
                color={IconColor.IconAlternative}
              />
            }
            accessoryGap={3}
            onPress={() => navigation.navigate(Routes.WALLET.HIDDEN_TOKENS)}
            accessibilityRole="button"
            testID={ImportTokenViewSelectorsIDs.HIDDEN_TOKENS_BUTTON}
          />
        </Animated.View>
      ) : null}

      <Animated.View
        style={tw.style('flex-1')}
        layout={LinearTransition.duration(200)}
      >
        <SearchTokenAutocomplete
          navigation={navigation}
          selectedChainId={selectedChainId}
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
