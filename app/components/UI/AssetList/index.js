import React, { PureComponent } from 'react';
import { View, StyleSheet } from 'react-native';
import PropTypes from 'prop-types';
import { strings } from '../../../../locales/i18n';
import AssetIcon from '../AssetIcon';
import { fontStyles } from '../../../styles/common';
import Checkbox from '../../../component-library/components/Checkbox';
import BadgeWrapper from '../../../component-library/components/Badges/BadgeWrapper/BadgeWrapper';
import Badge from '../../../component-library/components/Badges/Badge/Badge';
import { BadgeVariant } from '../../../component-library/components/Badges/Badge/Badge.types';
import {
  getTestNetImageByChainId,
  isLineaMainnet,
  isMainNet,
  isTestNet,
} from '../../../util/networks';
import images from 'images/image-icons';
import Text, {
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import { ImportTokenViewSelectorsIDs } from '../../../../e2e/selectors/ImportTokenView.selectors';

const styles = StyleSheet.create({
  rowWrapper: {
    padding: 20,
  },
  item: {
    marginBottom: 5,
    borderWidth: 2,
  },
  assetListElement: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  text: {
    padding: 16,
  },
  normalText: {
    ...fontStyles.normal,
  },
  assetIcon: {
    width: 40,
    height: 40,
  },
  checkBox: {
    display: 'flex',
    padding: 2,
    alignItems: 'flex-start',
    gap: 10,
  },
  assetElement: {
    flex: 1,
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
    // justifyContent: 'space-between',
    gap: 8,
    alignSelf: 'stretch',
  },
  Icon: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 10,
  },
  badgeWrapper: {
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tokens: {
    flex: 1,
    justifyContent: 'center',
    marginLeft: 20,
  },
});

/**
 * PureComponent that provides ability to search assets.
 */
export default class AssetList extends PureComponent {
  static propTypes = {
    /**
     * Array of assets objects returned from the search
     */
    searchResults: PropTypes.array,
    /**
     * Callback triggered when a token is selected
     */
    handleSelectAsset: PropTypes.func,
    /**
     * Object of the currently-selected token
     */
    selectedAsset: PropTypes.array,
    /**
     * Search query that generated "searchResults"
     */
    searchQuery: PropTypes.string,
    /**
     * ChainID of the network
     */
    chainId: PropTypes.string,
    /**
     * Symbol of the network
     */
    ticker: PropTypes.string,
    /**
     * Name of the network
     */
    networkName: PropTypes.string,
  };

  onToggleAsset = (key) => {
    const { searchResults, handleSelectAsset } = this.props;
    handleSelectAsset(searchResults[key]);
  };

  NetworkBadgeSource = () => {
    const { chainId, ticker } = this.props;

    if (isTestNet(chainId)) return getTestNetImageByChainId(chainId);

    if (isMainNet) return images.ETHEREUM;

    if (isLineaMainnet) return images['LINEA-MAINNET'];

    return ticker ? images[ticker] : undefined;
  };

  render = () => {
    const {
      searchResults = [],
      handleSelectAsset,
      selectedAsset,
      networkName,
    } = this.props;

    return (
      <View style={styles.rowWrapper}>
        {searchResults.length > 0 ? (
          <Text style={styles.normalText}>{strings('token.select_token')}</Text>
        ) : null}
        {searchResults.length === 0 && this.props.searchQuery.length ? (
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
            <View style={styles.assetElement} key={i}>
              <View style={styles.checkBox}>
                <Checkbox
                  isChecked={isSelected}
                  accessibilityRole={'checkbox'}
                  accessible
                  // onPress={() => handleSelectAsset(searchResults[i])}
                  testID={ImportTokenViewSelectorsIDs.CONTAINER}
                />
              </View>
              <View style={styles.Icon}>
                <BadgeWrapper
                  badgeElement={
                    <Badge
                      variant={BadgeVariant.Network}
                      imageSource={this.NetworkBadgeSource()}
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
                <Text variant={TextVariant.BodyMD} style={styles.balanceFiat}>
                  {symbol}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    );
  };
}
