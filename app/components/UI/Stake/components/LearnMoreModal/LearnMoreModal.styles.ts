import { StyleSheet } from 'react-native';

const createLearnMoreModalStyles = () =>
  StyleSheet.create({
    container: {
      paddingHorizontal: 24,
      paddingTop: 24,
    },
    imageContainer: {
      alignItems: 'center',
      paddingBottom: 16,
    },
    bannerImage: {
      width: '100%',
      height: 200,
      borderRadius: 12,
    },
    textContainer: {
      paddingVertical: 8,
    },
    buttonContainer: {
      flexDirection: 'row',
      gap: 16,
      paddingHorizontal: 16,
      paddingTop: 16,
    },
    button: {
      flex: 1,
    },
    italicText: {
      fontStyle: 'italic',
    },
  });

export default createLearnMoreModalStyles;
