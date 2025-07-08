import { StyleSheet } from 'react-native';
import { Theme } from '../../../util/theme/models';

interface AccountSelectorStyleSheetVars {
  screenHeight: number;
}
const styleSheet = (params: {
  theme: Theme;
  vars: AccountSelectorStyleSheetVars;
}) => {
  const { vars, theme } = params;
  const { colors } = theme;

  const { screenHeight } = vars;

  return StyleSheet.create({
    sheet: {
      marginVertical: 16,
      marginHorizontal: 16,
    },
    bottomSheetContent: {
      backgroundColor: colors.background.default,
      display: 'flex',
      maxHeight: screenHeight * 0.9,
    },
  });
};

export default styleSheet;
