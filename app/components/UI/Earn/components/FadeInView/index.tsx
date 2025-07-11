import React, { ReactNode, useRef, useEffect } from 'react';
import { ViewProps, Animated } from 'react-native';

interface FadeInViewProps extends ViewProps {
  children: ReactNode;
  fadeDuration?: number;
}

const FadeInView = ({
  fadeDuration = 200,
  children,
  ...viewProps
}: FadeInViewProps) => {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    opacity.setValue(0);

    Animated.timing(opacity, {
      toValue: 1,
      duration: fadeDuration,
      useNativeDriver: true,
    }).start();
  }, [fadeDuration, opacity]);

  return (
    <Animated.View style={{ opacity }} {...viewProps}>
      {children}
    </Animated.View>
  );
};

export default FadeInView;
