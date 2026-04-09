import { StyleSheet } from 'react-native';

interface ProviderSelectionModalStyleSheetVars {
  screenHeight: number;
}

const styleSheet = (params: { vars: ProviderSelectionModalStyleSheetVars }) => {
  const { vars } = params;
  const { screenHeight } = vars;

  return StyleSheet.create({
    container: {
      height: screenHeight * 0.4,
      minHeight: 0,
    },
  });
};

export default styleSheet;
