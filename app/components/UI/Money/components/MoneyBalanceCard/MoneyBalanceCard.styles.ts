import { StyleSheet } from 'react-native';

export const CARD_RADIUS = 12;

const cardContent = {
  minHeight: 82,
  paddingHorizontal: 16,
  paddingVertical: 16,
} as const;

const styleSheet = () =>
  StyleSheet.create({
    container: {
      ...cardContent,
      borderRadius: CARD_RADIUS,
      marginHorizontal: 16,
    },
    glassContainer: {
      borderRadius: CARD_RADIUS,
      marginHorizontal: 16,
    },
    glassContent: cardContent,
  });

export default styleSheet;
