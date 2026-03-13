import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;

  return StyleSheet.create({
    wrapper: {
      paddingTop: 12,
      paddingBottom: 16,
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
      borderRadius: 4,
      marginTop: 16,
    },
    skeletonBorderRadiusSmall: {
      borderRadius: 4,
      marginTop: 8,
      marginBottom: 12,
    },
  });
};

export default styleSheet;
