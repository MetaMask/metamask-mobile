import { StyleSheet } from 'react-native';

const styleSheet = StyleSheet.create({
  depthBar: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
  },
  interactiveRow: {
    height: 32,
  },
  viewToggleButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
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
