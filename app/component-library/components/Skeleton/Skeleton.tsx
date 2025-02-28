import React, { useEffect, useRef } from 'react';
import { Animated, View, StyleSheet, ViewStyle } from 'react-native';

import { useTheme } from '../../../util/theme';

import { SkeletonProps } from './Skeleton.types';

const Skeleton: React.FC<SkeletonProps> = ({
  height,
  width,
  children,
  hideChildren,
  style,
  childrenWrapperProps,
  animatedViewProps,
  ...props
}) => {
  const { colors } = useTheme();
  const opacityAnim = useRef(new Animated.Value(0.2)).current;

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
    if (!children || hideChildren) {
      startAnimation();
    }

    return () => {
      // Cleanup animation when component unmounts
      opacityAnim.stopAnimation();
    };
  }, [children, hideChildren]); // eslint-disable-line react-hooks/exhaustive-deps

  const styles = StyleSheet.create({
    container: {
      borderRadius: 4,
      overflow: 'hidden',
      // Only apply explicit height/width if provided
      ...(height !== undefined && { height }),
      ...(width !== undefined && { width }),
      ...(style as object),
    } as ViewStyle,
    background: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: colors.icon.alternative,
      borderRadius: 4,
    } as ViewStyle,
    hideChildren: {
      opacity: 0,
    },
    childrenContainer: {
      position: 'relative',
      zIndex: 1,
    },
  });

  return (
    <View style={[styles.container]} {...props}>
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
