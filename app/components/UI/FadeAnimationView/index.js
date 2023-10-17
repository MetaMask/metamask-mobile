import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Animated } from 'react-native';
import PropTypes from 'prop-types';

const TIME = 3900; // 3900/6 = 650 for each

const FadeAnimationView = ({
  children,
  style,
  animationTime = TIME,
  valueToWatch,
  onAnimationStart,
  onAnimationEnd,
  animateOnChange,
}) => {
  const fadeAnim = useRef(new Animated.Value(1)).current; // Initial value for opacity: 1
  const [value, setValue] = useState(valueToWatch);
  const [lastChildren, setLastChildren] = useState(children);
  const [isAnimating, setIsAnimating] = useState(false);

  const animationEnded = useCallback(() => {
    onAnimationEnd?.();
    setValue(valueToWatch);
    setLastChildren(children);
    setIsAnimating(false);
  }, [children, onAnimationEnd, valueToWatch]);

  const animationStarted = useCallback(() => {
    onAnimationStart?.();
  }, [onAnimationStart]);

  const animate = useCallback(() => {
    animationStarted();

    const animationParams = {
      time: animationTime / 6,
      useNativeDriver: true,
    };
    const animationValueZero = 0;
    const animationValueAlmost = 0.8;
    const animationValueFinal = 1;

    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: animationValueZero,
        ...animationParams,
      }),
      Animated.timing(fadeAnim, {
        toValue: animationValueAlmost,
        ...animationParams,
      }),
      Animated.timing(fadeAnim, {
        toValue: animationValueZero,
        ...animationParams,
      }),
      Animated.timing(fadeAnim, {
        toValue: animationValueAlmost,
        ...animationParams,
      }),
      Animated.timing(fadeAnim, {
        toValue: animationValueZero,
        ...animationParams,
      }),
      Animated.timing(fadeAnim, {
        toValue: animationValueFinal,
        ...animationParams,
      }),
    ]).start(() => {
      animationEnded();
    });
  }, [animationEnded, animationStarted, animationTime, fadeAnim]);

  useEffect(() => {
    if (!value) {
      setValue(valueToWatch);
      return;
    }
    if (!isAnimating) {
      if (animateOnChange && valueToWatch && value && value !== valueToWatch) {
        animate();
        setIsAnimating(true);
        setValue(valueToWatch);
        return;
      }
      setLastChildren(children);
    }
  }, [animate, animateOnChange, children, isAnimating, value, valueToWatch]);

  return (
    <Animated.View // Special animatable View
      style={{
        ...style,
        opacity: fadeAnim, // Bind opacity to animated value
      }}
      pointerEvents={isAnimating ? 'none' : null}
    >
      {isAnimating ? lastChildren : children}
    </Animated.View>
  );
};

FadeAnimationView.propTypes = {
  /**
   * Component to render
   */
  children: PropTypes.oneOfType([PropTypes.object, PropTypes.node]),
  /**
   * Style of the container view
   */
  style: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
  /**
   * Time for the animation
   */
  animationTime: PropTypes.number,
  /**
   * Value to watch for changes to start animation
   */
  valueToWatch: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  /**
   * Function to call when update animation starts
   */
  onAnimationStart: PropTypes.func,
  /**
   * Function to call when update animation ends
   */
  onAnimationEnd: PropTypes.func,
  /**
   * If the values should animate upon update or not
   */
  animateOnChange: PropTypes.bool,
};

export default FadeAnimationView;
