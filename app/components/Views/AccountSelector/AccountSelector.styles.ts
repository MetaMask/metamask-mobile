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
      marginVertical: 32,
      marginHorizontal: 16,
    },
    stickyButton: {
      position: 'absolute',
      bottom: 0,
      width: '100%',
      backgroundColor: colors.background.default,
    },
    bottomSheetContent: {
      backgroundColor: colors.background.default,
      display: 'flex',
      maxHeight: screenHeight * 0.9,
    },
    accountListContainer: {
      // flex: 1,
      marginVertical: 16,
    },
  });
};

export default styleSheet;
