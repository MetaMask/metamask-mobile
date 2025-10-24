import { StyleSheet } from 'react-native';
import type { Theme } from '../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return StyleSheet.create({
    container: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.muted,
    },
    sortRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 12,
    },
    sortChip: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border.default,
      backgroundColor: colors.background.default,
    },
    sortChipSelected: {
      borderColor: colors.primary.default,
      backgroundColor: colors.primary.muted,
    },
    directionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
    },
    directionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
  });
};

export default styleSheet;
