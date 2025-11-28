import { StyleSheet } from 'react-native';
import type { Theme } from '../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { colors } = params.theme;

  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: colors.background.muted,
      borderRadius: 12,
      padding: 12,
      marginTop: 8,
    },
    icon: {},
    textContainer: {
      flex: 1,
      gap: 4,
    },
  });
};

export default styleSheet;
