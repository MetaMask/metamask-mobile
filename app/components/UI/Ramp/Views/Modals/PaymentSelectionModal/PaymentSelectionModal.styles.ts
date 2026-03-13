import { StyleSheet } from 'react-native';

interface PaymentSelectionModalStyleSheetVars {
  screenHeight: number;
}

const styleSheet = (params: { vars: PaymentSelectionModalStyleSheetVars }) => {
  const { vars } = params;
  const { screenHeight } = vars;

  return StyleSheet.create({
    list: {
      minHeight: 0,
      flexShrink: 1,
      flexGrow: 0,
    },
    containerOuter: {
      maxHeight: screenHeight * 0.4,
      overflow: 'hidden',
    },
    paymentPanelContent: {
      minHeight: 0,
      flexShrink: 1,
    },
    alertContainer: {
      padding: 16,
      flexGrow: 1,
    },
    footer: {
      paddingHorizontal: 16,
      paddingVertical: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
};

export default styleSheet;
