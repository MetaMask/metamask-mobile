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
      borderRadius: 12,
      // Prototype: every card gets a solid 1px border.muted (padding trimmed 1px);
      // carousel cards use a 16px radius to match the carousel's rounded-2xl clip.
      padding: 15,
      borderWidth: 1,
      borderColor: theme.colors.border.muted,
      ...(vars.isCarousel && { borderRadius: 16 }),
      marginTop: 0,
      marginBottom: vars.isCarousel ? 0 : 12,
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
