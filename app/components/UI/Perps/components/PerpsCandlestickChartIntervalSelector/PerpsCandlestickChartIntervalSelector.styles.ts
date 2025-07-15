import { StyleSheet } from 'react-native';
import { colors as importedColors } from '../../../../../styles/common';
import { Theme } from '../../../../../util/theme/models';

export const selectorStyleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return StyleSheet.create({
    intervalSelector: {
      flexDirection: 'row',
      alignSelf: 'center',
      marginTop: 24,
    },
    intervalTab: {
      paddingVertical: 6,
      borderRadius: 6,
      padding: 10,
      alignItems: 'center',
    },
    intervalTabActive: {
      backgroundColor: colors.primary.muted,
    },
    intervalTabInactive: {
      backgroundColor: importedColors.transparent,
    },
    intervalTabText: {
      fontSize: 12,
    },
    intervalTabTextActive: {
      color: colors.primary.inverse,
    },
    intervalTabTextInactive: {
      color: colors.text.muted,
    },
  });
};
