/* eslint-disable import/prefer-default-export */
import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  stickyButton: { alignSelf: 'center', width: '100%', zIndex: 1, bottom: 50 },
  icon: { marginHorizontal: 20 },
});

export default styles;
