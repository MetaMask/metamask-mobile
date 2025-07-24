import { StyleSheet } from 'react-native';
import type { Theme } from '../../../../../util/theme/models';

const createStyles = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return StyleSheet.create({
    container: {
      backgroundColor: colors.warning.muted,
      padding: 12,
      marginBottom: 16,
      borderRadius: 8,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    mainText: {
      flex: 1,
      marginRight: 8,
    },
    debugText: {
      marginTop: 4,
    },
    linkButton: {
      marginTop: 4,
    },
  });
};

export default createStyles;