import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../../../util/theme/models';

interface TokenSelectorModalStyleSheetVars {
  screenHeight: number;
}
const styleSheet = (params: {
  theme: Theme;
  vars: TokenSelectorModalStyleSheetVars;
}) => {
  const { vars } = params;
  const { screenHeight } = vars;

  return StyleSheet.create({
    list: {
      height: screenHeight * 0.4,
    },
    searchContainer: {
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    errorContainer: {
      padding: 24,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 120,
    },
    errorText: {
      textAlign: 'center',
      marginTop: 16,
    },
  });
};

export default styleSheet;
