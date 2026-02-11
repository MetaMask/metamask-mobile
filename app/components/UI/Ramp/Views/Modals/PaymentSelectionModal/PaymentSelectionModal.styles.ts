import { StyleSheet } from 'react-native';

interface PaymentSelectionModalStyleSheetVars {
  screenHeight: number;
  screenWidth: number;
}

const styleSheet = (params: { vars: PaymentSelectionModalStyleSheetVars }) => {
  const { vars } = params;
  const { screenHeight } = vars;

  return StyleSheet.create({
    list: {
      flex: 1,
    },
    containerOuter: {
      height: screenHeight * 0.6,
      overflow: 'hidden',
    },
    containerInner: {
      flexDirection: 'row',
      width: '200%',
      height: '100%',
    },
    panel: {
      width: '50%',
      height: '100%',
    },
    paymentPanelContent: {
      flex: 1,
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
