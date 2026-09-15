import React, { useMemo } from 'react';
import { AccessibilityInfo, useWindowDimensions } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { Box } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { KOL_DASHBOARD_SELECTORS } from './KolDashboard.testIds';

const BILL_COUNT = 12;

interface ClaimMoneyFallOverlayProps {
  visible: boolean;
}

const FallingBill: React.FC<{ index: number; width: number }> = ({
  index,
  width,
}) => {
  const tw = useTailwind();
  const translateY = useSharedValue(-60);
  const startX = useMemo(
    () => (width / (BILL_COUNT + 1)) * (index + 1) - 12,
    [index, width],
  );

  React.useEffect(() => {
    translateY.value = withDelay(
      index * 40,
      withTiming(720, { duration: 1100 }),
    );
  }, [index, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }, { translateX: startX }],
  }));

  return (
    <Animated.Text
      style={[tw.style('absolute left-0 top-0 text-[22px]'), animatedStyle]}
    >
      $
    </Animated.Text>
  );
};

const ClaimMoneyFallOverlay: React.FC<ClaimMoneyFallOverlayProps> = ({
  visible,
}) => {
  const { width } = useWindowDimensions();
  const [reduceMotion, setReduceMotion] = React.useState(false);

  React.useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then(setReduceMotion)
      .catch(() => {
        setReduceMotion(false);
      });
  }, []);

  if (!visible || reduceMotion) {
    return null;
  }

  return (
    <Box
      pointerEvents="none"
      testID={KOL_DASHBOARD_SELECTORS.MONEY_FALL}
      twClassName="absolute inset-0 overflow-hidden"
    >
      {Array.from({ length: BILL_COUNT }, (_, index) => (
        <FallingBill key={index} index={index} width={width} />
      ))}
    </Box>
  );
};

export default ClaimMoneyFallOverlay;
