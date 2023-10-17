import { StyleSheet } from 'react-native';
import { colors as importedColors } from '../../../styles/common';

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: importedColors.black,
  },
  preview: {
    flex: 1,
  },
  innerView: {
    flex: 1,
  },
  closeIcon: {
    marginTop: 20,
    marginRight: 20,
    width: 40,
    alignSelf: 'flex-end',
  },
  frame: {
    width: 250,
    height: 250,
    alignSelf: 'center',
    justifyContent: 'center',
    marginTop: 100,
    opacity: 0.5,
  },
  text: {
    flex: 1,
    fontSize: 17,
    color: importedColors.white,
    textAlign: 'center',
    justifyContent: 'center',
    marginTop: 100,
  },
});
