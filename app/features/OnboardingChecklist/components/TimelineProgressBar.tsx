import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { Box } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

const MM_ORANGE = '#F6851B';

interface TimelineProgressBarProps {
  completedCount: number; // 0 to 3
  totalSteps: number;
}

const TimelineProgressBar = ({ completedCount, totalSteps }: TimelineProgressBarProps) => {
  const tw = useTailwind();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.5,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnim]);

  const renderSegment = (index: number) => {
    const isCompleted = index < completedCount;
    const isCurrent = index === completedCount;
    
    return (
      <View key={index} style={styles.segmentContainer}>
        {/* The Dot */}
        <Box 
          style={[
            styles.dot, 
            { backgroundColor: isCompleted ? MM_ORANGE : '#D1D5DB' },
            isCurrent && { backgroundColor: MM_ORANGE }
          ]}
        >
          {isCurrent && (
            <Animated.View 
              style={[
                styles.pulse,
                { 
                  borderColor: MM_ORANGE,
                  transform: [{ scale: pulseAnim }],
                  opacity: pulseAnim.interpolate({
                    inputRange: [1, 1.5],
                    outputRange: [0.6, 0]
                  })
                }
              ]} 
            />
          )}
        </Box>

        {/* The Line (don't render for last item) */}
        {index < totalSteps - 1 && (
          <View 
            style={[
              styles.line,
              { 
                backgroundColor: isCompleted ? MM_ORANGE : '#E5E7EB',
                borderStyle: isCompleted ? 'solid' : 'dashed',
                borderWidth: isCompleted ? 0 : 1,
                borderColor: isCompleted ? 'transparent' : '#D1D5DB'
              },
              isCompleted && styles.glow
            ]} 
          />
        )}
      </View>
    );
  };

  return (
    <Box twClassName="w-6 items-center">
      {Array.from({ length: totalSteps }).map((_, i) => renderSegment(i))}
    </Box>
  );
};

const styles = StyleSheet.create({
  segmentContainer: {
    alignItems: 'center',
    flex: 1,
    minHeight: 80,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    zIndex: 2,
  },
  pulse: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 4,
  },
  line: {
    flex: 1,
    width: 2,
    marginVertical: 4,
    zIndex: 1,
  },
  glow: {
    shadowColor: MM_ORANGE,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 5,
  }
});

export default TimelineProgressBar;
