/* eslint-disable react/prop-types */
import React from 'react';
import { TouchableOpacity, StyleSheet, Platform } from 'react-native';
import Text, {
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import SkeletonText from '../Ramp/components/SkeletonText';
import { TokenI } from '../Tokens/types';
import generateTestId from '../../../../wdio/utils/generateTestId';
import { getAssetTestId } from '../../../../wdio/screen-objects/testIDs/Screens/WalletView.testIds';
import {
  TOKEN_BALANCE_LOADING,
  TOKEN_RATE_UNDEFINED,
} from '../Tokens/constants';
interface AssetElementProps {
  children?: React.ReactNode;
  asset: TokenI;
  onPress?: (asset: TokenI) => void;
  onLongPress?: ((asset: TokenI) => void) | null;
  balance?: string;
}

const createStyles = () =>
  StyleSheet.create({
    itemWrapper: {
      flex: 1,
      flexDirection: 'row',
      paddingHorizontal: 15,
      paddingVertical: 10,
      alignItems: 'flex-start',
    },
    arrow: {
      flex: 1,
      alignSelf: 'flex-end',
    },
    arrowIcon: {
      marginTop: 16,
    },
    skeleton: {
      width: 50,
    },
  });

/**
 * Customizable view to render assets in lists
 */
const AssetElement: React.FC<AssetElementProps> = ({
  children,
  balance,
  asset,
  onPress,
  onLongPress,
}) => {
  const styles = createStyles();

  const handleOnPress = () => {
    onPress?.(asset);
  };

  const handleOnLongPress = () => {
    onLongPress?.(asset);
  };

  return (
    <TouchableOpacity
      onPress={handleOnPress}
      onLongPress={handleOnLongPress}
      style={styles.itemWrapper}
      {...generateTestId(Platform, getAssetTestId(asset.symbol))}
    >
      {children}

      {balance && (
        <Text
          variant={
            asset?.balanceError || asset.balanceFiat === TOKEN_RATE_UNDEFINED
              ? TextVariant.BodySM
              : TextVariant.BodyLGMedium
          }
        >
          {balance === TOKEN_BALANCE_LOADING ? (
            <SkeletonText thin style={styles.skeleton} />
          ) : (
            balance
          )}
        </Text>
      )}
    </TouchableOpacity>
  );
};
export default AssetElement;
