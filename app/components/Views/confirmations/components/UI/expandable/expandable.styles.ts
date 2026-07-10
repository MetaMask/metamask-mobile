import { StyleSheet } from 'react-native';

import { Theme } from '../../../../../../util/theme/models';

const styleSheet = (params: {
  theme: Theme;
  vars: { isCompact: boolean | undefined };
}) => {
  const { theme, vars } = params;
  const { isCompact } = vars;

  return StyleSheet.create({
    container: {
      backgroundColor: theme.colors.background.muted,
      borderRadius: 8,
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: isCompact ? 0 : 16,
      marginBottom: isCompact ? 0 : 8,
    },
    /** Full-screen wrapper for transparent Modal so BottomSheet can fill the window. */
    modalRoot: {
      flex: 1,
    },
    modalContent: {
      // Deprecated: kept for backward-compat; BottomSheet provides surface + radius.
      backgroundColor: theme.colors.background.section,
      paddingBottom: 34,
    },
    modalExpandedContent: {
      paddingHorizontal: 16,
    },
    copyButtonContainer: {
      position: 'absolute',
      top: 6,
      right: 18,
      zIndex: 1,
    },
  });
};

export default styleSheet;
