import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../../../util/theme/models';

interface RegionSelectorModalStyleSheetVars {
  screenHeight: number;
}
const styleSheet = (params: {
  theme: Theme;
  vars: RegionSelectorModalStyleSheetVars;
}) => {
  const { vars } = params;
  const { screenHeight } = vars;

  return StyleSheet.create({
    list: {
      height: screenHeight * 0.4,
    },
    searchContainer: {
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    sectionHeader: {
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
    region: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    emoji: {
      marginRight: 12,
    },
    emptyList: {
      padding: 16,
      alignItems: 'center',
    },
    listItem: {
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
  });
};

export default styleSheet;
