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
      minHeight: 68,
    },
    avatar: {
      borderRadius: 6, // Slightly smaller to account for wrapper border
      backgroundColor: colors.background.muted,
    },
    accountName: {
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'flex-start',
      flex: 1,
      minWidth: 0,
      gap: 4,
    },
    accountNameRow: {
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'flex-start',
      alignItems: 'center',
      minWidth: 0,
    },
    accountNameText: {
      minWidth: 0,
      flex: 1,
    },
    accountSubRow: {
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    accountSubText: {
      flex: 0,
    },
    networkBadge: {
      marginTop: 1,
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
    balanceContainer: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-end',
      gap: 4,
    },
    balance: {
      verticalAlign: 'middle',
    },
    menuButton: {
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
      minHeight: 36,
    },
  });
};

export default styleSheet;
