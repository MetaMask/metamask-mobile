import React, { useCallback, useRef, useState } from 'react';
import { useStyles } from '../../../../../component-library/hooks';
import { createStyles } from './styles';
import { Animated, Easing, TouchableOpacity } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import {
  Box,
  Icon,
  IconColor,
  IconName,
  IconSize,
} from '@metamask/design-system-react-native';
import { useTheme } from '../../../../../util/theme';

const ARROW_ICON_SIZE = IconSize.Lg;
const CUTOUT_WING_WIDTH = 77;
const CUTOUT_WING_HEIGHT = 37;
const CUTOUT_WING_PATH =
  'M70.3701 18.4727L76.9141 36.9453C72.3883 28.1234 66.7174 24.2023 57.5107 22.5781H0V15.2041C50.3731 15.2041 69.4871 20.9645 76.9141 0L70.3701 18.4727Z';

interface Props {
  onPress: () => void;
  disabled: boolean;
}

export const FLipQuoteButton = ({ onPress, disabled }: Props) => {
  const [pressed, setPressed] = useState(false);
  const rotationValue = useRef(new Animated.Value(0)).current;
  const { colors } = useTheme();
  const { styles } = useStyles(createStyles, {
    disabled,
    pressed,
  });

  const triggerOnPressedIn = useCallback(() => {
    setPressed(true);
  }, [setPressed]);

  const triggerOnPressedOut = useCallback(() => {
    setPressed(false);
  }, [setPressed]);

  const triggerOnPress = useCallback(() => {
    rotationValue.setValue(0);
    Animated.sequence([
      Animated.timing(rotationValue, {
        toValue: 1.04,
        duration: 230,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(rotationValue, {
        toValue: 1,
        speed: 18,
        bounciness: 8,
        useNativeDriver: true,
      }),
    ]).start();
    onPress();
  }, [onPress, rotationValue]);

  const rotate = rotationValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Box style={styles.arrowContainer}>
      <Svg
        width={CUTOUT_WING_WIDTH}
        height={CUTOUT_WING_HEIGHT}
        viewBox={`0 0 ${CUTOUT_WING_WIDTH} ${CUTOUT_WING_HEIGHT}`}
        style={[styles.cutoutWing, styles.leftCutoutWing]}
        pointerEvents="none"
      >
        <Path d={CUTOUT_WING_PATH} fill={colors.background.default} />
      </Svg>
      <Svg
        width={CUTOUT_WING_WIDTH}
        height={CUTOUT_WING_HEIGHT}
        viewBox={`0 0 ${CUTOUT_WING_WIDTH} ${CUTOUT_WING_HEIGHT}`}
        style={[styles.cutoutWing, styles.rightCutoutWing]}
        pointerEvents="none"
      >
        <Path d={CUTOUT_WING_PATH} fill={colors.background.default} />
      </Svg>
      <Box style={styles.arrowCircle}>
        <TouchableOpacity
          style={styles.button}
          onPress={!disabled ? triggerOnPress : undefined}
          onPressIn={!disabled ? triggerOnPressedIn : undefined}
          onPressOut={!disabled ? triggerOnPressedOut : undefined}
          disabled={disabled}
          accessible
          activeOpacity={1}
          testID="arrow-button"
        >
          <Animated.View style={{ transform: [{ rotate }] }}>
            <Icon
              name={IconName.Arrow2Down}
              size={ARROW_ICON_SIZE}
              color={IconColor.IconDefault}
            />
          </Animated.View>
        </TouchableOpacity>
      </Box>
    </Box>
  );
};
