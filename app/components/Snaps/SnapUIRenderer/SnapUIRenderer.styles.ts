import { Dimensions, StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  root: {
    flexGrow: 1,
    minHeight: Dimensions.get('window').height * 0.5,
  },
});

export default styles;
