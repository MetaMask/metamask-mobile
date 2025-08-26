import { Dimensions, StyleSheet } from 'react-native';
import { Theme } from '../../../../../../util/theme/models';

const screenWidth = Dimensions.get('window').width;

const styleSheet = (_params: { theme: Theme }) =>
  StyleSheet.create({
    image: {
      width: screenWidth,
      height: screenWidth * 0.75,
      alignSelf: 'center',
    },
    title: {
      marginTop: 24,
      fontWeight: 'bold',
    },
    paragraph: {
      marginTop: 16,
    },
    footerContent: {
      gap: 8,
    },
  });

export default styleSheet;
