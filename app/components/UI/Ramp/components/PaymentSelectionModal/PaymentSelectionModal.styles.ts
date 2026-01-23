import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../../../util/theme/models';

interface PaymentSelectionModalStyleSheetVars {
  screenHeight: number;
}

const styleSheet = (params: {
  theme: Theme;
  vars: PaymentSelectionModalStyleSheetVars;
}) => {
  const { vars } = params;
  const { screenHeight } = vars;

  return StyleSheet.create({
    list: {
      maxHeight: screenHeight * 0.5,
    },
    headerContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    subtitleText: {
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 16,
    },
  });
};

export default styleSheet;
