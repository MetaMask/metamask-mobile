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
      height: screenHeight * 0.8,
    },
    listContainer: {
      flex: 1,
      position: 'relative',
      overflow: 'hidden',
      height: screenHeight * 0.8,
    },
    listWrapper: {
      position: 'absolute',
      width: '100%',
      height: '100%',
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
    description: {
      paddingHorizontal: 16,
      marginBottom: 16,
      textAlign: 'center',
    },
  });
};

export default createStyles;
