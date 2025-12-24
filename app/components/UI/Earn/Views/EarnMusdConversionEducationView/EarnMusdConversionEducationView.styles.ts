import { StyleSheet } from 'react-native';
import type { Theme } from '../../../../../util/theme/models';

export const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.brandColors.indigo100,
    },
    imageContainer: {
      flex: 1,
      minHeight: 100,
    },
    backgroundImage: {
      width: '100%',
      height: '100%',
      resizeMode: 'contain',
    },
    content: {
      paddingHorizontal: 16,
      alignItems: 'center',
      paddingVertical: 24,
    },
    heading: {
      marginBottom: 16,
      fontFamily: 'MMSans-Regular',
      color: colors.accent04.dark,
      fontWeight: 500,
    },
    bodyText: {
      textAlign: 'center',
      color: colors.accent04.dark,
    },
    continueButton: {
      alignSelf: 'stretch',
      marginHorizontal: 32,
      marginBottom: 24,
    },
  });
};
