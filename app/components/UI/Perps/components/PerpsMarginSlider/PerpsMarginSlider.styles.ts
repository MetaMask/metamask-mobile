import { StyleSheet } from 'react-native';
import type { Colors } from '../../../../../util/theme/models';

export const createStyles = (colors: Colors) =>
  StyleSheet.create({
    container: {
      alignItems: 'center',
      paddingVertical: 24,
      paddingHorizontal: 24,
    },
    sliderContainer: {
      width: 200,
      height: 8,
      position: 'relative',
      justifyContent: 'center',
    },
    sliderTrack: {
      width: '100%',
      height: 8,
      backgroundColor: colors.background.alternative,
      borderRadius: 4,
    },
    sliderHandle: {
      position: 'absolute',
      width: 60,
      height: 40,
      backgroundColor: colors.primary.default,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      top: -16, // Center vertically on track
    },
  });
