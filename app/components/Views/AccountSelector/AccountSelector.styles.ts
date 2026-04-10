import { Platform, StyleSheet } from 'react-native';
import { Theme } from '../../../util/theme/models';
import { colors as importedColors } from '../../../styles/common';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return StyleSheet.create({
    sheet: {
      paddingHorizontal: 16,
      paddingTop: 24,
      paddingBottom: Platform.OS === 'android' ? 0 : 16,
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: colors.overlay.default,
    },
    keyboardAvoidingView: {
      flex: 1,
      backgroundColor: importedColors.transparent,
    },
    container: {
      flex: 1,
      backgroundColor: colors.background.default,
    },
    addWalletModalContainer: {
      flex: 1,
      backgroundColor: colors.background.default,
    },
    accountSelectorFooter: {
      flexDirection: 'row',
      paddingVertical: 4,
      paddingHorizontal: 8,
    },
    footerButton: {
      flex: 1,
    },
    footerButtonSubsequent: {
      flex: 1,
      marginLeft: 16,
    },
  });
};

export default styleSheet;
