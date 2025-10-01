import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../../util/theme/models';

interface PaymentMethodSelectorModalStyleSheetVars {
  screenHeight: number;
}

const styleSheet = (params: {
  theme: Theme;
  vars: PaymentMethodSelectorModalStyleSheetVars;
}) => {
  const { theme, vars } = params;
  const { colors } = theme;
  const { screenHeight } = vars;

  return StyleSheet.create({
    scrollView: {
      maxHeight: screenHeight * 0.8,
    },
    content: {
      paddingHorizontal: 16,
      paddingBottom: 16,
    },
    paymentMethodRow: {
      marginVertical: 8,
    },
    disclaimerContainer: {
      marginTop: 16,
      paddingHorizontal: 8,
    },
    disclaimer: {
      textAlign: 'center',
      color: colors.text.alternative,
    },
  });
};

export default styleSheet;
