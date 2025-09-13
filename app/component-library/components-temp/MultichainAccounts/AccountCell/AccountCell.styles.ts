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
      width: 36, // 32 (avatar size) + 2*2 (border width)
      height: 36, // 32 (avatar size) + 2*2 (border width)
      borderWidth: 2,
      borderColor: isSelected ? colors.info.default : staticColors.transparent,
      justifyContent: 'center',
      alignItems: 'center',
    },
    avatar: {
      borderRadius: 6, // Slightly smaller to account for wrapper border
      width: 32,
      height: 32,
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
  });
};

export default styleSheet;
