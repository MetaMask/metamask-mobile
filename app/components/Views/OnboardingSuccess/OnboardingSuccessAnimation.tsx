import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  useMemo,
} from 'react';
import { View, Animated } from 'react-native';
import RiveRef, { RiveRef as RiveRefType } from 'rive-react-native';
import { useTheme } from '../../../util/theme';
import createStyles from './OnboardingSuccessAnimation.styles.ts';
import { strings } from '../../../../locales/i18n';
import Text, {
  TextVariant,
} from '../../../component-library/components/Texts/Text';

import onboardingRiveFile from '../../../animations/onboarding_loader.riv';

interface OnboardingSuccessAnimationProps {
  startAnimation: boolean;
  onAnimationComplete: () => void;
  autoComplete?: boolean;
  mode?: 'setup' | 'ready';
}

const OnboardingSuccessAnimation: React.FC<OnboardingSuccessAnimationProps> = ({
  startAnimation,
  onAnimationComplete,
  autoComplete = false,
  mode = 'setup',
}) => {
  const { themeAppearance } = useTheme();
  const isDarkMode = themeAppearance === 'dark';
  const styles = useMemo(() => createStyles(), []);

  const riveRef = useRef<RiveRefType>(null);
  const animationId = useRef<NodeJS.Timeout | null>(null);
  const dotsIntervalId = useRef<NodeJS.Timeout | null>(null);
  const finalTimeoutId = useRef<NodeJS.Timeout | null>(null);
  const socialLoginTimeoutId = useRef<NodeJS.Timeout | null>(null);

  const [animationStep, setAnimationStep] = useState(0);
  const [dotsCount, setDotsCount] = useState(0);
  const [showContent, setShowContent] = useState(false);

  const fadeOutOpacity = useRef(new Animated.Value(1)).current;
  const fadeInOpacity = useRef(new Animated.Value(0)).current;

  const clearTimers = useCallback(() => {
    if (animationId.current) {
      clearTimeout(animationId.current);
      animationId.current = null;
    }
    if (dotsIntervalId.current) {
      clearInterval(dotsIntervalId.current);
      dotsIntervalId.current = null;
    }
    if (finalTimeoutId.current) {
      clearTimeout(finalTimeoutId.current);
      finalTimeoutId.current = null;
    }
    if (socialLoginTimeoutId.current) {
      clearTimeout(socialLoginTimeoutId.current);
      socialLoginTimeoutId.current = null;
    }
  }, []);

  const renderAnimatedDots = useCallback(() => {
    const count = Math.max(1, Math.min(3, dotsCount));
    const dots = '.'.repeat(count);
    return dots;
  }, [dotsCount]);

  const startRiveAnimation = useCallback(() => {
    if (riveRef.current) {
      try {
        riveRef.current.setInputState('State Machine 1', 'dark', isDarkMode);

        if (mode === 'ready') {
          // For "ready" mode, fire Start then immediately End
          riveRef.current.fireState('State Machine 1', 'Start');
          setTimeout(() => {
            if (riveRef.current) {
              riveRef.current.fireState('State Machine 1', 'End');
            }
          }, 100);

          // Set animation to final state immediately
          setAnimationStep(3);
          setShowContent(true);

          // Set fade opacities to final values
          fadeOutOpacity.setValue(0);
          fadeInOpacity.setValue(1);
        } else {
          // Original "setup" mode behavior
          riveRef.current.fireState('State Machine 1', 'Start');
        }
      } catch (error) {
        console.error('Error starting Rive animation:', error);
      }
    }
  }, [isDarkMode, mode, fadeOutOpacity, fadeInOpacity]);

  const startDotsAnimation = useCallback(() => {
    if (mode === 'ready') return; // Skip dots animation in ready mode

    dotsIntervalId.current = setInterval(() => {
      setDotsCount((prev) => (prev >= 3 ? 1 : prev + 1));
    }, 500);
  }, [mode]);

  const renderAnimationContent = useCallback(() => {
    if (animationStep === 3) {
      return (
        <>
          <Animated.View
            style={[styles.fadeOutContainer, { opacity: fadeOutOpacity }]}
          >
            <Text variant={TextVariant.HeadingLG} style={styles.textTitle}>
              {strings('onboarding_success.setting_up_wallet')}
              {renderAnimatedDots()}
            </Text>
          </Animated.View>
          <Animated.View
            style={[styles.fadeInContainer, { opacity: fadeInOpacity }]}
          >
            <Text variant={TextVariant.HeadingLG} style={styles.textTitle}>
              {strings('onboarding_success.wallet_ready')}
            </Text>
          </Animated.View>
        </>
      );
    }

    const text =
      animationStep === 1
        ? `${strings(
            'onboarding_success.setting_up_wallet',
          )}${renderAnimatedDots()}`
        : strings('onboarding_success.setting_up_wallet');

    return (
      <Text variant={TextVariant.HeadingLG} style={styles.textTitle}>
        {text}
      </Text>
    );
  }, [
    animationStep,
    fadeOutOpacity,
    fadeInOpacity,
    renderAnimatedDots,
    styles.fadeOutContainer,
    styles.fadeInContainer,
    styles.textTitle,
  ]);

  const animationContainerStyle = useMemo(
    () => styles.animationContainer,
    [styles.animationContainer],
  );

  const riveAnimationStyle = useMemo(
    () => styles.riveAnimation,
    [styles.riveAnimation],
  );

  const textOverlayStyle = useMemo(
    () => styles.textOverlay,
    [styles.textOverlay],
  );

  const renderAnimationContainer = useCallback(
    () => (
      <View style={animationContainerStyle}>
        <RiveRef
          ref={riveRef}
          resourceName={onboardingRiveFile as unknown as string}
          style={riveAnimationStyle}
          autoplay={false}
        />
        <View style={textOverlayStyle}>{renderAnimationContent()}</View>
      </View>
    ),
    [
      animationContainerStyle,
      riveAnimationStyle,
      textOverlayStyle,
      renderAnimationContent,
    ],
  );

  useEffect(() => {
    if (startAnimation) {
      startRiveAnimation();
      setAnimationStep(1);
      setShowContent(true);
      startDotsAnimation();

      if (mode === 'ready') {
        // For ready mode, complete immediately
        finalTimeoutId.current = setTimeout(() => {
          onAnimationComplete();
        }, 500);
      } else {
        // Original timing for setup mode
        animationId.current = setTimeout(() => {
          setAnimationStep(2);
          if (dotsIntervalId.current) {
            clearInterval(dotsIntervalId.current);
            dotsIntervalId.current = null;
          }
        }, 2000);

        finalTimeoutId.current = setTimeout(
          () => {
            setAnimationStep(3);

            Animated.parallel([
              Animated.timing(fadeOutOpacity, {
                toValue: 0,
                duration: 500,
                useNativeDriver: true,
              }),
              Animated.timing(fadeInOpacity, {
                toValue: 1,
                duration: 500,
                useNativeDriver: true,
              }),
            ]).start();

            if (riveRef.current) {
              try {
                riveRef.current.fireState('State Machine 1', 'End');
              } catch (error) {
                console.error('Error firing End state:', error);
              }
            }

            socialLoginTimeoutId.current = setTimeout(() => {
              onAnimationComplete();
            }, 1000);
          },
          autoComplete ? 100 : 4000,
        );
      }
    }

    return () => {
      clearTimers();
    };
  }, [
    startAnimation,
    startRiveAnimation,
    startDotsAnimation,
    autoComplete,
    mode,
    fadeOutOpacity,
    fadeInOpacity,
    onAnimationComplete,
    clearTimers,
  ]);

  if (!showContent) {
    return null;
  }

  return renderAnimationContainer();
};

export default OnboardingSuccessAnimation;
