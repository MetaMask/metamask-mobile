import { StyleSheet } from 'react-native';

interface PaymentSelectionModalStyleSheetVars {
  screenHeight: number;
}

const styleSheet = (params: { vars: PaymentSelectionModalStyleSheetVars }) => {
  const { vars } = params;
  const { screenHeight } = vars;

  return StyleSheet.create({
    list: {
      maxHeight: screenHeight * 0.5,
    },
  });
};

export default styleSheet;
