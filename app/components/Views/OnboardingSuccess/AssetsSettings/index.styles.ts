import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  backButton: {
    padding: 10,
  },
  setting: {
    marginTop: 32,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    flex: 1,
  },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 16,
  },
  switch: {
    alignSelf: 'flex-start',
  },
  desc: {
    marginTop: 8,
  },
});

export default styles;
