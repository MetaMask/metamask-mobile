import { Animated } from 'react-native';
import {
  Easing,
  SharedValue,
  withTiming,
  type WithTimingConfig,
} from 'react-native-reanimated';

const showAnimationConfig: WithTimingConfig = {
  duration: 250,
  easing: Easing.out(Easing.cubic),
};

const hideAnimationConfig: WithTimingConfig = {
  duration: 300,
  easing: Easing.out(Easing.cubic),
};

export function animateIconCollapseProgress(
  iconCollapseProgress: SharedValue<number>,
  hidden: boolean,
): void {
  iconCollapseProgress.value = withTiming(
    hidden ? 1 : 0,
    hidden ? hideAnimationConfig : showAnimationConfig,
  );
}

export function animateIconCollapseMirror(
  iconCollapseAnim: Animated.Value,
  hidden: boolean,
): void {
  Animated.timing(iconCollapseAnim, {
    toValue: hidden ? 1 : 0,
    duration: hidden
      ? hideAnimationConfig.duration
      : showAnimationConfig.duration,
    useNativeDriver: true,
  }).start();
}

export function showDiscoveryWalletHeader(
  walletHeaderTranslateY: SharedValue<number> | undefined,
  iconCollapseProgress: SharedValue<number>,
  iconCollapseAnim: Animated.Value,
): void {
  if (walletHeaderTranslateY) {
    walletHeaderTranslateY.value = withTiming(0, showAnimationConfig);
  }
  animateIconCollapseProgress(iconCollapseProgress, false);
  animateIconCollapseMirror(iconCollapseAnim, false);
}
