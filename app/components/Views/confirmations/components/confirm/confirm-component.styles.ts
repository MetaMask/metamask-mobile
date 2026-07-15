import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../util/theme/models';
import { getElevatedSurfaceColor } from '../../../../../util/theme/themeUtils';

const styleSheet = (params: {
  theme: Theme;
  vars: {
    isFullScreenConfirmation: boolean;
    disableSafeArea?: boolean;
  };
}) => {
  const { theme, vars } = params;

  return StyleSheet.create({
    confirmContainer: {
      display: 'flex',
      maxHeight: '100%',
    },
    flatContainer: {
      flex: 1,
      zIndex: 9999,
      // TODO(Pure Black): Remove once MMDS ships pure-black-aware surface tokens.
      backgroundColor: getElevatedSurfaceColor(theme),
      justifyContent: 'space-between',
    },
    scrollView: {
      paddingHorizontal: vars.disableSafeArea === true ? 0 : 16,
    },
    scrollViewContent: {
      flexGrow: vars.isFullScreenConfirmation ? 1 : undefined,
    },
    spinnerContainer: {
      // TODO(Pure Black): Remove once MMDS ships pure-black-aware surface tokens.
      backgroundColor: getElevatedSurfaceColor(theme),
      width: '100%',
      height: '100%',
      justifyContent: 'center',
      alignItems: 'center',
    },
  });
};

export default styleSheet;
