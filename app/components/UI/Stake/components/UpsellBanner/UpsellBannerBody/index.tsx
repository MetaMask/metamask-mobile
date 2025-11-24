import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import styleSheet from './UpsellBannerBody.styles';
import { UpsellBannerBodyProps } from '../UpsellBanner.types';
import { useStyles } from '../../../../../hooks/useStyles';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../../component-library/components/Texts/Text';
import Icon, {
  IconName,
  IconColor,
  IconSize,
} from '../../../../../../component-library/components/Icons/Icon';

const UpsellBannerBody = ({
  primaryText,
  secondaryText,
  tertiaryText,
  onTooltipPress,
  endAccessory,
}: UpsellBannerBodyProps) => {
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
        {React.isValidElement(endAccessory) && endAccessory}
      </View>
    </View>
  );
};

export default UpsellBannerBody;
