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
      gap: 4,
      paddingTop: 4,
      paddingBottom: 4,
      paddingLeft: 4,
      paddingRight: 8,
      backgroundColor: backgroundColor || theme.colors.background.mutedHover,
      borderRadius: 24,
      alignSelf: 'flex-start',
    },
    referralCode: {
      color: fontColor || theme.colors.accent04.light,
    },
    iconContainer: {
      height: 24,
      width: 24,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      overflow: 'hidden',
    },
    icon: {
      width: 24,
      height: 24,
    },
  });
};

export default styleSheet;
