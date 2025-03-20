/* eslint-disable react/prop-types */
import React from 'react';
import { TouchableOpacity, StyleSheet, Platform, View } from 'react-native';
import { TextVariant } from '../../../component-library/components/Texts/Text';
import SkeletonText from '../Ramp/components/SkeletonText';
import { TokenI } from '../Tokens/types';
import generateTestId from '../../../../wdio/utils/generateTestId';
import { getAssetTestId } from '../../../../wdio/screen-objects/testIDs/Screens/WalletView.testIds';
import {
  TOKEN_BALANCE_LOADING,
  TOKEN_BALANCE_LOADING_UPPERCASE,
  TOKEN_RATE_UNDEFINED,
} from '../Tokens/constants';
import { Colors } from '../../../util/theme/models';
import { fontStyles } from '../../../styles/common';
import { useTheme } from '../../../util/theme';
import SensitiveText, {
  SensitiveTextLength,
} from '../../../component-library/components/Texts/SensitiveText';
import { FIAT_BALANCE_TEST_ID, MAIN_BALANCE_TEST_ID } from './index.constants';

interface AssetElementProps {
  children?: React.ReactNode;
  asset: TokenI;
  onPress?: (asset: TokenI) => void;
  onLongPress?: ((asset: TokenI) => void) | null;
  balance?: string;
  mainBalance?: string | null;
  privacyMode?: boolean;
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
  privacyMode = false,
}) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const handleOnPress = () => {
    onPress?.(asset);
  };

  const handleOnLongPress = () => {
    onLongPress?.(asset);
  };

  // TODO: Use the SensitiveText component when it's available
  // when privacyMode is true, we should hide the balance and the fiat
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
          <SensitiveText
            variant={
              asset?.hasBalanceError ||
              asset.balanceFiat === TOKEN_RATE_UNDEFINED
                ? TextVariant.BodySM
                : TextVariant.BodyLGMedium
            }
            isHidden={privacyMode}
            length={SensitiveTextLength.Medium}
            testID={FIAT_BALANCE_TEST_ID}
          >
            {balance === TOKEN_BALANCE_LOADING ||
            balance === TOKEN_BALANCE_LOADING_UPPERCASE ? (
              <SkeletonText thin style={styles.skeleton} />
            ) : (
              balance
            )}
          </SensitiveText>
        )}
        {mainBalance ? (
          <SensitiveText
            variant={TextVariant.BodyMD}
            style={styles.balanceFiat}
            isHidden={privacyMode}
            length={SensitiveTextLength.Short}
            testID={MAIN_BALANCE_TEST_ID}
          >
            {mainBalance === TOKEN_BALANCE_LOADING ||
            mainBalance === TOKEN_BALANCE_LOADING_UPPERCASE ? (
              <SkeletonText thin style={styles.skeleton} />
            ) : (
              mainBalance
            )}
          </SensitiveText>
        ) : null}
      </View>
    </TouchableOpacity>
  );
};
export default AssetElement;
