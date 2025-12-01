import { StyleSheet } from 'react-native';
import { colors as importedColors } from '../../../../../styles/common';
import { Theme } from '../../../../../util/theme/models';

export const selectorStyleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return StyleSheet.create({
    intervalSelector: {
      marginTop: 24,
    },
    intervalSelectorContent: {
      flexDirection: 'row',
      alignSelf: 'center',
      paddingHorizontal: 8,
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
