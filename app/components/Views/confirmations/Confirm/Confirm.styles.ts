import { StyleSheet } from 'react-native';
import { Theme } from '../../../../util/theme/models';

const styleSheet = (params: {
  theme: Theme;
}) => {
  const { theme } = params;

  return StyleSheet.create({
    bottomSheetDialogSheet: {
      backgroundColor: theme.colors.background.alternative,
    },
    flatContainer: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 9999,
      backgroundColor: theme.colors.background.alternative,
      justifyContent: 'space-between',
      paddingHorizontal: 16,
    },
    scrollView: {
      paddingHorizontal: 16,
    },
  });
};

export default styleSheet;
