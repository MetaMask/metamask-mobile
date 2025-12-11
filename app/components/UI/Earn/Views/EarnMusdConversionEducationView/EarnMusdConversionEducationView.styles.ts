import { StyleSheet } from 'react-native';
import type { Theme } from '../../../../../util/theme/models';

export const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.brandColors.indigo100,
      gap: 24,
    },
    backgroundImage: {
      width: '100%',
      height: 438,
      resizeMode: 'cover',
    },
    content: {
      paddingHorizontal: 16,
      justifyContent: 'center',
      alignItems: 'center',
      paddingBottom: 24,
    },
    heading: {
      marginBottom: 16,
      fontFamily: 'MMSans-Regular',
      color: colors.accent04.dark,
      fontWeight: 500,
    },
    bodyText: {
      marginBottom: 32,
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
