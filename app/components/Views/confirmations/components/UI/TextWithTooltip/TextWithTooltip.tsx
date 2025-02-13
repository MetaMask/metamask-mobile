import React, { useState } from 'react';
import { TouchableOpacity, View } from 'react-native';

import ButtonIcon from '../../../../../../component-library/components/Buttons/ButtonIcon';
import Text from '../../../../../../component-library/components/Texts/Text';
import { ButtonIconSizes } from '../../../../../../component-library/components/Buttons/ButtonIcon/ButtonIcon.types';
import {
  IconColor,
  IconName,
} from '../../../../../../component-library/components/Icons/Icon';
import { useStyles } from '../../../../../hooks/useStyles';
import BottomModal from '../BottomModal';
import styleSheet from './TextWithTooltip.styles';
interface TextWithTooltipProps {
  text: string;
  tooltip: string;
  tooltipTestId?: string;
}

const TextWithTooltip = ({
  text,
  tooltip,
  tooltipTestId,
}: TextWithTooltipProps) => {
  const [isTooltipVisible, setTooltipVisible] = useState(false);
  const { styles } = useStyles(styleSheet, {});

  return (
    <View>
      <TouchableOpacity onPress={() => setTooltipVisible(true)}>
        <Text>{text}</Text>
      </TouchableOpacity>
      {isTooltipVisible && (
        <BottomModal onClose={() => setTooltipVisible(false)}>
          <View style={styles.container}>
            <View style={styles.tooltipHeader}>
              <ButtonIcon
                iconColor={IconColor.Default}
                size={ButtonIconSizes.Sm}
                onPress={() => setTooltipVisible(false)}
                iconName={IconName.ArrowLeft}
                testID={tooltipTestId ?? 'tooltipTestId'}
              />
            </View>
            <View style={styles.tooltipContext}>
              <Text style={styles.tooltipText}>{tooltip}</Text>
            </View>
          </View>
        </BottomModal>
      )}
    </View>
  );
};

export default TextWithTooltip;
