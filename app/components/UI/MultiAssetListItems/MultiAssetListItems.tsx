import React, { useMemo } from 'react';
import ListItemMultiSelect from '../../../component-library/components/List/ListItemMultiSelect';
import stylesheet from './MultiAssetListItems.styles';
import { useStyles } from '../../../component-library/hooks';
import Text, {
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import { View } from 'react-native';
import Badge, {
  BadgeVariant,
} from '../../../component-library/components/Badges/Badge';
import BadgeWrapper from '../../../component-library/components/Badges/BadgeWrapper';
import AssetIcon from '../AssetIcon';
import { getNetworkImageSource } from '../../../util/networks';
import { useSelector } from 'react-redux';
import { ProviderConfig } from '@metamask/network-controller';
import { selectProviderConfig } from '../../../selectors/networkController';
import { strings } from '../../../../locales/i18n';
import { ImportTokenViewSelectorsIDs } from '../../../../e2e/selectors/ImportTokenView.selectors';

interface Props {
  /**
   * Array of assets objects returned from the search
   */
  searchResults: any[];
  /**
   * Callback triggered when a token is selected
   */
  handleSelectAsset: (asset: any) => void;
  /**
   * Object of the currently-selected token
   */
  selectedAsset: any[];
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
}

const MultiAssetListItems = ({
  searchResults,
  handleSelectAsset,
  selectedAsset,
  searchQuery,
  chainId,
  networkName,
}: Props) => {
  const { styles } = useStyles(stylesheet, {});
  const providerConfig: ProviderConfig = useSelector(selectProviderConfig);

  const networkImageSource = useMemo(() => {
    const { type } = providerConfig;
    return getNetworkImageSource({ networkType: type, chainId });
  }, [providerConfig, chainId]);

  return (
    <View style={styles.rowWrapper}>
      {searchResults.length === 0 && searchQuery?.length ? (
        <Text style={styles.normalText}>
          {strings('token.no_tokens_found')}
        </Text>
      ) : null}
      {searchResults.slice(0, 6).map((_, i) => {
        const { symbol, name, address, iconUrl } = searchResults[i] || {};
        const isOnSelected = selectedAsset.some(
          (token) => token.address === address,
        );
        const isSelected = selectedAsset && isOnSelected;

        return (
          <ListItemMultiSelect
            isSelected={isSelected}
            style={styles.base}
            key={i}
            onPress={() => handleSelectAsset(searchResults[i])}
            testID={ImportTokenViewSelectorsIDs.CONTAINER}
          >
            <View style={styles.Icon}>
              <BadgeWrapper
                badgeElement={
                  <Badge
                    variant={BadgeVariant.Network}
                    imageSource={networkImageSource}
                    name={networkName}
                  />
                }
              >
                <AssetIcon
                  address={address}
                  logo={iconUrl}
                  customStyle={styles.assetIcon}
                />
              </BadgeWrapper>
            </View>
            <View style={styles.tokens}>
              <Text variant={TextVariant.BodyLGMedium}>{name}</Text>
              <Text variant={TextVariant.BodyMD}>{symbol}</Text>
            </View>
          </ListItemMultiSelect>
        );
      })}
    </View>
  );
};

export default MultiAssetListItems;
