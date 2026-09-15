import React, { useEffect } from 'react';
import Reanimated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import {
  Box,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useTheme } from '../../../../../util/theme';
import { animateMoneyFinishSetupProgressRatio } from './moneyFinishSetupProgressAnimation';

const AnimatedCircle = Reanimated.createAnimatedComponent(Circle);

interface MoneyFinishSetupProgressRingProps {
  completedCount: number;
  totalTasks: number;
  size?: 'sm' | 'lg';
  showSuccess?: boolean;
  testID?: string;
}

const RING_CONFIG = {
  sm: { size: 48, strokeWidth: 3, textVariant: TextVariant.BodySm },
  lg: { size: 68, strokeWidth: 4, textVariant: TextVariant.HeadingSm },
} as const;

const MoneyFinishSetupProgressRing = ({
  completedCount,
  totalTasks,
  size = 'sm',
  showSuccess = false,
  testID,
}: MoneyFinishSetupProgressRingProps) => {
  const tw = useTailwind();
  const theme = useTheme();
  const { size: ringSize, strokeWidth, textVariant } = RING_CONFIG[size];
  const radius = (ringSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const targetRatio = totalTasks > 0 ? completedCount / totalTasks : 0;
  const progressRatio = useSharedValue(targetRatio);
  const successProgress = useSharedValue(showSuccess ? 1 : 0);

  useEffect(() => {
    animateMoneyFinishSetupProgressRatio(progressRatio, targetRatio);
  }, [progressRatio, targetRatio]);

  useEffect(() => {
    successProgress.value = withTiming(showSuccess ? 1 : 0, {
      duration: 280,
      easing: Easing.out(Easing.cubic),
    });
  }, [showSuccess, successProgress]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progressRatio.value),
  }));

  const countStyle = useAnimatedStyle(() => ({
    opacity: 1 - successProgress.value,
    transform: [{ scale: 1 - successProgress.value * 0.08 }],
  }));

  const successStyle = useAnimatedStyle(() => ({
    opacity: successProgress.value,
    transform: [{ scale: 0.75 + successProgress.value * 0.25 }],
  }));

  return (
    <Box
      twClassName="items-center justify-center"
      style={tw.style({ width: ringSize, height: ringSize })}
      testID={testID}
    >
      <Box twClassName="absolute inset-0">
        <Svg width={ringSize} height={ringSize}>
          <Circle
            cx={ringSize / 2}
            cy={ringSize / 2}
            r={radius}
            stroke={theme.colors.border.muted}
            strokeOpacity={0.65}
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          <AnimatedCircle
            cx={ringSize / 2}
            cy={ringSize / 2}
            r={radius}
            stroke={theme.colors.success.default}
            strokeWidth={strokeWidth}
            strokeDasharray={`${circumference} ${circumference}`}
            strokeLinecap="round"
            fill="transparent"
            transform={`rotate(-90 ${ringSize / 2} ${ringSize / 2})`}
            animatedProps={animatedProps}
          />
        </Svg>
      </Box>
      <Reanimated.View
        style={[
          tw.style('absolute inset-0 items-center justify-center'),
          countStyle,
        ]}
      >
        <Text variant={textVariant} fontWeight={FontWeight.Medium}>
          {`${completedCount}/${totalTasks}`}
        </Text>
      </Reanimated.View>
      <Reanimated.View
        style={[
          tw.style('absolute inset-0 items-center justify-center'),
          successStyle,
        ]}
      >
        <Icon
          name={IconName.CheckBold}
          size={IconSize.Lg}
          color={IconColor.SuccessDefault}
        />
      </Reanimated.View>
    </Box>
  );
};

export default MoneyFinishSetupProgressRing;
