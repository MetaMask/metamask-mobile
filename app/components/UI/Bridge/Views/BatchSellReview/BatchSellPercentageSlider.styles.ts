import { StyleSheet } from 'react-native';
import type { Theme } from '../../../../../util/theme/models';

const HANDLE_SIZE = 32;
const TRACK_HEIGHT = 8;
const MARKER_SIZE = 4;

const styleSheet = (params: { theme: Theme }) => {
  const { colors } = params.theme;

  return StyleSheet.create({
    container: { width: '100%', paddingVertical: 8 },
    trackContainer: { position: 'relative' },
    gestureArea: {
      height: HANDLE_SIZE,
      width: '100%',
      justifyContent: 'center',
    },
    track: {
      position: 'absolute',
      left: 0,
      right: 0,
      height: TRACK_HEIGHT,
      borderRadius: TRACK_HEIGHT / 2,
      backgroundColor: colors.border.muted,
    },
    progress: {
      position: 'absolute',
      left: 0,
      height: TRACK_HEIGHT,
      borderRadius: TRACK_HEIGHT / 2,
      backgroundColor: colors.icon.alternative,
    },
    thumb: {
      position: 'absolute',
      top: 0,
      width: HANDLE_SIZE,
      height: HANDLE_SIZE,
      borderRadius: HANDLE_SIZE / 2,
      backgroundColor: colors.icon.defaultPressed,
      elevation: 4,
    },
    dot: {
      position: 'absolute',
      width: MARKER_SIZE,
      height: MARKER_SIZE,
      borderRadius: MARKER_SIZE / 2,
      backgroundColor: colors.text.muted,
      top: (HANDLE_SIZE - MARKER_SIZE) / 2,
      transform: [{ translateX: -MARKER_SIZE / 2 }],
      zIndex: -1,
    },
    dot0: { left: '2%' },
    dot25: { left: '25%' },
    dot50: { left: '50%' },
    dot75: { left: '75%' },
    dot100: { left: '98%' },
  });
};

export default styleSheet;
