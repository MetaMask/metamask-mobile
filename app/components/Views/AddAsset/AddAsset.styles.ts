import { StyleSheet } from 'react-native';
import { Theme } from '../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;
  return StyleSheet.create({
    base: {
      paddingHorizontal: 16,
    },
    wrapper: {
      flex: 1,
      backgroundColor: colors.background.default,
    },
    infoWrapper: {
      alignItems: 'center',
      marginTop: 10,
      paddingHorizontal: 16,
    },
    tabUnderlineStyle: {
      height: 2,
      backgroundColor: colors.primary.default,
    },
    tabBar: {
      borderColor: colors.border.muted,
    },
    tabStyle: {
      paddingBottom: 0,
      paddingVertical: 8,
    },
    textStyle: {
      textTransform: 'capitalize',
      ...params.theme.typography.sBodyMD,
      fontWeight: '500',
    },
  });
};
export default styleSheet;
