import { StyleSheet } from 'react-native';
import { colors as importedColors } from '../../../../../../styles/common';

export const styleSheet = () =>
  StyleSheet.create({
    container: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: -999, // Far below everything including tooltip
      pointerEvents: 'none',
    },
    line: {
      position: 'absolute',
      left: 0,
      height: 1,
      zIndex: -999, // Far below everything
      opacity: 0.8,
      pointerEvents: 'none',
      backgroundColor: importedColors.transparent,
    },
  });
