import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  View,
  Animated,
  PanResponder,
  StyleSheet,
  Text,
  Image,
  LayoutChangeEvent,
  GestureResponderEvent,
  PanResponderGestureState,
} from 'react-native';
import { fontStyles } from '../../../styles/common';
import { useTheme } from '../../../util/theme';
import Svg, { Path } from 'react-native-svg';

import SlippageSliderBgImg from '../../../images/slippage-slider-bg.png';

const DIAMETER = 30;
const TRACK_PADDING = 2;
const TICK_DIAMETER = 5;
const TOOLTIP_HEIGHT = 36;
const TOOLTIP_WIDTH = 40;
const COMPONENT_HEIGHT = DIAMETER + TOOLTIP_HEIGHT + 10;

interface StylesColors {
  background: {
    default: string;
  };
  primary: {
    muted: string;
    default: string;
  };
  overlay: {
    inverse: string;
    alternative: string;
  };
  error: {
    default: string;
  };
}

interface StylesShadows {
  size: {
    md: {
      shadowColor?: string;
      shadowOffset?: {
        width: number;
        height: number;
      };
      shadowOpacity?: number;
      shadowRadius?: number;
      elevation?: number;
    };
  };
}

const createStyles = (colors: StylesColors, shadows: StylesShadows) =>
  StyleSheet.create({
    root: {
      position: 'relative',
      justifyContent: 'center',
      height: COMPONENT_HEIGHT,
    },
    rootDisabled: {
      opacity: 0.5,
    },
    slider: {
      position: 'absolute',
      width: DIAMETER,
      height: DIAMETER,
      borderRadius: DIAMETER,
      borderWidth: 1,
      borderColor: colors.background.default,
      bottom: 0,
      ...shadows.size.md,
    },
    trackBackContainer: {
      position: 'absolute',
      paddingHorizontal: DIAMETER / 2 - 2 * TRACK_PADDING,
      bottom: DIAMETER / 2 - (TICK_DIAMETER + 2 * TRACK_PADDING) / 2,
    },
    trackBack: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      height: TICK_DIAMETER + 2 * TRACK_PADDING,
      backgroundColor: colors.primary.muted,
      borderRadius: TICK_DIAMETER + 2 * TRACK_PADDING,
      borderWidth: TRACK_PADDING,
      borderColor: colors.primary.muted,
    },
    tick: {
      height: TICK_DIAMETER,
      width: TICK_DIAMETER,
      borderRadius: TICK_DIAMETER,
      backgroundColor: colors.primary.default,
      opacity: 0.5,
    },
    trackFront: {
      position: 'absolute',
      overflow: 'hidden',
      bottom: DIAMETER / 2 - (TICK_DIAMETER + 2 * TRACK_PADDING) / 2,
      left: DIAMETER / 2 - 2 * TRACK_PADDING,
      height: TICK_DIAMETER + 2 * TRACK_PADDING,
      borderRadius: TICK_DIAMETER + 2 * TRACK_PADDING,
    },
    tooltipContainer: {
      position: 'absolute',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: TOOLTIP_HEIGHT,
      minWidth: TOOLTIP_WIDTH,
      top: 4,
    },
    tooltipText: {
      ...StyleSheet.absoluteFillObject,
      textAlign: 'center',
      ...fontStyles.normal,
      color: colors.overlay.inverse,
      paddingTop: 6,
      fontSize: 12,
    },
  });

const setAnimatedValue = (animatedValue: Animated.Value, value: number): void =>
  animatedValue.setValue(value);

interface SlippageSliderProps {
  range: [number, number];
  increment: number;
  onChange: (value: number) => void;
  value: number;
  formatTooltipText: (value: number) => string;
  disabled?: boolean;
  changeOnRelease?: boolean;
}

const SlippageSlider: React.FC<SlippageSliderProps> = ({
  range,
  increment,
  onChange,
  value,
  formatTooltipText,
  disabled,
  changeOnRelease,
}) => {
  const theme = useTheme();
  const { colors, shadows } = theme;
  const styles = useMemo(() => createStyles(colors, shadows), [colors, shadows]);
  /* Reusable/truncated references to the range prop values */
  const [r0, r1] = useMemo(() => range, [range]);
  const fullRange = useMemo(() => r1 - r0, [r0, r1]);
  const ticksLength = useMemo(
    () => Math.ceil(fullRange / increment),
    [fullRange, increment],
  );

  /* Layout State */
  const [trackWidth, setTrackWidth] = useState<number>(0);
  const [componentWidth, setComponentWidth] = useState<number>(0);

  /* State */
  const [isResponderGranted, setIsResponderGranted] = useState<boolean>(false);
  const [temporaryValue, setTemporaryValue] = useState<number>(value);

  /* Pan and slider position
  /* Pan will handle the gesture and update slider */
  const pan = useRef<Animated.Value>(new Animated.Value(0)).current;
  const slider = useRef<Animated.Value>(new Animated.Value(0)).current;
  const sliderPosition = slider.interpolate({
    inputRange: [0, trackWidth],
    outputRange: [0, trackWidth - DIAMETER],
    extrapolate: 'clamp',
  });

  const sliderColor = sliderPosition.interpolate({
    inputRange: [0, trackWidth],
    outputRange: [colors.primary.default, colors.error.default],
    extrapolate: 'clamp',
  });

  /* Value effect, this updates the UI if the value prop changes */
  useEffect(() => {
    if (!isResponderGranted) {
      const relativePercent = ((value - r0) / fullRange) * trackWidth;
      setAnimatedValue(slider, relativePercent);
      pan.setValue(relativePercent);
    }
  }, [fullRange, isResponderGranted, pan, r0, slider, trackWidth, value]);

  /* Get the slider position value (snaps to points) and the value for the onChange callback */
  const getValuesByProgress = useCallback(
    (progressPercent: number): [number, number] => {
      const multiplier = Math.round(progressPercent * ticksLength);
      const sliderValue = (multiplier / ticksLength) * trackWidth;
      const newValue = r0 + multiplier * increment;
      return [sliderValue, newValue];
    },
    [increment, r0, ticksLength, trackWidth],
  );

  /* Slider action handlers */
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !disabled,
        onMoveShouldSetPanResponder: () => !disabled,
        onPanResponderGrant: () => {
          setIsResponderGranted(true);
          pan.extractOffset();
        },
        onPanResponderMove: (
          _: GestureResponderEvent,
          gestureState: PanResponderGestureState,
        ) => {
          pan.setValue(gestureState.dx);
          const relativeValue = Animated.add(pan, new Animated.Value(0)).interpolate({
            inputRange: [0, trackWidth],
            outputRange: [0, trackWidth],
            extrapolate: 'clamp',
          });

          relativeValue.addListener((currentValue) => {
            const [sliderValue, newValue] = getValuesByProgress(
              currentValue.value / trackWidth,
            );
            slider.setValue(sliderValue);
            setTemporaryValue(newValue);
            if (!changeOnRelease && onChange) {
              onChange(newValue);
            }
          });
        },
        onPanResponderRelease: () => {
          pan.flattenOffset();
          pan.addListener((panValue) => {
            const relativeValue = Math.min(Math.max(0, panValue.value), trackWidth);
            pan.setValue(relativeValue);
            if (changeOnRelease && onChange) {
              const progress = relativeValue / trackWidth;
              const [, newValue] = getValuesByProgress(progress);
              onChange(newValue);
            }
          });
        },
      }),
    [
      changeOnRelease,
      disabled,
      getValuesByProgress,
      onChange,
      pan,
      slider,
      trackWidth,
    ],
  );

  /* Rendering */
  const displayValue =
    changeOnRelease && isResponderGranted ? temporaryValue : value;

  return (
    <View
      style={[styles.root, disabled && styles.rootDisabled]}
      onLayout={(e: LayoutChangeEvent) => setComponentWidth(e.nativeEvent.layout.width)}
    >
      <View
        style={[styles.trackBackContainer, { width: componentWidth }]}
        onLayout={(e: LayoutChangeEvent) => setTrackWidth(e.nativeEvent.layout.width)}
      >
        <View style={styles.trackBack}>
          {new Array(ticksLength + 1).fill(0).map((_, i) => (
            <View key={i} style={styles.tick} />
          ))}
        </View>
      </View>
      <Animated.View
        style={[
          styles.trackFront,
          { width: Animated.add(sliderPosition, DIAMETER / 2) },
        ]}
      >
        <Image
          style={{ width: trackWidth }}
          resizeMode="stretch"
          source={SlippageSliderBgImg}
        />
      </Animated.View>
      <Animated.View
        style={[
          styles.tooltipContainer,
          {
            left: Animated.subtract(
              sliderPosition,
              (TOOLTIP_WIDTH - DIAMETER) / 2,
            ),
          },
        ]}
      >
        <Svg
          width={TOOLTIP_WIDTH}
          height={TOOLTIP_HEIGHT}
          viewBox={`0 0 ${TOOLTIP_WIDTH} ${TOOLTIP_HEIGHT}`}
        >
          <Path
            d={
              'M0 8C0 3.58172 3.58172 0 8 0H32C36.4183 0 40 3.58172 40 8V20.6866C40 25.1049 36.4183 28.6866 32 28.6866H27.7778L20 36L12.2222 28.6866H8C3.58172 28.6866 0 25.1049 0 20.6866V8Z'
            }
            fill={colors.overlay.alternative}
          />
        </Svg>
        <Text style={styles.tooltipText}>
          {formatTooltipText(displayValue)}
        </Text>
      </Animated.View>
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.slider,
          { left: sliderPosition, backgroundColor: sliderColor },
        ]}
      />
    </View>
  );
};

export default SlippageSlider;
