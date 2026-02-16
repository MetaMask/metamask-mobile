import React from 'react';
import ListItemMultiSelect from '../../../component-library/components/List/ListItemMultiSelect';
import stylesheet from './MultiAssetListItems.styles';
import { useStyles } from '../../../component-library/hooks';

import { Image, View } from 'react-native';
import Badge, {
  BadgeVariant,
} from '../../../component-library/components/Badges/Badge';
import BadgeWrapper, {
  BadgePosition,
} from '../../../component-library/components/Badges/BadgeWrapper';
import AssetIcon from '../AssetIcon';
import { strings } from '../../../../locales/i18n';
import { ImportTokenViewSelectorsIDs } from '../../Views/AddAsset/ImportAssetView.testIds';
import { NetworkBadgeSource } from '../AssetOverview/Balance/Balance';
import { BridgeToken } from '../Bridge/types';
import { FlashList } from '@shopify/flash-list';
import { Skeleton } from '../../../component-library/components/Skeleton';
import { useAssetFromTheme } from '../../../util/theme';
import emptyStateDefiLight from '../../../images/empty-state-defi-light.png';
import emptyStateDefiDark from '../../../images/empty-state-defi-dark.png';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Text,
  TextVariant,
  TextColor,
} from '@metamask/design-system-react-native';
interface Props {
  /**
   * Array of assets objects returned from the search
   */
  searchResults: BridgeToken[];
  /**
   * Callback triggered when a token is selected
   */
  handleSelectAsset: (asset: BridgeToken) => void;
  /**
   * Object of the currently-selected token
   */
  selectedAsset: BridgeToken[];
  /**
   * Search query that generated "searchResults"
   */
  searchQuery: string;
  /**
   * ChainID of the network
   */
  chainId: string;
  /**
   * Symbol of the network
   */
  ticker?: string;
  /**
   * Name of the network
   */
  networkName?: string;
  /**
   * Set of already added token addresses (lowercase)
   */
  alreadyAddedTokens?: Set<string>;
  /**
   * Whether the search results are loading
   */
  isLoading?: boolean;
}

const TokenSkeleton = () => {
  const { styles } = useStyles(stylesheet, {});

  return (
    <ListItemMultiSelect isDisabled style={styles.base}>
      <View style={styles.Icon}>
        <Skeleton width={40} height={40} style={styles.skeletonIcon} />
      </View>
      <View style={styles.tokens}>
        <Skeleton width={120} height={20} style={styles.skeletonText} />
        <Skeleton width={60} height={16} />
      </View>
    </ListItemMultiSelect>
  );
};

const MultiAssetListItems = ({
  searchResults,
  handleSelectAsset,
  selectedAsset,
  searchQuery,
  networkName,
  alreadyAddedTokens,
  isLoading = false,
}: Props) => {
  const tw = useTailwind();
  const { styles } = useStyles(stylesheet, {});
  const tokensImage = useAssetFromTheme(
    emptyStateDefiLight,
    emptyStateDefiDark,
  );

  // Show skeleton loaders when loading
  if (isLoading) {
    return (
      <FlashList
        data={Array(5).fill(null)}
        renderItem={() => <TokenSkeleton />}
        keyExtractor={(_, index) => `skeleton-${index}`}
      />
    );
  }

  if (searchResults.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Image
          source={tokensImage}
          resizeMode="contain"
          style={tw.style('w-[72px] h-[72px]')}
        />
        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.TextAlternative}
          twClassName="text-center"
        >
          {searchQuery?.length === 0
            ? strings('token.tokens_empty_description')
            : strings('token.no_tokens_found')}
        </Text>
      </View>
    );
  }

  return (
    <FlashList
      data={searchResults}
      renderItem={({ item, index }) => {
        const { symbol, name, address, image } = item || {};
        const isOnSelected = selectedAsset.some(
          (token) => token.address === address,
        );
        const isSelected = selectedAsset && isOnSelected;

        // Check if token is already added
        const isAlreadyAdded = alreadyAddedTokens?.has(address.toLowerCase());
        const isDisabled = isAlreadyAdded;

        return (
          <ListItemMultiSelect
            isSelected={isSelected || isAlreadyAdded}
            isDisabled={isDisabled}
            style={styles.base}
            key={`search-result-${index}`}
            onPress={() => !isDisabled && handleSelectAsset(item)}
            testID={ImportTokenViewSelectorsIDs.SEARCH_TOKEN_RESULT}
          >
            <View style={styles.Icon}>
              <BadgeWrapper
                badgePosition={BadgePosition.BottomRight}
                badgeElement={
                  <Badge
                    variant={BadgeVariant.Network}
                    imageSource={NetworkBadgeSource(
                      item?.chainId as `0x${string}`,
                    )}
                    name={networkName}
                  />
                }
              >
                {image && (
                  <AssetIcon
                    address={address}
                    logo={image}
                    customStyle={styles.assetIcon}
                  />
                )}
              </BadgeWrapper>
            </View>
            <View style={styles.tokens}>
              <Text variant={TextVariant.BodyLg}>{name}</Text>
              <Text variant={TextVariant.BodyMd}>{symbol}</Text>
            </View>
          </ListItemMultiSelect>
        );
      }}
      keyExtractor={(_, index) => `token-search-row-${index}`}
    />
  );
};

export default MultiAssetListItems;
