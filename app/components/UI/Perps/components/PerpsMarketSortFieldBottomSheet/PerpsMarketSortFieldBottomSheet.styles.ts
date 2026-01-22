import { Theme } from '../../../../../util/theme/models';
import { StyleSheet } from 'react-native';

export const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;

  return StyleSheet.create({
    optionsList: {
      paddingBottom: 32,
    },
    optionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 16,
      paddingHorizontal: 16,
      minHeight: 56,
    },
    optionRowSelected: {
      backgroundColor: theme.colors.background.muted,
    },
    arrowContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    applyButton: {
      height: 48,
      paddingVertical: 4,
      paddingHorizontal: 16,
      justifyContent: 'center',
      alignItems: 'center',
      flexShrink: 0,
      alignSelf: 'stretch',
      borderRadius: 12,
      backgroundColor: theme.colors.icon.default,
      marginHorizontal: 16,
      marginTop: 16,
      marginBottom: 32,
    },
    applyButtonText: {
      color: theme.colors.icon.inverse,
      textAlign: 'center',
      fontSize: 16,
      fontStyle: 'normal',
      fontWeight: '500',
      lineHeight: undefined, // normal
    },
  });
};
