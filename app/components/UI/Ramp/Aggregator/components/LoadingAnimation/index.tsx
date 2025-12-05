import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, Image } from 'react-native';
import Animated, {
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import Device from '../../../../../../util/device';
import BaseTitle from '../../../../../Base/Title';
import ShapesBackgroundAnimation from '../ShapesBackgroundAnimation';
import { useTheme } from '../../../../../../util/theme';
import { Colors } from '../../../../../../util/theme/models';
import foxImage from 'images/branding/fox.png';

// TODO: Convert into typescript and correctly type
// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Title = BaseTitle as any;

const ANIM_MULTIPLIER = 0.67;
const START_DURATION = 1000 * ANIM_MULTIPLIER;
const FINISH_DURATION = 500 * ANIM_MULTIPLIER;
const DELAY = 1000 * ANIM_MULTIPLIER;

const IS_NARROW = Device.getDeviceWidth() <= 320;
const STAGE_SIZE = IS_NARROW ? 240 : 260;
const FINALIZING_PERCENTAGE = 80;

const createStyles = (
  colors: Colors,
  options?: {
    asScreen: boolean;
  },
) =>
  StyleSheet.create({
    screen: {
      flex: options?.asScreen ? 1 : undefined,
      justifyContent: 'center',
      alignItems: 'center',
    },
    content: {
      width: '100%',
      paddingHorizontal: 60,
      marginVertical: 60,
    },
    progressWrapper: {
      backgroundColor: colors.primary.muted,
      height: 3,
      borderRadius: 3,
      marginVertical: 15,
    },
    progressBar: {
      backgroundColor: colors.primary.default,
      height: 3,
      width: 3,
      borderRadius: 3,
      flex: 1,
    },
    foxContainer: {
      width: STAGE_SIZE,
      height: STAGE_SIZE,
      alignSelf: 'center',
    },
    foxWrapper: {
      position: 'relative',
      width: STAGE_SIZE,
      height: STAGE_SIZE,
      alignItems: 'center',
      justifyContent: 'center',
    },
    foxImage: {
      width: 100,
      height: 100,
      zIndex: 2,
    },
    backgroundShapes: {
      ...StyleSheet.absoluteFillObject,
      zIndex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      transform: [{ translateX: -20 }, { translateY: -10 }],
    },
  });

interface Props {
  title: string;
  finish: boolean;
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onAnimationEnd?: () => any;
  asScreen?: boolean;
}

function LoadingAnimation({
  title,
  finish,
  onAnimationEnd,
  asScreen = true,
}: Props): React.ReactElement<Props> {
  const { colors } = useTheme();
  const styles = createStyles(colors, { asScreen });
  const [hasStartedFinishing, setHasStartedFinishing] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  /* References */
  const progressWidth = useSharedValue(0);

  const startAnimation = useCallback(() => {
    setHasStarted(true);
    progressWidth.value = withDelay(
      DELAY,
      withTiming(FINALIZING_PERCENTAGE, {
        duration: START_DURATION,
      }),
    );
  }, [progressWidth]);

  const endAnimation = useCallback(() => {
    setHasStartedFinishing(true);
    cancelAnimation(progressWidth);
    progressWidth.value = withTiming(
      100,
      {
        duration: FINISH_DURATION,
      },
      () => {
        if (onAnimationEnd) {
          runOnJS(onAnimationEnd)();
        }
      },
    );
  }, [onAnimationEnd, progressWidth]);

  const progressStyle = useAnimatedStyle(
    () => ({
      width: `${progressWidth.value}%`,
    }),
    [progressWidth],
  );

  /* Effects */

  /* Effect to finish animation once sequence is completed */
  useEffect(() => {
    if (finish && !hasStartedFinishing) {
      endAnimation();
    }
  }, [endAnimation, finish, hasStartedFinishing]);

  if (!hasStarted) {
    startAnimation();
  }

  return (
    <View style={styles.screen}>
      <View style={styles.content}>
        <Title centered>{title}</Title>

        <View style={styles.progressWrapper}>
          <Animated.View style={[styles.progressBar, progressStyle]} />
        </View>
        <View style={styles.foxContainer} pointerEvents="none">
          <View style={styles.foxWrapper}>
            <Image
              source={foxImage}
              style={styles.foxImage}
              resizeMethod={'auto'}
            />
            <View style={styles.backgroundShapes} pointerEvents="none">
              <ShapesBackgroundAnimation
                width={STAGE_SIZE * 0.8}
                height={STAGE_SIZE * 0.8}
              />
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

export default LoadingAnimation;
