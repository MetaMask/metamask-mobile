/* eslint-disable react/prop-types */
import React from 'react';
import { TouchableOpacity, StyleSheet, Platform, View } from 'react-native';
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
import { Colors } from '../../../util/theme/models';
import { fontStyles } from '../../../styles/common';
import { useTheme } from '../../../util/theme';

interface AssetElementProps {
  children?: React.ReactNode;
  asset: TokenI;
  onPress?: (asset: TokenI) => void;
  onLongPress?: ((asset: TokenI) => void) | null;
  balance?: string;
  mainBalance?: string | null;
}

const createStyles = (colors: Colors) =>
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
      alignItems: 'flex-end',
    },
    arrowIcon: {
      marginTop: 16,
    },
    skeleton: {
      width: 50,
    },
    balanceFiat: {
      color: colors.text.alternative,
      paddingHorizontal: 0,
      ...fontStyles.normal,
      textTransform: 'uppercase',
    },
  });

/**
 * Customizable view to render assets in lists
 */
const AssetElement: React.FC<AssetElementProps> = ({
  children,
  balance,
  asset,
  mainBalance = null,
  onPress,
  onLongPress,
}) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);

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

      <View style={styles.arrow}>
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
        {mainBalance ? (
          <Text variant={TextVariant.BodyMD} style={styles.balanceFiat}>
            {mainBalance === TOKEN_BALANCE_LOADING ? (
              <SkeletonText thin style={styles.skeleton} />
            ) : (
              mainBalance
            )}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
};
export default AssetElement;
