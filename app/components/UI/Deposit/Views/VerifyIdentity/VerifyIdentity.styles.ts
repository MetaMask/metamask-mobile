import { Dimensions, StyleSheet } from 'react-native';
import { Theme } from '../../../../../util/theme/models';

const screenWidth = Dimensions.get('window').width;

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;

  return StyleSheet.create({
    image: {
      width: screenWidth,
      height: screenWidth * 0.75,
      alignSelf: 'center',
    },
    description: {
      marginTop: 16,
    },
    privacyPolicyLink: {
      marginTop: 8,
      fontSize: 14,
      color: theme.colors.primary.default,
    },
  });
};

export default styleSheet;
