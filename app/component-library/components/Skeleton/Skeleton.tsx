/* eslint-disable react/prop-types */

// Third party dependencies.
import React, { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';

// External dependencies.
import { useStyles } from '../../../component-library/hooks';

// Internal dependencies.
import styleSheet from './Skeleton.styles';
import { SkeletonProps } from './Skeleton.types';
import { isE2E } from '../../../util/test/utils';

const Skeleton: React.FC<SkeletonProps> = ({
  height,
  width,
  children,
  hideChildren = false,
  style,
  childrenWrapperProps = {},
  animatedViewProps = {},
  ...props
}) => {
  const opacityAnim = useRef(new Animated.Value(0.2)).current;
  const { styles } = useStyles(styleSheet, {
    height,
    width,
    style,
  });

  const startAnimation = () => {
    Animated.sequence([
      Animated.timing(opacityAnim, {
        toValue: 0.1,
        duration: 700,
        useNativeDriver: true,
        isInteraction: false,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0.2,
        duration: 700,
        useNativeDriver: true,
        isInteraction: false,
      }),
    ]).start((finished) => {
      if (finished) {
        startAnimation();
      }
    });
  };

  useEffect(() => {
    // Only start animation if no children are present or if children should be hidden
    if (!isE2E && (!children || hideChildren)) {
      startAnimation();
    }

    return () => {
      // Cleanup animation when component unmounts
      opacityAnim.stopAnimation();
    };
  }, [children, hideChildren]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <View style={styles.base} {...props}>
      {/* Animated background always present */}
      <Animated.View
        style={[styles.background, { opacity: opacityAnim }]}
        pointerEvents="none"
        {...animatedViewProps}
      />

      {children && (
        <View
          style={[
            styles.childrenContainer,
            hideChildren ? styles.hideChildren : undefined,
          ]}
          {...childrenWrapperProps}
        >
          {children}
        </View>
      )}
    </View>
  );
};

export default Skeleton;
