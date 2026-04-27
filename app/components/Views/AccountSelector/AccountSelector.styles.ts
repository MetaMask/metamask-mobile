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
  });
};

export default styleSheet;
