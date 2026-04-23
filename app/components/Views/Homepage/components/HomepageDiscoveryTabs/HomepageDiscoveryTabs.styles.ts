import { StyleSheet } from 'react-native';
import type { Theme } from '../../../../../util/theme/models';

const styleSheet = (_params: { theme: Theme }) =>
  StyleSheet.create({
    flex: {
      flex: 1,
    },
    gradient: {
      position: 'absolute',
      left: 0,
      right: 0,
      zIndex: 1,
      pointerEvents: 'none',
    },
    gradientFill: {
      flex: 1,
    },
  });

export default styleSheet;
