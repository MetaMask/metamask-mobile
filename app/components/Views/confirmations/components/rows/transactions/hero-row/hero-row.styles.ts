import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;

  return StyleSheet.create({
    wrapper: {
      minHeight: 100,
      justifyContent: 'center',
      alignItems: 'center',
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
  });
};

export default styleSheet;
