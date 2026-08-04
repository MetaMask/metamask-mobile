import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../util/theme/models';

const styleSheet = (params: {
  theme: Theme;
  vars: {
    isFullScreenConfirmation: boolean;
    disableSafeArea?: boolean;
  };
}) => {
  const { theme, vars } = params;

  return StyleSheet.create({
    bottomSheetDialogSheet: {
      backgroundColor: theme.colors.background.default,
    },
    confirmContainer: {
      display: 'flex',
      maxHeight: '100%',
    },
    flatContainer: {
      flex: 1,
      zIndex: 9999,
      backgroundColor: theme.colors.background.default,
      justifyContent: 'space-between',
    },
    scrollView: {
      // Content owns its 16px insets (MMDS KeyValueRow/HelpText/keyboard wrappers).
      paddingHorizontal: 0,
    },
    scrollViewContent: {
      flexGrow: vars.isFullScreenConfirmation ? 1 : undefined,
    },
    spinnerContainer: {
      backgroundColor: theme.colors.background.default,
      width: '100%',
      height: '100%',
      justifyContent: 'center',
      alignItems: 'center',
    },
  });
};

export default styleSheet;
