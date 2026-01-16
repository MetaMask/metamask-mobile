/* eslint-disable react/prop-types */
import React from 'react';
import { StyleSheet, Platform, View } from 'react-native';
import TouchableOpacity from '../../Base/TouchableOpacity';
import {
  TextVariant,
  TextColor,
} from '../../../component-library/components/Texts/Text';
import SkeletonText from '../Ramp/Aggregator/components/SkeletonText';
import { TokenI } from '../Tokens/types';
import generateTestId from '../../../../wdio/utils/generateTestId';
import { getAssetTestId } from '../../../../wdio/screen-objects/testIDs/Screens/WalletView.testIds';
import SensitiveText, {
  SensitiveTextLength,
} from '../../../component-library/components/Texts/SensitiveText';

import { useTheme } from '../../../util/theme';
import { Colors } from '../../../util/theme/models';
import {
  TOKEN_BALANCE_LOADING,
  TOKEN_BALANCE_LOADING_UPPERCASE,
  TOKEN_RATE_UNDEFINED,
} from '../Tokens/constants';
import {
  BALANCE_TEST_ID,
  SECONDARY_BALANCE_BUTTON_TEST_ID,
  SECONDARY_BALANCE_TEST_ID,
} from './index.constants';

interface AssetElementProps {
  children?: React.ReactNode;
  asset: TokenI;
  onPress?: (asset: TokenI) => void;
  onLongPress?: ((asset: TokenI) => void) | null;
  balance?: string;
  balanceVariant?: TextVariant;
  secondaryBalance?: string;
  secondaryBalanceVariant?: TextVariant;
  secondaryBalanceColor?: TextColor;
  privacyMode?: boolean;
  hideSecondaryBalanceInPrivacyMode?: boolean;
  disabled?: boolean;
  onSecondaryBalancePress?: (asset: TokenI) => void;
}

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    itemWrapper: {
      flexDirection: 'row',
      height: 64,
      alignItems: 'center',
    },
    arrow: {
      flexShrink: 0,
      alignItems: 'flex-end',
    },
    skeleton: {
      width: 50,
    },
    secondaryBalance: {
      color: colors.text.alternative,
      paddingHorizontal: 0,
    },
    secondaryBalanceCustomColor: {
      paddingHorizontal: 0,
    },
  });

/**
 * Customizable view to render assets in lists
 */
const AssetElement: React.FC<AssetElementProps> = ({
  children,
  balance,
  secondaryBalance,
  secondaryBalanceColor,
  asset,
  onPress,
  onLongPress,
  privacyMode = false,
  hideSecondaryBalanceInPrivacyMode = true,
  disabled = false,
  onSecondaryBalancePress,
}) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const handleOnPress = () => {
    onPress?.(asset);
  };

  const handleOnLongPress = () => {
    onLongPress?.(asset);
  };

  const isSecondaryDisabled = disabled || !onSecondaryBalancePress;

  const handleOnSecondaryBalancePress = () => {
    if (isSecondaryDisabled) return;
    onSecondaryBalancePress?.(asset);
  };

  // TODO: Use the SensitiveText component when it's available
  // when privacyMode is true, we should hide the balance and the fiat
  return (
    <TouchableOpacity
      disabled={disabled}
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
                : TextVariant.BodyMDMedium
            }
            isHidden={privacyMode}
            length={SensitiveTextLength.Medium}
            testID={BALANCE_TEST_ID}
          >
            {balance === TOKEN_BALANCE_LOADING ||
            balance === TOKEN_BALANCE_LOADING_UPPERCASE ? (
              <SkeletonText thin style={styles.skeleton} />
            ) : (
              balance
            )}
          </SensitiveText>
        )}
        {secondaryBalance ? (
          <TouchableOpacity
            onPress={handleOnSecondaryBalancePress}
            disabled={isSecondaryDisabled}
            testID={SECONDARY_BALANCE_BUTTON_TEST_ID}
          >
            <SensitiveText
              variant={TextVariant.BodySMMedium}
              style={
                secondaryBalanceColor
                  ? styles.secondaryBalanceCustomColor
                  : styles.secondaryBalance
              }
              color={secondaryBalanceColor}
              isHidden={privacyMode && hideSecondaryBalanceInPrivacyMode}
              length={SensitiveTextLength.Short}
              testID={SECONDARY_BALANCE_TEST_ID}
              // Remove onPress from here since it's on Pressable now
            >
              {secondaryBalance === TOKEN_BALANCE_LOADING ||
              secondaryBalance === TOKEN_BALANCE_LOADING_UPPERCASE ? (
                <SkeletonText thin style={styles.skeleton} />
              ) : (
                secondaryBalance
              )}
            </SensitiveText>
          </TouchableOpacity>
        ) : null}
      </View>
    </TouchableOpacity>
  );
};
export default AssetElement;
