import { StyleSheet } from 'react-native';
import { Theme } from '../../../../util/theme/models';
import { colors as staticColors } from '../../../../styles/common';

const styleSheet = (params: {
  theme: Theme;
  vars: { isSelected: boolean };
}) => {
  const { theme, vars } = params;
  const { isSelected } = vars;
  const { colors } = theme;

  return StyleSheet.create({
    container: {
      gap: 16,
      paddingTop: 16,
      paddingBottom: 16,
    },
    avatarWrapper: {
      borderRadius: 8,
      width: isSelected ? 40 : 36, // 36 (avatar size) + 2*2 (border width) when selected, 32 + 2*2 when not
      height: isSelected ? 40 : 36, // 36 (avatar size) + 2*2 (border width) when selected, 32 + 2*2 when not
      borderWidth: 2,
      borderColor: isSelected ? colors.info.default : staticColors.transparent,
      justifyContent: 'center',
      alignItems: 'center',
    },
    avatar: {
      borderRadius: 6, // Slightly smaller to account for wrapper border
      width: isSelected ? 36 : 32, // Increase size to maintain 32x32 content area with 2px border
      height: isSelected ? 36 : 32, // Increase size to maintain 32x32 content area with 2px border
      backgroundColor: colors.background.muted,
      borderWidth: isSelected ? 2 : 0,
      borderColor: isSelected ? staticColors.white : staticColors.transparent,
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
      backgroundColor: colors.background.muted,
      borderRadius: 8,
      height: 28,
      width: 28,
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
    },
  });
};

export default styleSheet;
