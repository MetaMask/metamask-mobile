import React from 'react';
import { StyleSheet, View } from 'react-native';
// eslint-disable-next-line import/no-namespace
import * as Animatable from 'react-native-animatable';

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
  },
});

interface Props {
  children: React.ReactNode;
  /**
   * The width of the children. Usually an image or an svg.
   */
  width: number;
}

/**
 * This component will do a perfect loop scroll animation on the children
 */
const LoopingScrollAnimation = ({ children, width }: Props) => (
  <Animatable.View
    animation={{
      0: { translateX: -width },
      1: { translateX: 0 },
    }}
    easing="linear"
    duration={22000}
    iterationCount="infinite"
    useNativeDriver
  >
    {/* Duplicate the children so we can position the animation to start at the beginning of the 2nd child */}
    {/* Then we end on the start of the 1st child to get a perfect loop */}
    <View style={styles.wrapper}>
      {children}
      {children}
    </View>
  </Animatable.View>
);

export default LoopingScrollAnimation;
