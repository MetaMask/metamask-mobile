import { StyleSheet } from 'react-native';

// 620 / 400 is the native size of the MainTilt artboard in card_tilt_v1.2.riv.
const styles = StyleSheet.create({
  riveContainer: {
    width: 150,
    aspectRatio: 620 / 400,
  },
  media: {
    width: '100%',
    height: '100%',
  },
  staticImage: {
    width: 150,
    height: 95,
    borderRadius: 5,
  },
});

export default styles;
