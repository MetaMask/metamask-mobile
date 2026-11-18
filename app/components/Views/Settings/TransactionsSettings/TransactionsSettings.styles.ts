import { StyleSheet } from 'react-native';
import type { Theme } from '../../../../util/theme/models';

const createStyles = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return StyleSheet.create({
    wrapper: {
      backgroundColor: colors.background.default,
      flex: 1,
    },
    scrollView: {
      flex: 1,
    },
    inner: {
      paddingHorizontal: 16,
    },
    heading: {
      marginBottom: 8,
    },
    setting: {
      marginTop: 16,
    },
    firstSetting: {
      marginTop: 0,
    },
    titleContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    title: {
      flex: 1,
    },
    desc: {
      marginTop: 8,
    },
  });
};

export default createStyles;
