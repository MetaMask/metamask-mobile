import { StyleSheet } from 'react-native';
import type { Theme } from '../../../../../util/theme/models';

/**
 * Styles for PerpsBottomTabBar component
 */
const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;

  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      width: '100%',
      paddingTop: 12,
      marginBottom: 4,
      paddingHorizontal: 8,
      backgroundColor: theme.colors.background.default,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border.muted,
    },
    tabItem: {
      flex: 1,
      width: '100%',
    },
  });
};

export default styleSheet;
