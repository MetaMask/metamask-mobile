import React from 'react';
import ListItemMultiSelect from '../../../component-library/components/List/ListItemMultiSelect';
import stylesheet from './MultiAssetListItems.styles';
import { useStyles } from '../../../component-library/hooks';
import Text, {
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import { View, ScrollViewProps } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import Badge, {
  BadgeVariant,
} from '../../../component-library/components/Badges/Badge';
import BadgeWrapper, {
  BadgePosition,
} from '../../../component-library/components/Badges/BadgeWrapper';
import AssetIcon from '../AssetIcon';
import { strings } from '../../../../locales/i18n';
import { ImportTokenViewSelectorsIDs } from '../../Views/AddAsset/ImportTokenView.testIds';
import { NetworkBadgeSource } from '../AssetOverview/Balance/Balance';
import { BridgeToken } from '../Bridge/types';
import { FlashList } from '@shopify/flash-list';

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
}

const MultiAssetListItems = ({
  searchResults,
  handleSelectAsset,
  selectedAsset,
  searchQuery,
  networkName,
  alreadyAddedTokens,
}: Props) => {
  const { styles } = useStyles(stylesheet, {});

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
              <Text variant={TextVariant.BodyLGMedium}>{name}</Text>
              <Text variant={TextVariant.BodyMD}>{symbol}</Text>
            </View>
          </ListItemMultiSelect>
        );
      }}
      keyExtractor={(_, index) => `token-search-row-${index}`}
      decelerationRate="fast"
      ListEmptyComponent={
        searchQuery?.length > 0 ? (
          <Text style={styles.normalText}>
            {strings('token.no_tokens_found')}
          </Text>
        ) : null
      }
      renderScrollComponent={
        ScrollView as React.ComponentType<ScrollViewProps>
      }
    />
  );
};

export default MultiAssetListItems;
