import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../util/theme/models';

const styleSheet = (params: {
  theme: Theme;
  vars: { isCarousel: boolean };
}) => {
  const { theme, vars } = params;

  return StyleSheet.create({
    marketContainer: {
      flexDirection: 'column',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      width: '100%',
      ...(vars.isCarousel && { height: '100%' }),
      backgroundColor: theme.colors.background.section,
      borderRadius: 16,
      padding: 16,
      marginVertical: vars.isCarousel ? 0 : 8,
      paddingVertical: vars.isCarousel ? 8 : 16,
    },
    marketHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      width: '100%',
    },
    yesPercentageContainer: {
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      minWidth: 60,
    },
    marketFooter: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      alignItems: 'flex-end',
      width: '100%',
      marginTop: vars.isCarousel ? 0 : 8,
    },
    buttonContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      width: '100%',
      marginTop: 16,
    },
    buttonYes: {
      width: '48.5%',
      paddingVertical: 0,
      color: theme.colors.success.default,
      backgroundColor: theme.colors.success.muted,
    },
    buttonNo: {
      width: '48.5%',
      paddingVertical: 0,
      color: theme.colors.error.default,
      backgroundColor: theme.colors.error.muted,
    },
  });
};

export default styleSheet;
