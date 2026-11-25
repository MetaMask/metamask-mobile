import React, { useState } from 'react';
import { Pressable, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  FontWeight,
  MainActionButton,
  Text,
  TextColor,
  TextVariant,
  type IconName,
  type MainActionButtonProps,
} from '@metamask/design-system-react-native';

import BoxGlass from '../BoxGlass';
import { useLiquidGlass } from '../../hooks/useLiquidGlass';

// Clears the button's own `bg-muted` so only the glass shows.
const transparentStyle = { backgroundColor: 'transparent' };

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type MainActionButtonGlassBase = {
  /** The screen's flag. False, or an OS without glass, renders the plain button. */
  isGlass?: boolean;
  /** Layout for the button or its glass wrapper, e.g. `flex: 1` in a row. */
  containerStyle?: StyleProp<ViewStyle>;
  /**
   * Optional icon element used instead of `iconName`. When set, this wrapper
   * renders a local copy of `MainActionButton`'s layout so custom icons work
   * (the design-system button only accepts `IconName`).
   */
  customIcon?: React.ReactNode;
} & Omit<MainActionButtonProps, 'iconName'>;

export type MainActionButtonGlassProps = MainActionButtonGlassBase &
  (
    | { customIcon: React.ReactNode; iconName?: IconName }
    | { customIcon?: undefined; iconName: IconName }
  );

type CustomIconMainActionButtonProps = Omit<
  MainActionButtonProps,
  'iconName'
> & {
  customIcon: React.ReactNode;
};

/**
 * Faithful local copy of MMDS `MainActionButton`, with a custom icon slot
 * instead of `IconName`. Press behaviour matches `ButtonAnimated`.
 */
const CustomIconMainActionButton = ({
  customIcon,
  label,
  labelProps,
  onPress,
  onPressIn,
  onPressOut,
  style,
  isDisabled = false,
  twClassName = '',
  ...props
}: CustomIconMainActionButtonProps): React.ReactElement => {
  const tw = useTailwind();
  const [isPressed, setIsPressed] = useState(false);
  const animation = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: animation.value }],
  }));

  const onPressInHandler: typeof onPressIn = (event) => {
    setIsPressed(true);
    animation.value = withTiming(0.97, {
      duration: 100,
      easing: Easing.bezier(0.3, 0.8, 0.3, 1),
    });
    onPressIn?.(event);
  };

  const onPressOutHandler: typeof onPressOut = (event) => {
    setIsPressed(false);
    animation.value = withTiming(1, {
      duration: 100,
      easing: Easing.bezier(0.3, 0.8, 0.3, 1),
    });
    onPressOut?.(event);
  };

  const baseStyle = tw.style(
    'items-center justify-center rounded-2xl px-1 py-3 min-w-[68px]',
    isPressed && !isDisabled ? 'bg-muted-pressed' : 'bg-muted',
    isDisabled ? 'opacity-50' : 'opacity-100',
    twClassName,
  );
  const additionalStyle =
    typeof style === 'function' ? style({ pressed: isPressed }) : style;

  return (
    <AnimatedPressable
      disabled={isDisabled}
      accessible
      accessibilityRole="button"
      onPress={!isDisabled ? onPress : undefined}
      onPressIn={!isDisabled ? onPressInHandler : undefined}
      onPressOut={!isDisabled ? onPressOutHandler : undefined}
      style={[
        additionalStyle ? [baseStyle, additionalStyle] : [baseStyle],
        animatedStyle,
      ]}
      {...props}
    >
      <Box twClassName="w-6 h-6 items-center justify-center text-icon-alternative">
        {customIcon}
      </Box>
      <Text
        {...labelProps}
        variant={TextVariant.BodySm}
        fontWeight={FontWeight.Medium}
        color={TextColor.TextDefault}
        twClassName="mt-0.5 w-full text-center shrink"
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {label}
      </Text>
    </AnimatedPressable>
  );
};

/**
 * The design-system `MainActionButton` on a brand refresh glass surface, kept
 * out of the package until the design system takes it.
 *
 * `ButtonAnimated` is not exported from MMDS, so the custom-icon path
 * replicates its press scale (0.97, 100ms, bezier 0.3, 0.8, 0.3, 1) and the
 * `MainActionButton` layout so the tile stays pixel-identical to the others.
 */
const MainActionButtonGlass = ({
  isGlass = true,
  containerStyle,
  style,
  customIcon,
  iconName,
  ...props
}: MainActionButtonGlassProps): React.ReactElement => {
  const { isGlassEnabled } = useLiquidGlass();
  const useGlass = isGlass && isGlassEnabled;
  const resolvedStyle = useGlass ? transparentStyle : (style ?? containerStyle);

  const button = customIcon ? (
    <CustomIconMainActionButton
      {...props}
      customIcon={customIcon}
      style={resolvedStyle}
    />
  ) : (
    <MainActionButton
      {...props}
      iconName={iconName as IconName}
      style={resolvedStyle}
    />
  );

  if (!useGlass) {
    return button;
  }

  return (
    <BoxGlass
      radiusClassName="rounded-2xl"
      isInteractive={!props.isDisabled}
      hasSheen
      containerStyle={containerStyle}
    >
      {button}
    </BoxGlass>
  );
};

export default MainActionButtonGlass;
