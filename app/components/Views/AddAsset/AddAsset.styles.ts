import { StyleSheet } from 'react-native';
import { Theme } from '../../../util/theme/models';
import { fontStyles } from '../../../styles/common';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;
  return StyleSheet.create({
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
    },
    textStyle: {
      fontSize: 16,
      letterSpacing: 0.5,
      ...fontStyles.bold,
    },
  });
};
export default styleSheet;
