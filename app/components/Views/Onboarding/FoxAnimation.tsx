import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet } from 'react-native';
import Rive, { Alignment, Fit, RiveRef } from 'rive-react-native';
import Logger from '../../../util/Logger';
import { isE2E } from '../../../util/test/utils';
import Device from '../../../util/device';
import FoxAnimationRive from '../../../animations/fox_appear.riv';

const getFoxAnimationHeight = (hasFooter: boolean) => {
  if (hasFooter) {
    return Device.isMediumDevice() ? 150 : 180;
  }
  return Device.isMediumDevice() ? 300 : 350;
};

const createStyles = (hasFooter: boolean) =>
  StyleSheet.create({
    foxAnimationWrapper: {
      position: 'absolute',
      bottom: hasFooter ? 100 : -20,
      left: 0,
      right: 0,
      height: getFoxAnimationHeight(hasFooter),
      alignItems: 'center',
      justifyContent: 'center',
      pointerEvents: 'none',
    },
    foxAnimation: {
      width: '100%',
      height: '100%',
    },
  });

const FoxAnimation = ({
  startFoxAnimation,
  hasFooter,
}: {
  startFoxAnimation: boolean;
  hasFooter: boolean;
}) => {
  const foxRef = useRef<RiveRef>(null);
  const styles = createStyles(hasFooter);
  const foxOpacity = useMemo(() => new Animated.Value(0), []);

  const showFoxAnimation = useCallback(async () => {
    if (isE2E) {
      foxOpacity.setValue(1);
      return;
    }

    Animated.timing(foxOpacity, {
      toValue: 1,
      duration: 600,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      if (foxRef.current) {
        try {
          foxRef.current.fireState('FoxRaiseUp', 'Start');
        } catch (error) {
          Logger.error(error as Error, 'Error triggering Fox Rive animation');
        }
      }
    });
  }, [foxOpacity, foxRef]);

  useEffect(() => {
    if (startFoxAnimation) {
      showFoxAnimation();
    }
  }, [startFoxAnimation, showFoxAnimation]);

  return (
    <Animated.View
      style={[
        styles.foxAnimationWrapper,
        {
          opacity: foxOpacity,
        },
      ]}
    >
      <Rive
        ref={foxRef}
        style={styles.foxAnimation}
        source={FoxAnimationRive}
        fit={Fit.Contain}
        alignment={Alignment.Center}
        autoplay={false}
        stateMachineName="FoxRaiseUp"
        testID="fox-animation"
      />
    </Animated.View>
  );
};

export default FoxAnimation;
