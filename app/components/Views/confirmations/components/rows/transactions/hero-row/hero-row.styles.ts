import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../../../util/theme/models';

const styleSheet = (params: {
  theme: Theme;
  vars: { layout?: 'default' | 'horizontal' };
}) => {
  const { theme, vars } = params;
  const { layout } = vars;

  return StyleSheet.create({
    wrapper: {
      minHeight: 100,
      justifyContent: 'center',
      alignItems: layout === 'horizontal' ? 'stretch' : 'center',
    },
    loadingWrapper: {
      height: 78,
      width: 78,
      borderRadius: 39,
      backgroundColor: theme.colors.background.alternativePressed,
    },
    skeletonBorderRadiusLarge: {
      borderRadius: 32,
    },
    skeletonBorderRadiusMedium: {
      borderRadius: 6,
      marginTop: 16,
    },
    skeletonBorderRadiusSmall: {
      borderRadius: 4,
      marginTop: 8,
      marginBottom: 14,
    },
    skeletonHorizontalContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 16,
    },
    skeletonTextContainer: {
      gap: 8,
    },
    skeletonHorizontalBar: {
      borderRadius: 4,
    },
    skeletonHorizontalBarMedium: {
      borderRadius: 6,
    },
    skeletonHorizontalIcon: {
      borderRadius: 20,
    },
  });
};

export default styleSheet;
