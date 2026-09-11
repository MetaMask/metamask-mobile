import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../util/theme/models';

interface SearchableSelectorBottomSheetStyleSheetVars {
  screenHeight: number;
}

const styleSheet = (params: {
  theme: Theme;
  vars: SearchableSelectorBottomSheetStyleSheetVars;
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
    emptyList: {
      padding: 16,
      alignItems: 'center',
    },
  });
};

export default styleSheet;
