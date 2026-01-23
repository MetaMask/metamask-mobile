import React, { useEffect } from 'react';
import { Box, Icon, IconName } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '../../../../../../util/theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export interface ResourceRingProps {
  icon: IconName;
  size?: number;
  strokeWidth?: number;
  progress?: number;
  indeterminate?: boolean;
}

const ResourceRing: React.FC<ResourceRingProps> = ({
  icon,
  size = 52,
  strokeWidth = 6,
  progress = 0,
  indeterminate = false,
}) => {
  const tw = useTailwind();
  const { colors } = useTheme();

  const radius = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * radius;

  const p = useSharedValue(0);

  useEffect(() => {
    p.value = withTiming(Math.max(0, Math.min(1, progress)), { duration: 800 });
  }, [progress, p]);

  const animatedProps = useAnimatedProps(() => {
    const dashOffset = circumference * (1 - p.value);
    return { strokeDashoffset: dashOffset };
  });

  return (
    <Box
      testID="resource-ring-container"
      twClassName="relative items-center justify-center"
      style={{ width: size, height: size }}
    >
      <Svg width={size} height={size} style={tw.style('absolute')}>
        <Circle
          testID="resource-ring-background"
          cx={cx}
          cy={cy}
          r={radius}
          stroke={colors.border.muted}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {!indeterminate && (
          <AnimatedCircle
            testID="resource-ring-fill"
            animatedProps={animatedProps}
            cx={cx}
            cy={cy}
            r={radius}
            stroke={colors.primary.default}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${circumference} ${circumference}`}
            fill="transparent"
            transform={`rotate(-90 ${cx} ${cy})`}
          />
        )}
      </Svg>

      <Box
        testID="resource-ring-icon-container"
        twClassName="items-center justify-center rounded-full bg-muted"
        style={{
          width: size - strokeWidth * 2,
          height: size - strokeWidth * 2,
        }}
      >
        <Icon testID="resource-ring-icon" name={icon} />
      </Box>
    </Box>
  );
};

export default ResourceRing;
