import { StyleSheet, ViewStyle } from 'react-native';
import { Theme } from '../../../../util/theme/models';

interface StockBadgeStyleSheetVars {
  style?: ViewStyle;
}

const styleSheet = (params: {
  theme: Theme;
  vars: StockBadgeStyleSheetVars;
}) => {
  const {
    theme,
    vars: { style },
  } = params;
  return StyleSheet.create({
    stockBadgeWrapper: { flexDirection: 'row', ...style },
    stockBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.background.muted,
      borderRadius: 10,
      paddingHorizontal: 6,
      paddingVertical: 2,
      gap: 4,
    },
  });
};

export default styleSheet;
