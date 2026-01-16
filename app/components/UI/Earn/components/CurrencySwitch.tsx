import React from 'react';
import { StyleSheet, View } from 'react-native';
import TouchableOpacity from '../../../Base/TouchableOpacity';
import Icon, {
  IconName,
  IconSize,
} from '../../../../component-library/components/Icons/Icon';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import { useTheme } from '../../../../util/theme';
import type { Colors } from '../../../../util/theme/models';
import ButtonBase from '../../../../component-library/components/Buttons/Button/foundation/ButtonBase';
import {
  ButtonSize,
  ButtonWidthTypes,
} from '../../../../component-library/components/Buttons/Button';
import { useSelector } from 'react-redux';
import { selectStablecoinLendingEnabledFlag } from '../selectors/featureFlags';

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    currencyToggleButton: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background.default,
      borderColor: colors.border.muted,
      borderWidth: 1,
      borderRadius: 16,
    },
    currencyToggleText: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    currencyToggleButtonContainer: {
      backgroundColor: colors.background.default,
    },
    currencyToggleIcon: {
      marginLeft: 4,
      alignItems: 'center',
    },
  });

interface CurrencyToggleProps {
  onPress: () => void;
  value: string;
}

const CurrencyToggle = ({ onPress, value }: CurrencyToggleProps) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const isStablecoinLendingEnabled = useSelector(
    selectStablecoinLendingEnabledFlag,
  );

  if (isStablecoinLendingEnabled) {
    return (
      <View
        testID="currency-toggle"
        style={styles.currencyToggleButtonContainer}
      >
        <TouchableOpacity
          activeOpacity={0.5}
          onPress={onPress}
          style={styles.currencyToggleText}
        >
          <View style={styles.currencyToggleText}>
            <Text color={TextColor.Default} variant={TextVariant.BodyMDMedium}>
              {value}
            </Text>
          </View>
          <View style={styles.currencyToggleIcon}>
            <Icon
              name={IconName.SwapVertical}
              size={IconSize.Sm}
              color={colors.text.default}
            />
          </View>
        </TouchableOpacity>
      </View>
    );
  }
  return (
    <ButtonBase
      testID="currency-toggle"
      onPress={onPress}
      size={ButtonSize.Sm}
      width={ButtonWidthTypes.Auto}
      label={`${value}`}
      labelColor={TextColor.Default}
      labelTextVariant={TextVariant.BodyMDMedium}
      endIconName={IconName.SwapVertical}
      style={styles.currencyToggleButton}
    />
  );
};

export default CurrencyToggle;
