import { StyleSheet } from 'react-native';

interface PaymentSelectionModalStyleSheetVars {
  screenHeight: number;
  screenWidth: number;
}

const styleSheet = (params: { vars: PaymentSelectionModalStyleSheetVars }) => {
  const { vars } = params;
  const { screenHeight, screenWidth } = vars;

  return StyleSheet.create({
    list: {
      maxHeight: screenHeight * 0.5,
    },
    overlay: {
      position: 'absolute',
      width: screenWidth,
      top: 0,
      left: 0,
    },
  });
};

export default styleSheet;
