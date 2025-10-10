import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  useMemo,
} from 'react';
import { View, Animated, Easing } from 'react-native';
import Rive, { Fit, Alignment } from 'rive-react-native';
import { useTheme } from '../../../util/theme';
import createStyles from './OnboardingSuccessAnimation.styles.ts';
import { strings } from '../../../../locales/i18n';
import Text, {
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import { useScreenDimensions } from './hooks/useScreenDimensions';
import { useRiveAnimation } from './hooks/useRiveAnimation';

import onboardingRiveFile from '../../../animations/onboarding_loader.riv';
import { isE2E } from '../../../util/test/utils';

interface OnboardingSuccessAnimationProps {
  onAnimationComplete: () => void;
  slideOut?: boolean;
}

const OnboardingSuccessAnimation: React.FC<OnboardingSuccessAnimationProps> = ({
  onAnimationComplete: _onAnimationComplete,
  slideOut = false,
}) => {
  const { colors, themeAppearance } = useTheme();
  const isDarkMode = themeAppearance === 'dark';

  const screenDimensions = useScreenDimensions();

  const styles = useMemo(
    () => createStyles(colors, screenDimensions),
    [colors, screenDimensions],
  );

  const { riveRef, clearRiveTimer } = useRiveAnimation(isDarkMode, {
    stateMachineName: 'OnboardingLoader',
    darkModeInputName: 'Dark mode',
    startTriggerName: 'Start',
  });

  const dotsIntervalId = useRef<NodeJS.Timeout | null>(null);
  const isCompletedRef = useRef(false);
  const slideAnim = useRef(new Animated.Value(0)).current;

  const [dotsCount, setDotsCount] = useState(isE2E ? 3 : 1);

  const clearTimers = useCallback(() => {
    if (dotsIntervalId.current) {
      clearInterval(dotsIntervalId.current);
      dotsIntervalId.current = null;
    }
    clearRiveTimer();
    isCompletedRef.current = false;
  }, [clearRiveTimer]);

  const renderAnimatedDots = useCallback(() => {
    const count = Math.max(1, Math.min(3, dotsCount));
    const dots = '.'.repeat(count);
    return dots;
  }, [dotsCount]);

  const startDotsAnimation = useCallback(() => {
    if (dotsIntervalId.current) {
      clearInterval(dotsIntervalId.current);
      dotsIntervalId.current = null;
    }

    if (isE2E) {
      setDotsCount(3);
      return;
    }

    dotsIntervalId.current = setInterval(() => {
      setDotsCount((prev) => (prev >= 3 ? 1 : prev + 1));
    }, 500);
  }, []);

  const startSlideOutAnimation = useCallback(() => {
    if (isCompletedRef.current) {
      return;
    }

    if (isE2E) {
      isCompletedRef.current = true;
      _onAnimationComplete();
      return;
    }

    isCompletedRef.current = true;
    Animated.timing(slideAnim, {
      toValue: -screenDimensions.screenWidth,
      duration: 800,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      _onAnimationComplete();
    });
  }, [slideAnim, screenDimensions.screenWidth, _onAnimationComplete]);

  useEffect(() => {
    startDotsAnimation();

    return () => {
      clearTimers();
    };
  }, [startDotsAnimation, clearTimers]);

  useEffect(() => {
    if (slideOut) {
      startSlideOutAnimation();
    }
  }, [slideOut, startSlideOutAnimation]);

  return (
    <Animated.View
      testID="onboarding-success-animation"
      style={[
        styles.animationContainer,
        {
          transform: [{ translateX: slideAnim }],
        },
      ]}
    >
      <View style={styles.animationWrapper}>
        <Rive
          ref={riveRef}
          source={onboardingRiveFile}
          style={styles.riveAnimation}
          autoplay
          fit={Fit.Cover}
          alignment={Alignment.Center}
        />
      </View>
      <View style={styles.textWrapper}>
        <Text variant={TextVariant.HeadingLG} style={styles.textTitle}>
          {`${strings(
            'onboarding_success.setting_up_wallet_base',
          )}${renderAnimatedDots()}`}
        </Text>
      </View>
    </Animated.View>
  );
};

export default OnboardingSuccessAnimation;
