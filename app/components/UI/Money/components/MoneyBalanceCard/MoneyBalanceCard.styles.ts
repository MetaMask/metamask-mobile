import { StyleSheet } from 'react-native';

const cardContent = {
  minHeight: 82,
  paddingHorizontal: 16,
  paddingVertical: 16,
} as const;

const styleSheet = () =>
  StyleSheet.create({
    container: {
      ...cardContent,
      borderRadius: 12,
      marginHorizontal: 16,
    },
    glassContainer: {
      marginHorizontal: 16,
    },
    glassContent: cardContent,
  });

export default styleSheet;
