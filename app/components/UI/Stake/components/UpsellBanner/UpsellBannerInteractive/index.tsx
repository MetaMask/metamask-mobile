import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import styleSheet from './UpsellBannerInteractive.styles';
import { UpsellBannerInteractiveProps } from '../UpsellBanner.types';
import { useStyles } from '../../../../../hooks/useStyles';
import Button, {
  ButtonVariants,
} from '../../../../../../component-library/components/Buttons/Button';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../../component-library/components/Texts/Text';
import Icon, {
  IconName,
  IconColor,
  IconSize,
} from '../../../../../../component-library/components/Icons/Icon';

const UpsellBannerInteractive = ({
  primaryText,
  secondaryText,
  tertiaryText,
  buttonLabel,
  onButtonPress,
  onTooltipPress,
}: UpsellBannerInteractiveProps) => {
  const { styles } = useStyles(styleSheet, {});

  return (
    <View style={styles.container}>
      <View style={styles.left}>
        <Text variant={TextVariant.HeadingMD}>{primaryText}</Text>
        <Text variant={TextVariant.DisplayMD} color={TextColor.Success}>
          {secondaryText}
        </Text>
        <View style={styles.tooltipContainer}>
          <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
            {tertiaryText}
          </Text>
          <TouchableOpacity onPress={onTooltipPress}>
            <Icon
              name={IconName.Info}
              size={IconSize.Sm}
              color={IconColor.Alternative}
            />
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.right}>
        <Button
          variant={ButtonVariants.Secondary}
          label={buttonLabel}
          onPress={onButtonPress}
        />
      </View>
    </View>
  );
};

export default UpsellBannerInteractive;
