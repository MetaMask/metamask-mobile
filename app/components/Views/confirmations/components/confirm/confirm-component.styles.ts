import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../util/theme/models';

const styleSheet = (params: {
  theme: Theme;
  vars: {
    isFullScreenConfirmation: boolean;
    disableSafeArea?: boolean;
    expandToSheetHeight?: boolean;
  };
}) => {
  const { theme, vars } = params;

  return StyleSheet.create({
    confirmContainer: {
      display: 'flex',
      maxHeight: '100%',
      ...(vars.expandToSheetHeight ? { flexGrow: 1, flexShrink: 1 } : {}),
    },
    flatContainer: {
      flex: 1,
      zIndex: 9999,
      backgroundColor: theme.colors.background.default,
      justifyContent: 'space-between',
    },
    scrollView: {
      paddingHorizontal: vars.disableSafeArea === true ? 0 : 16,
    },
    scrollViewContent: {
      flexGrow:
        vars.isFullScreenConfirmation || vars.expandToSheetHeight
          ? 1
          : undefined,
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
