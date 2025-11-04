import { StyleSheet } from 'react-native';
import type { Theme } from '../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { colors } = params.theme;

  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
    },
    bannerContainer: {
      backgroundColor: colors.warning.muted,
      borderRadius: 8,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.warning.default,
    },
    inlineContainer: {
      paddingVertical: 8,
    },
    icon: {
      marginTop: 2,
    },
    textContainer: {
      flex: 1,
      gap: 4,
    },
    title: {
      fontWeight: '600',
    },
    description: {
      lineHeight: 18,
    },
  });
};

export default styleSheet;
