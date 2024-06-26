import { StyleSheet } from 'react-native';

// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      paddingHorizontal: 16,
      backgroundColor: colors.background,
    },
    description: {
      marginVertical: 8,
    },
    text: {
      color: colors.text.alternative,
    },
    contractSection: {
      marginBottom: 8,
    },
    sectionContainer: {
      marginVertical: 8,
    },
    title: {
      marginVertical: 8,
    },
  });

export default createStyles;
