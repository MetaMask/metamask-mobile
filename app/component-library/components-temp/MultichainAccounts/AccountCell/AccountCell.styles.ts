import { StyleSheet } from 'react-native';
import { Theme } from '../../../../util/theme/models';

const styleSheet = (params: { theme: Theme; vars: unknown }) => {
  const { theme } = params;
  const { colors } = theme;

  return StyleSheet.create({
    container: {
      gap: 16,
      paddingTop: 16,
      paddingBottom: 16,
    },
    avatar: {
      borderRadius: 6, // Slightly smaller to account for wrapper border
      backgroundColor: colors.background.muted,
    },
    accountName: {
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'flex-start',
      alignItems: 'center',
      flex: 1,
      minWidth: 0,
    },
    accountNameText: {
      minWidth: 0,
      flex: 1,
    },
    checkIcon: {
      marginLeft: 8,
    },
    endContainer: {
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'flex-end',
      alignItems: 'center',
      gap: 8,
      flexShrink: 0,
    },
    balance: {
      verticalAlign: 'middle',
    },
    menuButton: {
      backgroundColor: colors.background.muted,
      borderRadius: 8,
      height: 28,
      width: 28,
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
    },
    mainTouchable: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
    },
  });
};

export default styleSheet;
