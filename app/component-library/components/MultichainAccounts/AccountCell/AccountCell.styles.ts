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
      borderLeftWidth: isSelected ? 4 : 0,
      borderLeftColor: isSelected
        ? colors.info.default
        : colors.background.default,
      backgroundColor: isSelected
        ? colors.info.muted
        : colors.background.default,
    },
    avatar: {
      borderRadius: 8,
      width: 32,
      height: 32,
      backgroundColor: colors.background.muted,
    },
    accountName: {
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'center',
    },
    balance: {
      verticalAlign: 'middle',
    },
  });
};

export default styleSheet;
