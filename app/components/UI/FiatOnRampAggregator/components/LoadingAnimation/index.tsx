import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, View, StyleSheet } from 'react-native';
import Device from '../../../../../util/device';
import BaseTitle from '../../../../Base/Title';
import FoxComponent from '../../../Fox';
import backgroundShapes from './backgroundShapes';
import { useTheme } from '../../../../../util/theme';
import { Colors } from '../../../../../util/theme/models';

// TODO: Convert into typescript and correctly type
const Title = BaseTitle as any;
const Fox = FoxComponent as any;

const ANIM_MULTIPLIER = 0.67;
const START_DURATION = 1000 * ANIM_MULTIPLIER;
const FINISH_DURATION = 750 * ANIM_MULTIPLIER;
const DELAY = 1000 * ANIM_MULTIPLIER;

const IS_NARROW = Device.getDeviceWidth() <= 320;
const STAGE_SIZE = IS_NARROW ? 240 : 260;
const FINALIZING_PERCENTAGE = 80;

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    content: {
      width: '100%',
      paddingHorizontal: 60,
      marginVertical: 15,
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
    },
  });

const customStyle = (colors: Colors) => `
	body {
		background-color: ${colors.background.default};
	}
	#head {
		height: 35%;
		top: 50%;
		transform: translateY(-50%);
	}
	#bgShapes {
		position: absolute;
		left: 50%;
		top: 50%;
		width: 70%;
		height: 70%;
		transform: translateX(-50%) translateY(-50%) rotate(0deg);
		animation: rotate 50s linear infinite;
	}

	@keyframes rotate {
		to {
			transform: translateX(-50%) translateY(-50%) rotate(360deg);
		}
	}
`;

interface Props {
  title: string;
  finish: boolean;
  onAnimationEnd?: () => any;
}

function LoadingAnimation({
  title,
  finish,
  onAnimationEnd,
}: Props): React.ReactElement<Props> {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [hasStartedFinishing, setHasStartedFinishing] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  /* References */
  const foxRef = useRef();
  const progressValue = useRef(new Animated.Value(0)).current;
  const progressWidth = progressValue.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  const startAnimation = useCallback(() => {
    setHasStarted(true);
    Animated.sequence([
      Animated.delay(DELAY),
      Animated.timing(progressValue, {
        toValue: FINALIZING_PERCENTAGE,
        duration: START_DURATION,
        useNativeDriver: false,
      }),
    ]).start();
  }, [progressValue]);

  const endAnimation = useCallback(() => {
    setHasStartedFinishing(true);
    Animated.timing(progressValue, {
      toValue: 100,
      duration: FINISH_DURATION,
      useNativeDriver: false,
    }).start(() => {
      if (onAnimationEnd) {
        onAnimationEnd();
      }
    });
  }, [onAnimationEnd, progressValue]);

  /* Effects */

  /* Effect to finish animation once sequence is completed */
  useEffect(() => {
    if (finish && !hasStartedFinishing) {
      endAnimation();
    }
  }, [endAnimation, finish, hasStartedFinishing]);

  useEffect(() => {
    if (!hasStarted) {
      startAnimation();
    }
  }, [hasStarted, startAnimation]);

  return (
    <View style={styles.screen}>
      <View style={styles.content}>
        <>
          <Title centered>{title}</Title>
        </>

        <View style={styles.progressWrapper}>
          <Animated.View
            style={[styles.progressBar, { width: progressWidth }]}
          />
        </View>
      </View>
      <View style={styles.foxContainer} pointerEvents="none">
        <Fox
          ref={foxRef}
          customContent={backgroundShapes}
          customStyle={customStyle(colors)}
        />
      </View>
    </View>
  );
}

export default LoadingAnimation;
