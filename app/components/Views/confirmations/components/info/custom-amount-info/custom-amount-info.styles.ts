import { Platform, StyleSheet } from 'react-native';
import { Theme } from '../../../../../../util/theme/models';

const ACCOUNT_SELECTOR_VERTICAL_PADDING = 12;
const BOTTOM_BLOCK_GAP = 16;

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  return StyleSheet.create({
    container: {
      flex: 1,
      flexDirection: 'column',
      justifyContent: 'space-between',
    },

    inputContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      gap: 14,
    },

    bottomBlock: {
      paddingBottom: Platform.OS === 'android' ? 16 : 0,
    },

    disabledButton: {
      opacity: 0.5,
    },

    footerText: {
      alignSelf: 'center',
    },

    separator: {
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border.muted,
      marginBottom: ACCOUNT_SELECTOR_VERTICAL_PADDING - BOTTOM_BLOCK_GAP,
    },
  });
};

export default styleSheet;
