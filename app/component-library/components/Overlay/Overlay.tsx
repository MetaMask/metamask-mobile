/* eslint-disable react/prop-types */

// Third party dependencies.
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react';
import { Animated, TouchableOpacity } from 'react-native';

// External dependencies.
import { useStyles } from '../../hooks';

// Internal dependencies.
import styleSheet from './Overlay.styles';
import {
  DEFAULT_OVERLAY_ANIMATION_DURATION,
  DEFAULT_OVERLAY_ANIMATION_EASING,
} from './Overlay.constants';
import { OverlayProps, OverlayRef } from './Overlay.types';

const Overlay = forwardRef<OverlayRef, OverlayProps>(
  ({ style, onPress, color, duration, ...touchableProps }, ref) => {
    const { styles } = useStyles(styleSheet, { style, color });
    const opacityVal = useRef(new Animated.Value(0)).current;

    const fadeIn = useCallback(() => {
      Animated.timing(opacityVal, {
        toValue: 1,
        duration: duration ?? DEFAULT_OVERLAY_ANIMATION_DURATION,
        easing: DEFAULT_OVERLAY_ANIMATION_EASING,
        useNativeDriver: true,
      }).start();
    }, [duration, opacityVal]);

    const fadeOut = useCallback(
      (callback?: () => void) => {
        Animated.timing(opacityVal, {
          toValue: 0,
          duration: duration ?? DEFAULT_OVERLAY_ANIMATION_DURATION,
          easing: DEFAULT_OVERLAY_ANIMATION_EASING,
          useNativeDriver: true,
        }).start(({ finished }) => {
          if (finished) {
            callback?.();
          }
        });
      },
      [duration, opacityVal],
    );

    useImperativeHandle(ref, () => ({ fadeIn, fadeOut }), [fadeIn, fadeOut]);

    useEffect(() => {
      fadeIn();
    }, [fadeIn]);

    return (
      <Animated.View style={[styles.base, { opacity: opacityVal }]}>
        {onPress && (
          <TouchableOpacity
            onPress={onPress}
            style={styles.fill}
            {...touchableProps}
          />
        )}
      </Animated.View>
    );
  },
);

Overlay.displayName = 'Overlay';

export default Overlay;
