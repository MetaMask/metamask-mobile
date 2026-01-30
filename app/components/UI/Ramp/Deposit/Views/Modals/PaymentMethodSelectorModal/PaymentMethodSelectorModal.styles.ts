import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../../../util/theme/models';

interface PaymentSelectorModalStyleSheetVars {
  screenHeight: number;
}
const styleSheet = (params: {
  theme: Theme;
  vars: PaymentSelectorModalStyleSheetVars;
}) => {
  const { vars } = params;
  const { screenHeight } = vars;

  return StyleSheet.create({
    list: {
      maxHeight: screenHeight * 0.4,
    },
  });
};

export default styleSheet;
