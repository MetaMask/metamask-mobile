import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  useMemo,
} from 'react';
import { View, Dimensions } from 'react-native';
import Rive, { RiveRef, Fit, Alignment } from 'rive-react-native';
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
}

const OnboardingSuccessAnimation: React.FC<OnboardingSuccessAnimationProps> = ({
  startAnimation: _startAnimation,
  onAnimationComplete: _onAnimationComplete,
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

  const [dotsCount, setDotsCount] = useState(1);

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
      setTimeout(() => {
        if (riveRef.current) {
          try {
            riveRef.current.setInputState(
              'OnboardingLoader',
              'Dark mode',
              isDarkMode,
            );
            riveRef.current.fireState('OnboardingLoader', 'Start');
          } catch (error) {
            console.error('Error starting Rive animation:', error);
          }
        }
      }, 100);
    }
  }, [isDarkMode]);

  const startDotsAnimation = useCallback(() => {
    dotsIntervalId.current = setInterval(() => {
      setDotsCount((prev) => (prev >= 3 ? 1 : prev + 1));
    }, 500);
  }, []);

  useEffect(() => {
    startRiveAnimation();
    startDotsAnimation();

    return () => {
      clearTimers();
    };
  }, [startRiveAnimation, startDotsAnimation, clearTimers]);

  return (
    <View style={styles.animationContainer}>
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
    </View>
  );
};

export default OnboardingSuccessAnimation;
