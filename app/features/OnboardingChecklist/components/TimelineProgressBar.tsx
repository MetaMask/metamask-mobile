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
        {/* The Line (extends through the whole segment) */}
        {index < totalSteps - 1 && (
          <View 
            style={[
              styles.line,
              { 
                backgroundColor: isCompleted ? MM_ORANGE : '#D1D5DB', // Grey for incomplete
                borderStyle: isCompleted ? 'solid' : 'dashed',
                borderWidth: isCompleted ? 0 : 1,
                borderColor: isCompleted ? 'transparent' : '#D1D5DB'
              },
              isCompleted && styles.glow
            ]} 
          />
        )}

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
                  backgroundColor: MM_ORANGE,
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
    position: 'absolute',
    top: 24, // Matches the center of the 48px high icon
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
  },
  line: {
    position: 'absolute',
    top: 24, // Start from the dot center
    bottom: -24, // End at the next dot center (approx)
    width: 2,
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
