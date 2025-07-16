import { Dimensions, StyleSheet } from 'react-native';
import { Theme } from '../../../../../../util/theme/models';

const screenWidth = Dimensions.get('window').width;

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;

  return StyleSheet.create({
    image: {
      width: screenWidth,
      height: screenWidth * 0.75,
      alignSelf: 'center',
    },
    title: {
      marginTop: 24,
      fontWeight: 'bold',
      fontSize: 24,
      textAlign: 'center',
    },
    paragraph: {
      marginTop: 16,
      fontSize: 16,
      textAlign: 'center',
    },
    footerContent: {
      gap: 8,
    },
  });
};

export default styleSheet; 