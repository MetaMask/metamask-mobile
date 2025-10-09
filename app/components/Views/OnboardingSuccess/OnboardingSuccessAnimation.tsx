import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  useMemo,
} from 'react';
import { View, Dimensions, Animated, Easing } from 'react-native';
import Rive, { RiveRef, Fit, Alignment } from 'rive-react-native';
import { useTheme } from '../../../util/theme';
import createStyles from './OnboardingSuccessAnimation.styles.ts';
import { strings } from '../../../../locales/i18n';
import Text, {
  TextVariant,
} from '../../../component-library/components/Texts/Text';

import onboardingRiveFile from '../../../animations/onboarding_loader.riv';
import { isE2E } from '../../../util/test/utils';

interface OnboardingSuccessAnimationProps {
  startAnimation: boolean;
  onAnimationComplete: () => void;
  slideOut?: boolean;
  mode?: 'setup' | 'success'; // Auto-configures trigger + showText
  trigger?: string;
  showText?: boolean;
}

const OnboardingSuccessAnimation: React.FC<OnboardingSuccessAnimationProps> = ({
  startAnimation: _startAnimation,
  onAnimationComplete: _onAnimationComplete,
  slideOut = false,
  mode = 'setup',
  trigger,
  showText,
}) => {
  const { colors, themeAppearance } = useTheme();
  const isDarkMode = themeAppearance === 'dark';

  const screenDimensions = useMemo(() => {
    const { width, height } = Dimensions.get('window');
    return {
      screenWidth: width,
      screenHeight: height,
      animationHeight: height * 0.6,
    };
  }, []);

  const styles = useMemo(
    () => createStyles(colors, screenDimensions),
    [colors, screenDimensions],
  );

  const riveRef = useRef<RiveRef>(null);
  const dotsIntervalId = useRef<NodeJS.Timeout | null>(null);
  const slideAnim = useRef(new Animated.Value(0)).current;

  const [dotsCount, setDotsCount] = useState(isE2E ? 3 : 1);
  const [isCompleted, setIsCompleted] = useState(false);

  // Determine trigger based on mode or explicit override
  const animationTrigger = useMemo(() => {
    if (trigger) return trigger;
    return mode === 'success' ? 'Only_End' : 'Start'; // Mode-based default
  }, [mode, trigger]);

  // Determine text visibility based on mode or explicit override
  const shouldShowText = useMemo(() => {
    if (showText !== undefined) return showText;
    return mode === 'setup'; // Mode-based: setup=true, success=false
  }, [mode, showText]);

  const clearTimers = useCallback(() => {
    if (dotsIntervalId.current) {
      clearInterval(dotsIntervalId.current);
      dotsIntervalId.current = null;
    }
  }, []);

  const renderAnimatedDots = useCallback(() => {
    const count = Math.max(1, Math.min(3, dotsCount));
    const dots = '.'.repeat(count);
    return dots;
  }, [dotsCount]);

  const startRiveAnimation = useCallback(() => {
    if (riveRef.current) {
      if (isE2E) {
        // Set static state for E2E tests - no animation delays
        riveRef.current.setInputState(
          'OnboardingLoader',
          'Dark mode',
          isDarkMode,
        );
        riveRef.current.fireState('OnboardingLoader', animationTrigger);
        return;
      }

      setTimeout(() => {
        if (riveRef.current) {
          try {
            riveRef.current.setInputState(
              'OnboardingLoader',
              'Dark mode',
              isDarkMode,
            );
            riveRef.current.fireState('OnboardingLoader', animationTrigger);
          } catch (error) {
            console.error(`Error with trigger '${animationTrigger}':`, error);
          }
        }
      }, 100);
    }
  }, [isDarkMode, animationTrigger]);

  const startDotsAnimation = useCallback(() => {
    if (isE2E) {
      setDotsCount(3);
      return;
    }

    dotsIntervalId.current = setInterval(() => {
      setDotsCount((prev) => (prev >= 3 ? 1 : prev + 1));
    }, 500);
  }, []);

  const startSlideOutAnimation = useCallback(() => {
    if (!isCompleted) {
      if (isE2E) {
        setIsCompleted(true);
        _onAnimationComplete();
        return;
      }

      Animated.timing(slideAnim, {
        toValue: -screenDimensions.screenWidth,
        duration: 800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(() => {
        setIsCompleted(true);
        _onAnimationComplete();
      });
    }
  }, [
    slideAnim,
    screenDimensions.screenWidth,
    isCompleted,
    _onAnimationComplete,
  ]);

  useEffect(() => {
    startRiveAnimation();
    startDotsAnimation();

    return () => {
      clearTimers();
    };
  }, [startRiveAnimation, startDotsAnimation, clearTimers]);

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
      {shouldShowText && (
        <View style={styles.textWrapper}>
          <Text variant={TextVariant.HeadingLG} style={styles.textTitle}>
            {`${strings(
              'onboarding_success.setting_up_wallet_base',
            )}${renderAnimatedDots()}`}
          </Text>
        </View>
      )}
    </Animated.View>
  );
};

export default OnboardingSuccessAnimation;
