import { Dimensions, StyleSheet } from 'react-native';
import { Theme } from '../../../../../../util/theme/models';

const screenWidth = Dimensions.get('window').width;

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;

  return StyleSheet.create({
    title: {
      marginTop: 16,
      fontWeight: 'bold',
    },
    image: {
      width: screenWidth * 0.65,
      height: screenWidth * 0.49,
      alignSelf: 'center',
      marginVertical: 16,
    },
    description: {
      marginTop: 24,
    },
    descriptionCompact: {
      marginTop: 12,
    },
    privacyPolicyLink: {
      marginTop: 8,
      color: theme.colors.primary.default,
    },
    footerContent: {
      gap: 8,
    },
    agreementText: {
      marginTop: 24,
    },
    linkText: {
      textDecorationLine: 'underline',
    },
    scrollContainer: {
      flexGrow: 1,
    },
  });
};

export default styleSheet;
