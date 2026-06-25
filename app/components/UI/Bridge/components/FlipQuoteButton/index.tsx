import React, { useCallback, useRef, useState } from 'react';
import { useStyles } from '../../../../../component-library/hooks';
import { createStyles } from './styles';
import { Box } from '../../../Box/Box';
import { Animated, Easing, TouchableOpacity } from 'react-native';
import Icon, {
  IconName,
} from '../../../../../component-library/components/Icons/Icon';
import {
  DEFAULT_BUTTONICON_ICONCOLOR,
  ICONSIZE_BY_BUTTONICONSIZE,
} from '../../../../../component-library/components/Buttons/ButtonIcon/ButtonIcon.constants';
import { ButtonIconSizes } from '../../../../../component-library/components/Buttons/ButtonIcon';

interface Props {
  onPress: () => void;
  disabled: boolean;
}

export const FLipQuoteButton = ({ onPress, disabled }: Props) => {
  const [pressed, setPressed] = useState(false);
  const rotationValue = useRef(new Animated.Value(0)).current;
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
    Animated.timing(rotationValue, {
      toValue: 1,
      duration: 300,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
    onPress();
  }, [onPress, rotationValue]);

  const rotate = rotationValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Box style={styles.arrowContainer}>
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
              size={ICONSIZE_BY_BUTTONICONSIZE[ButtonIconSizes.Lg]}
              color={DEFAULT_BUTTONICON_ICONCOLOR}
            />
          </Animated.View>
        </TouchableOpacity>
      </Box>
    </Box>
  );
};
