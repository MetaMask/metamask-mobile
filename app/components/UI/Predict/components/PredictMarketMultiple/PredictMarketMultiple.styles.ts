import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../util/theme/models';

const styleSheet = (params: {
  theme: Theme;
  vars: { isCarousel: boolean };
}) => {
  const { theme, vars } = params;

  return StyleSheet.create({
    marketContainer: {
      width: '100%',
      ...(vars.isCarousel && { height: '100%' }),
      backgroundColor: theme.colors.background.section,
      borderRadius: 16,
      padding: 16,
      marginVertical: vars.isCarousel ? 0 : 8,
      paddingVertical: vars.isCarousel ? 8 : 16,
      ...(vars.isCarousel && {
        flexDirection: 'column',
        justifyContent: 'space-between',
      }),
    },
    buttonContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      width: '100%',
    },
    buttonYes: {
      color: theme.colors.success.default,
      backgroundColor: theme.colors.success.muted,
      width: vars.isCarousel ? 60 : 68,
    },
    buttonNo: {
      color: theme.colors.error.default,
      backgroundColor: theme.colors.error.muted,
      width: vars.isCarousel ? 60 : 68,
    },
  });
};

export default styleSheet;
