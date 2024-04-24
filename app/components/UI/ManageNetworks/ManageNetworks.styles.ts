import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  setting: {
    marginVertical: 16,
  },
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  description: {
    fontSize: 14,
    textAlign: 'left',
    marginTop: 10,
    lineHeight: 22,
    fontWeight: '400',
  },
  networkPicker: {
    marginVertical: 16,
    alignSelf: 'flex-start',
  },
});

export default styles;
