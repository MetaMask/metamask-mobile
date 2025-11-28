import { StyleSheet } from 'react-native';
import type { Theme } from '../../../../../util/theme/models';

export const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return StyleSheet.create({
    modal: {
      margin: 0,
      padding: 0,
    },
    container: {
      flex: 1,
      backgroundColor: colors.background.default,
    },
    header: {
      backgroundColor: colors.background.default,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.muted,
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 12,
    },
    headerTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    chartContainer: {
      flex: 1,
      backgroundColor: colors.background.default,
    },
    intervalSelectorWrapper: {
      marginTop: 0, // Override the default marginTop: 24 from selector
    },
    ohlcvWrapper: {
      paddingHorizontal: 16,
    },
  });
};
