import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../util/theme/models';

const styleSheet = (params: {
  theme: Theme;
  vars: {
    isFullScreenConfirmation: boolean;
    disableSafeArea?: boolean;
    useDefaultBackground?: boolean;
    disableHorizontalPadding?: boolean;
  };
}) => {
  const { theme, vars } = params;
  const backgroundColor = vars.useDefaultBackground
    ? theme.colors.background.default
    : theme.colors.background.alternative;

  return StyleSheet.create({
    bottomSheetDialogSheet: {
      backgroundColor,
    },
    confirmContainer: {
      display: 'flex',
      maxHeight: '100%',
    },
    flatContainer: {
      flex: 1,
      zIndex: 9999,
      backgroundColor,
      justifyContent: 'space-between',
    },
    scrollView: {
      paddingHorizontal:
        vars.disableSafeArea === true || vars.disableHorizontalPadding === true
          ? 0
          : 16,
    },
    scrollViewContent: {
      flex: vars.isFullScreenConfirmation ? 1 : undefined,
    },
    spinnerContainer: {
      backgroundColor,
      width: '100%',
      height: '100%',
      justifyContent: 'center',
      alignItems: 'center',
    },
  });
};

export default styleSheet;
