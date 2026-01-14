import React, { useCallback } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import StyledButton from '../../StyledButton';
import AssetIcon from '../../AssetIcon';
import { fontStyles } from '../../../../styles/common';
import Identicon from '../../Identicon';
import NetworkMainAssetLogo from '../../NetworkMainAssetLogo';
import { useSelector } from 'react-redux';
import { useTheme } from '../../../../util/theme';
import { selectTokenList } from '../../../../selectors/tokenListController';
import { ImportTokenViewSelectorsIDs } from '../../../Views/AddAsset/ImportTokenView.testIds';
import { toChecksumAddress } from '../../../../util/address';

// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createStyles = (colors: any) =>
  StyleSheet.create({
    item: {
      borderWidth: 1,
      borderColor: colors.border.default,
      padding: 8,
      marginBottom: 8,
      borderRadius: 8,
    },
    assetListElement: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    text: {
      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...(fontStyles.normal as any),
      color: colors.text.default,
    },
    textSymbol: {
      ...fontStyles.normal,
      paddingBottom: 4,
      fontSize: 16,
      color: colors.text.default,
      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any,
    assetInfo: {
      flex: 1,
      flexDirection: 'column',
      alignSelf: 'center',
      padding: 4,
    },
    assetIcon: {
      flexDirection: 'column',
      alignSelf: 'center',
      marginRight: 12,
    },
    ethLogo: {
      width: 50,
      height: 50,
    },
    listContainer: {
      flex: 1,
    },
  });

interface Props {
  /**
   * Array of assets objects returned from the search
   */
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  searchResults: any;
  /**
   * Callback triggered when a token is selected
   */
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handleSelectAsset: any;
  /**
   * Message string to display when searchResults is empty
   */
  emptyMessage: string;
}

const AssetList = ({
  searchResults,
  handleSelectAsset,
  emptyMessage,
}: Props) => {
  const tokenList = useSelector(selectTokenList);
  const { colors } = useTheme();
  const styles = createStyles(colors);

  /**
   * Render logo according to asset. Could be ETH, Identicon or contractMap logo
   *
   * @param {object} asset - Asset to generate the logo to render
   */
  const renderLogo = useCallback(
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (asset: any) => {
      const { address, isETH } = asset;
      if (isETH) {
        return <NetworkMainAssetLogo big style={styles.ethLogo} />;
      }
      const token =
        tokenList?.[toChecksumAddress(address)] ||
        tokenList?.[address.toLowerCase()];
      const iconUrl = token?.iconUrl;
      if (!iconUrl) {
        return <Identicon address={address} />;
      }
      return <AssetIcon logo={iconUrl} />;
    },
    [tokenList, styles],
  );

  if (searchResults.length === 0) {
    return <Text style={styles.text}>{emptyMessage}</Text>;
  }

  return (
    <View
      testID={ImportTokenViewSelectorsIDs.ASSET_SEARCH_CONTAINER}
      style={styles.listContainer}
    >
      {/* Use simple rendering like token import for better performance */}
      {searchResults
        .slice(0, 6)
        .map(
          (
            item: { symbol?: string; name?: string; address?: string },
            index: number,
          ) => {
            const { symbol, name } = item || {};
            return (
              <StyledButton
                key={index}
                type={'normal'}
                containerStyle={styles.item}
                onPress={() => handleSelectAsset(item)}
              >
                <View style={styles.assetListElement}>
                  <View style={styles.assetIcon}>{renderLogo(item)}</View>
                  <View style={styles.assetInfo}>
                    <Text style={styles.textSymbol}>{symbol}</Text>
                    {!!name && <Text style={styles.text}>{name}</Text>}
                  </View>
                </View>
              </StyledButton>
            );
          },
        )}
    </View>
  );
};

export default AssetList;
