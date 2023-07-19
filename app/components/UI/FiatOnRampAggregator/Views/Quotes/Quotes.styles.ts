import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;
  return StyleSheet.create({
    timerWrapper: {
      backgroundColor: colors.background.alternative,
      borderRadius: 20,
      marginBottom: 8,
      paddingVertical: 4,
      paddingHorizontal: 15,
      flexDirection: 'row',
      alignItems: 'center',
    },
    timer: {
      fontVariant: ['tabular-nums'],
    },
    timerHiglight: {
      color: colors.error.default,
    },
    topBorder: {
      height: 1,
      width: '100%',
      backgroundColor: colors.border.default,
    },
    withoutTopPadding: {
      paddingTop: 0,
    },
    withoutTopMargin: {
      marginTop: 0,
    },
    withoutVerticalPadding: {
      paddingVertical: 0,
    },
  });
};

export default styleSheet;
