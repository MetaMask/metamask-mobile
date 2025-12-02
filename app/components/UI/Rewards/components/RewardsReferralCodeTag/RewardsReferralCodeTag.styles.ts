import { StyleSheet } from 'react-native';
import type { Theme } from '../../../../../util/theme/models';

const styleSheet = (params: {
  theme: Theme;
  vars: { backgroundColor?: string; fontColor?: string };
}) => {
  const { theme, vars } = params;
  const { backgroundColor, fontColor } = vars;

  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingTop: 4,
      paddingBottom: 4,
      paddingLeft: 8,
      gap: 4,
      paddingRight: 8,
      backgroundColor: backgroundColor || theme.colors.background.mutedHover,
      borderRadius: 24,
      alignSelf: 'flex-start',
    },
    referralCode: {
      color: fontColor || theme.colors.accent04.light,
    },
    icon: {
      width: 16,
      height: 16,
    },
  });
};

export default styleSheet;
