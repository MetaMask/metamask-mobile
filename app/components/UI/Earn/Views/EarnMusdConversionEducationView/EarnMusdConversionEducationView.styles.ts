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
      alignItems: 'center',
    },
    heading: {
      marginBottom: 8,
      fontFamily:
        Platform.OS === 'android' ? 'MM Sans Regular' : 'MMSans-Regular',
    },
    bodyText: {
      textAlign: 'center',
    },
    buttonContainer: {
      flex: 1,
      justifyContent: 'flex-end',
      paddingHorizontal: 16,
      paddingBottom: 16,
    },
    continueButton: {
      alignSelf: 'stretch',
    },
  });
};
