import React, { useState, useCallback, useEffect } from 'react';
import { StyleSheet, Animated, useAnimatedValue } from 'react-native';
import { ControllersGateProps } from './types';
import { useSelector } from 'react-redux';
import { selectAppServicesReady } from '../../../reducers/user/selectors';
import FoxLoader from '../../UI/FoxLoader';
import {
  markStartup,
  timeStartupStep,
} from '../../../core/Performance/startupStageSpans';
/**
 * A higher order component that gate keeps the children until the app services are finished loaded
 * and the splash loader has dismissed.
 *
 * @param props - The props for the ControllersGate component
 * @param props.children - The children to render
 * @returns - The ControllersGate component
 */
const ControllersGate: React.FC<ControllersGateProps> = ({
  children,
}: ControllersGateProps) => {
  const appServicesReady = useSelector(selectAppServicesReady);
  const [loaderDone, setLoaderDone] = useState(false);
  const [animationDone, setAnimationDone] = useState(false);
  const loaderOpacity = useAnimatedValue(1);

  const fadeOutLoader = useCallback(() => {
    const stopFade = timeStartupStep(
      'splash_reveal_tax',
      'startup.splash.fade_ms',
    );
    Animated.timing(loaderOpacity, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      stopFade();
      markStartup('splashGone');
      setLoaderDone(true);
    });
  }, [loaderOpacity]);

  // Fade out once the loader has dismissed and app services are ready.
  // Dismissing early, before services finish, would reveal a blank screen.
  useEffect(() => {
    if (animationDone && appServicesReady) {
      fadeOutLoader();
    }
  }, [animationDone, appServicesReady, fadeOutLoader]);

  const handleAnimationComplete = useCallback(() => {
    setAnimationDone(true);
  }, []);

  return (
    <React.Fragment>
      {appServicesReady && children}
      {!loaderDone && (
        <Animated.View
          style={[StyleSheet.absoluteFill, { opacity: loaderOpacity }]}
        >
          <FoxLoader
            key="fox-loader"
            appServicesReady={appServicesReady}
            onAnimationComplete={handleAnimationComplete}
          />
        </Animated.View>
      )}
    </React.Fragment>
  );
};

export default ControllersGate;
