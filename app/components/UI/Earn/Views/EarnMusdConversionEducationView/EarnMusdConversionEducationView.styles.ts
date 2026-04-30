import { StyleSheet } from 'react-native';
import type { Theme } from '../../../../../util/theme/models';

export const styleSheet = (_params: { theme: Theme }) =>
  StyleSheet.create({
    container: {
      flex: 1,
      paddingTop: 40,
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
    },
    heading: {
      fontFamily: 'MMPoly-Regular',
      fontSize: 40,
      lineHeight: 40,
      paddingVertical: 16,
      textAlign: 'center',
    },
    bodyText: {
      textAlign: 'center',
      marginTop: 16,
      marginBottom: 24,
    },
    buttonsContainer: {
      marginHorizontal: 16,
      gap: 8,
      marginBottom: 16,
    },
    termsText: {
      textDecorationLine: 'underline',
    },
    featureTags: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: 4,
      marginTop: 16,
    },
    descriptionContainer: {
      paddingHorizontal: 16,
      alignItems: 'center',
    },
  });
