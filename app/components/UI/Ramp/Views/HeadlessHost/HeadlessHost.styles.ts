/* eslint-disable react-native/no-color-literals -- Phase 9.5: Host renders
 * no visible chrome. The container fills the screen so React Navigation has
 * a stack base for resets, but is fully transparent so the consumer's
 * loading UI renders underneath. There is no theme token for "transparent",
 * and the consumer paints the visible surface — the color literal is
 * intentional and does not need a theme equivalent. */
import { StyleSheet } from 'react-native';

const styleSheet = () =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: 'transparent',
    },
  });

export default styleSheet;
