import React from 'react';
import { View } from 'react-native';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import { useTheme } from '../../../../../util/theme';
import { createStyles } from './PerpsMarginSlider.styles';

interface PerpsMarginSliderProps {
  marginPercent: number;
}

const PerpsMarginSlider: React.FC<PerpsMarginSliderProps> = ({
  marginPercent,
}) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  // Calculate position of the slider handle based on percentage
  const sliderPosition = Math.min(Math.max(marginPercent, 0), 100);
  const handlePositionLeft = (sliderPosition / 100) * 140; // 140 is track width minus handle width

  return (
    <View style={styles.container}>
      <View style={styles.sliderContainer}>
        <View style={styles.sliderTrack} />
        <View style={[styles.sliderHandle, { left: handlePositionLeft }]}>
          <Text variant={TextVariant.BodySM} color={TextColor.Inverse}>
            {marginPercent}%
          </Text>
        </View>
      </View>
    </View>
  );
};

export default PerpsMarginSlider;
