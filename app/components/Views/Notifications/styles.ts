import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  stickyButton: {
    width: 'auto',
    left: 20,
    right: 20,
    bottom: 40,
    position: 'absolute',
  },
  icon: { marginHorizontal: 16 },
  title: { alignSelf: 'center' },
});

export default styles;
