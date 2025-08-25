import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../../../util/theme/models';

interface StateSelectorModalStyleSheetVars {
  screenHeight: number;
}
const styleSheet = (params: {
  theme: Theme;
  vars: StateSelectorModalStyleSheetVars;
}) => {
  const { vars } = params;
  const { screenHeight } = vars;

  return StyleSheet.create({
    list: {
      maxHeight: screenHeight * 0.4,
    },
    searchContainer: {
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    sectionHeader: {
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
    state: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    stateCode: {
      marginRight: 12,
      minWidth: 40,
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
