import { StyleSheet } from 'react-native';

interface PaymentSelectionModalStyleSheetVars {
  screenHeight: number;
}

const styleSheet = (params: { vars: PaymentSelectionModalStyleSheetVars }) => {
  const { vars } = params;
  const { screenHeight } = vars;

  return StyleSheet.create({
    list: {
      flex: 1,
      minHeight: 0,
    },
    containerOuter: {
      height: screenHeight * 0.4,
      overflow: 'hidden',
    },
    paymentPanelContent: {
      flex: 1,
      minHeight: 0,
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
