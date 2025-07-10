import { Dimensions, StyleSheet } from 'react-native';
import { Theme } from '../../../../../../../util/theme/models';

const screenWidth = Dimensions.get('window').width;

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;

  return StyleSheet.create({
    title: {
      marginBottom: 16,
    },
    getStartedImageWrapper: {
      alignItems: 'center',
    },
    getStartedImage: {
      width: screenWidth,
      height: screenWidth * 0.75,
      alignSelf: 'center',
    },
    bulletPointContainer: {
      marginVertical: 8,
      flexDirection: 'row',
    },
    bulletPointContent: {
      flex: 1,
      marginLeft: 12,
    },
    bulletPointDescription: {
      fontSize: 14,
      lineHeight: 20,
      color: theme.colors.text.alternative,
    },
  });
};

export default styleSheet;
