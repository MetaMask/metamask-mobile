import { Platform, StyleSheet } from 'react-native';
import type { Theme } from '../../../../../util/theme/models';

export const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background.default,
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
      marginBottom: 8,
      fontFamily:
        Platform.OS === 'android' ? 'MM Sans Regular' : 'MMSans-Regular',
    },
    bodyText: {
      marginBottom: 32,
      textAlign: 'center',
    },
    continueButton: {
      alignSelf: 'stretch',
      marginHorizontal: 32,
      marginBottom: 24,
    },
  });
};
