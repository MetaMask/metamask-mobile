import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../util/theme/models';

const styleSheet = (params: {
  theme: Theme;
  vars: { isFullScreenConfirmation: boolean; disableSafeArea: boolean };
}) => {
  const { theme, vars } = params;

  return StyleSheet.create({
    bottomSheetDialogSheet: {
      backgroundColor: theme.colors.background.alternative,
    },
    confirmContainer: {
      display: 'flex',
      maxHeight: '100%',
    },
    flatContainer: {
      flex: 1,
      zIndex: 9999,
      backgroundColor: theme.colors.background.alternative,
      justifyContent: 'space-between',
    },
    scrollView: {
      paddingHorizontal: vars.disableSafeArea ? 0 : 16,
    },
    scrollViewContent: {
      flex: vars.isFullScreenConfirmation ? 1 : undefined,
    },
    spinnerContainer: {
      backgroundColor: theme.colors.background.alternative,
      width: '100%',
      height: '100%',
      justifyContent: 'center',
      alignItems: 'center',
    },
  });
};

export default styleSheet;
