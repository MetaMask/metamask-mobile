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
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    flex: 1,
  },
  switchElement: {
    marginLeft: 16,
  },
  switch: {
    alignSelf: 'flex-start',
  },
  halfSetting: {
    marginTop: 16,
  },
  desc: {
    marginTop: 8,
  },
});

export default styles;
