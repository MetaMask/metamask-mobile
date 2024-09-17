import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  description: {
    fontSize: 14,
    textAlign: 'left',
    marginTop: 10,
    lineHeight: 22,
    fontWeight: '400',
  },
  setting: {
    marginTop: 32,
  },
  toggle: {
    flexDirection: 'row',
    marginLeft: 16,
  },
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  networkPicker: {
    marginVertical: 16,
    alignSelf: 'flex-start',
  },
  backButton: {
    padding: 10,
  },
});

export default styles;
