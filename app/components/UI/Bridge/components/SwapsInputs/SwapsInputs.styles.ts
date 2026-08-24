import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../util/theme/models';

export const createStyles = (params: { theme: Theme }) => {
  const { theme } = params;
  return StyleSheet.create({
    inputsContainer: {
      paddingVertical: 12,
      paddingHorizontal: 16,
    },
    inputCardsWrapper: {
      position: 'relative',
    },
    tokenCard: {
      backgroundColor: theme.colors.background.section,
      borderRadius: 16,
      paddingHorizontal: 12,
      paddingVertical: 24,
    },
    compactDestTokenCard: {
      paddingVertical: 12,
    },
  });
};
