import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../../util/theme/models';

interface RegionSelectorModalStyleSheetVars {
  screenHeight: number;
}

const createStyles = (params: {
  theme: Theme;
  vars: RegionSelectorModalStyleSheetVars;
}) => {
  const { vars } = params;
  const { screenHeight } = vars;

  return StyleSheet.create({
    searchContainer: {
      paddingHorizontal: 16,
      paddingBottom: 16,
    },
    list: {
      height: screenHeight * 0.4,
    },
    region: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    emoji: {
      paddingRight: 16,
    },
    emptyList: {
      padding: 16,
      alignItems: 'center',
    },
    unsupportedContainer: {
      paddingVertical: 20,
    },
    unsupportedTitle: {
      marginBottom: 8,
    },
    unsupportedRegion: {
      marginBottom: 16,
    },
    unsupportedDescription: {
      marginBottom: 20,
    },
    supportLink: {
      color: params.theme.colors.primary.default,
      textDecorationLine: 'underline',
    },
  });
};

export default createStyles;
