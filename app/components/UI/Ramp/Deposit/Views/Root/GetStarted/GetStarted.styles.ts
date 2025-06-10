import { Dimensions, StyleSheet } from 'react-native';
import { Theme } from '../../../../../../../util/theme/models';

const screenWidth = Dimensions.get('window').width;

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;

  return StyleSheet.create({
    title: {
      textAlign: 'center',
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
      marginBottom: 16,
      paddingHorizontal: 16,
      flexDirection: 'row',
    },
    bulletPointContent: {
      flex: 1,
      paddingLeft: 12,
    },
    bulletPointTitle: {
      fontWeight: 'bold',
    },
    bulletPointDescription: {
      fontSize: 14,
      lineHeight: 20,
      opacity: 0.8,
    },
    checkIcon: {
      color: theme.colors.success.default,
    },
  });
};

export default styleSheet;
