import { Theme } from '../../../../../util/theme/models';
import { StyleSheet } from 'react-native';

export const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;

  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
      paddingVertical: 12,
      paddingHorizontal: 16,
      gap: 4,
    },
    periodButton: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
      marginHorizontal: 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    periodButtonSelected: {
      backgroundColor: theme.colors.background.muted,
    },
    periodButtonUnselected: {
      backgroundColor: theme.colors.background.default,
    },
    periodButtonPressed: {
      opacity: 0.7,
    },
    periodText: {
      fontSize: 14,
      fontWeight: '400',
    },
    periodTextSelected: {
      color: theme.colors.text.default,
    },
    periodTextUnselected: {
      color: theme.colors.text.muted,
    },
    moreButton: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
      marginHorizontal: 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    moreButtonSelected: {
      backgroundColor: theme.colors.background.muted,
    },
    moreButtonUnselected: {
      backgroundColor: theme.colors.background.default,
    },
    moreButtonPressed: {
      opacity: 0.7,
    },
    moreText: {
      fontSize: 14,
      fontWeight: '400',
    },
    moreTextSelected: {
      color: theme.colors.text.default,
    },
    moreTextUnselected: {
      color: theme.colors.text.muted,
    },
  });
};
