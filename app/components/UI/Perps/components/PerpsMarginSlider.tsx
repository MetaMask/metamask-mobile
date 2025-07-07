import React from 'react';
import { StyleSheet, View } from 'react-native';
import Text, {
  TextVariant,
  TextColor
} from '../../../../component-library/components/Texts/Text';
import { useTheme } from '../../../../util/theme';
import type { Colors } from '../../../../util/theme/models';

interface PerpsMarginSliderProps {
  marginPercent: number;
}

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    container: {
      alignItems: 'center',
      paddingVertical: 24,
      paddingHorizontal: 24,
    },
    sliderContainer: {
      width: 200,
      height: 8,
      position: 'relative',
      justifyContent: 'center',
    },
    sliderTrack: {
      width: '100%',
      height: 8,
      backgroundColor: colors.background.alternative,
      borderRadius: 4,
    },
    sliderHandle: {
      position: 'absolute',
      width: 60,
      height: 40,
      backgroundColor: colors.primary.default,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      top: -16, // Center vertically on track
    },
  });

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
