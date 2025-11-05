import { StyleSheet } from 'react-native';
import type { Theme } from '../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { colors } = params.theme;

  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    bannerContainer: {
      backgroundColor: colors.background.muted,
      borderRadius: 12,
      padding: 12,
      marginHorizontal: 16,
      marginBottom: 16,
    },
    inlineContainer: {
      paddingVertical: 8,
    },
    icon: {},
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
