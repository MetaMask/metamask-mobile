import { StyleSheet } from 'react-native';
import { Theme } from '../../../../util/theme/models';

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
      paddingLeft: 16,
      paddingRight: 8,
      paddingTop: 16,
      paddingBottom: 16,
    },
    avatar: {
      borderRadius: 8,
      width: 32,
      height: 32,
      backgroundColor: colors.background.muted,
      borderWidth: isSelected ? 2 : 0,
      borderColor: isSelected ? colors.info.default : colors.background.default,
    },
    accountName: {
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
    },
    endContainer: {
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 8,
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
