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
import { playSelection } from '../../../../../util/haptics';
import { useTheme } from '../../../../../util/theme';
import {
  FLIP_BUTTON_CUTOUT_HEIGHT,
  FLIP_BUTTON_CUTOUT_WIDTH,
  getFlipButtonFilletPaths,
} from './getFlipButtonFilletPaths';

const ARROW_ICON_SIZE = IconSize.Lg;
const CUTOUT_PATHS = getFlipButtonFilletPaths();

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
    playSelection().catch(() => undefined);
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
        width={FLIP_BUTTON_CUTOUT_WIDTH}
        height={FLIP_BUTTON_CUTOUT_HEIGHT}
        viewBox={`0 0 ${FLIP_BUTTON_CUTOUT_WIDTH} ${FLIP_BUTTON_CUTOUT_HEIGHT}`}
        style={styles.cutoutOverlay}
        pointerEvents="none"
      >
        {CUTOUT_PATHS.map((d) => (
          <Path key={d} d={d} fill={colors.background.default} />
        ))}
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
