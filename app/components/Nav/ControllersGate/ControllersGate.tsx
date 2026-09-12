import React, { useState, useCallback, useEffect } from 'react';
import { StyleSheet, Animated, useAnimatedValue } from 'react-native';
import { ControllersGateProps } from './types';
import { useSelector } from 'react-redux';
import { selectAppServicesReady } from '../../../reducers/user/selectors';
import FoxLoader from '../../UI/FoxLoader';
/**
 * A higher order component that gate keeps the children until the app services are finished loaded
 * and the splash animation has completed.
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
    Animated.timing(loaderOpacity, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => setLoaderDone(true));
  }, [loaderOpacity]);

  // Only fade out once BOTH the animation is done AND app services are ready.
  // This prevents a blank screen when Rive fails or times out before services finish.
  //
  // The fade starts immediately. There used to be a 250ms delay here, which a
  // frame-by-frame capture showed to be a frozen, pixel-identical blank screen:
  // the Rive exit animation has already finished and faded the fox out, so the
  // overlay is blank white with nothing left to settle. 20 consecutive recorded
  // frames measured a zero difference before the fade began. It was pure added
  // latency on the most-executed cold path in the app.
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
