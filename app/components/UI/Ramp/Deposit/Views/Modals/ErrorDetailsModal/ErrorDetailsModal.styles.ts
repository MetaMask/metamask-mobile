import { Theme } from '@metamask/design-tokens';
import { StyleSheet } from 'react-native';

interface ErrorDetailsModalStyleSheetVars {
  screenHeight: number;
}

const styleSheet = (params: {
  theme: Theme;
  vars: ErrorDetailsModalStyleSheetVars;
}) => {
  const { vars } = params;
  const { screenHeight } = vars;

  return StyleSheet.create({
    headerContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    scrollView: {
      maxHeight: screenHeight * 0.8,
    },
    contentContainer: {
      paddingHorizontal: 16,
      paddingBottom: 16,
    },
    errorText: {
      lineHeight: 24,
    },
  });
};

export default styleSheet;
