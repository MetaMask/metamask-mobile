import React, { useState } from 'react';
import { StyleProp, TextStyle, View } from 'react-native';
import TouchableOpacity from '../../../../../Base/TouchableOpacity';

import ButtonIcon from '../../../../../../component-library/components/Buttons/ButtonIcon';
import Text from '../../../../../../component-library/components/Texts/Text';
import { ButtonIconSizes } from '../../../../../../component-library/components/Buttons/ButtonIcon/ButtonIcon.types';
import {
  IconColor,
  IconName,
} from '../../../../../../component-library/components/Icons/Icon';
import { TextProps } from '../../../../../../component-library/components/Texts/Text/Text.types';
import { useStyles } from '../../../../../../component-library/hooks';
import BottomModal from '../bottom-modal';
import styleSheet from './text-with-tooltip.styles';
interface TextWithTooltipProps {
  ellipsizeMode?: TextProps['ellipsizeMode'];
  label: string;
  text: string;
  textStyle?: StyleProp<TextStyle>;
  textVariant?: TextProps['variant'];
  tooltip: string;
  tooltipTestId?: string;
}

const TextWithTooltip = ({
  ellipsizeMode,
  label,
  text,
  textStyle = {} as StyleProp<TextStyle>,
  textVariant,
  tooltip,
  tooltipTestId,
}: TextWithTooltipProps) => {
  const [isTooltipVisible, setTooltipVisible] = useState(false);
  const { styles } = useStyles(styleSheet, {});

  return (
    <View>
      <TouchableOpacity onPress={() => setTooltipVisible(true)}>
        <Text
          ellipsizeMode={ellipsizeMode}
          style={textStyle}
          variant={textVariant}
        >
          {text}
        </Text>
      </TouchableOpacity>
      {isTooltipVisible && (
        <BottomModal onClose={() => setTooltipVisible(false)}>
          <View style={styles.container}>
            <View style={styles.tooltipHeader}>
              <ButtonIcon
                style={styles.backIcon}
                iconColor={IconColor.Default}
                size={ButtonIconSizes.Sm}
                onPress={() => setTooltipVisible(false)}
                iconName={IconName.ArrowLeft}
                testID={tooltipTestId ?? 'tooltipTestId'}
              />
              <Text style={styles.text}>{label}</Text>
            </View>
            <View style={styles.tooltipContext}>
              <Text style={styles.text}>{tooltip}</Text>
            </View>
          </View>
        </BottomModal>
      )}
    </View>
  );
};

export default TextWithTooltip;
