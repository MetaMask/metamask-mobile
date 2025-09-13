import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../../../util/theme/models';

interface PaymentSelectorModalStyleSheetVars {
  screenHeight: number;
}
const styleSheet = (params: {
  theme: Theme;
  vars: PaymentSelectorModalStyleSheetVars;
}) => {
  const { vars, theme } = params;
  const { screenHeight } = vars;

  return StyleSheet.create({
    list: {
      maxHeight: screenHeight * 0.4,
    },
    iconContainer: {
      width: 32,
      height: 32,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.primary.muted,
      borderRadius: 8,
    },
    errorContainer: {
      padding: 24,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 120,
    },
    errorText: {
      textAlign: 'center',
      marginTop: 16,
    },
  });
};

export default styleSheet;
