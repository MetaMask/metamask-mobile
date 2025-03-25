import React from 'react';
import { StyleSheet } from 'react-native';
import {
  ButtonSize,
  ButtonWidthTypes,
} from '../../../../component-library/components/Buttons/Button';
import ButtonBase from '../../../../component-library/components/Buttons/Button/foundation/ButtonBase';
import { IconName } from '../../../../component-library/components/Icons/Icon';
import {
  TextColor,
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import { useTheme } from '../../../../util/theme';
import type { Colors } from '../../../../util/theme/models';

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    currencyToggleButton: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background.default,
      borderColor: colors.border.muted,
      borderWidth: 1,
    },
  });

interface CurrencyToggleProps {
  onPress: () => void;
  value: string;
}

const CurrencyToggle = ({ onPress, value }: CurrencyToggleProps) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);

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
