import React, { useState, useCallback, useRef, useEffect } from 'react';
import { StyleSheet, Animated } from 'react-native';
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
  const loaderOpacity = useRef(new Animated.Value(1)).current;

  const fadeOutLoader = useCallback(() => {
    Animated.timing(loaderOpacity, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => setLoaderDone(true));
  }, [loaderOpacity]);

  // Only fade out once BOTH the animation is done AND app services are ready.
  // This prevents a blank screen when Rive fails or times out before services finish.
  useEffect(() => {
    if (animationDone && appServicesReady) {
      const timer = setTimeout(fadeOutLoader, 250);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [animationDone, appServicesReady, fadeOutLoader]);

  const handleAnimationComplete = useCallback(() => {
    setAnimationDone(true);
  }, []);

  return (
    <React.Fragment>
      {appServicesReady && children}
      {!loaderDone && (
        <Animated.View
          pointerEvents="none"
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
