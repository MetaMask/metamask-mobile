/* eslint-disable react/prop-types */
import React, { forwardRef, useEffect, useImperativeHandle } from 'react';
import { View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useStyles } from '../../hooks';
import styleSheet from './BottomSheet.styles';
import { BottomSheetProps, BottomSheetRef } from './BottomSheet.types';

const BottomSheet = forwardRef<BottomSheetRef, BottomSheetProps>(
  ({ style, children, ...props }, ref) => {
    const { styles } = useStyles(styleSheet, { style });
    const yOffset = useSharedValue(0);

    useEffect(() => {
      yOffset.value = withTiming(200, { duration: 2000 });
    }, []);

    useImperativeHandle(ref, () => ({
      show: () => {},
    }));

    const animatedSheet = useAnimatedStyle(() => ({
      transform: [{ translateY: yOffset.value }],
    }));

    return (
      <View style={styles.base} {...props}>
        <View style={styles.overlay} />
        <Animated.View style={[styles.sheet, animatedSheet]}>
          {children}
        </Animated.View>
      </View>
    );
  },
);

export default BottomSheet;
