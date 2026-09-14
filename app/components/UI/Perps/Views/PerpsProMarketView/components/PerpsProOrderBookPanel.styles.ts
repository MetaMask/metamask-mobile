import { StyleSheet } from 'react-native';

const styleSheet = StyleSheet.create({
  depthBar: {
    position: 'absolute',
    top: 0,
    bottom: 0,
  },
  // Bars fill away from the outer edge of the screen, so they anchor to
  // whichever side the column is pinned to.
  depthBarFromLeft: {
    left: 0,
  },
  depthBarFromRight: {
    right: 0,
  },
  interactiveRow: {
    height: 32,
  },
  viewToggleButton: {
    height: 32,
    justifyContent: 'center',
  },
  viewToggleBar: {
    height: 2,
    borderRadius: 1,
  },
  ratioBar: {
    height: 4,
    borderRadius: 999,
  },
});

export default styleSheet;
