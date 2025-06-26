import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../../../util/theme/models';

interface RegioSelectorModalStyleSheetVars {
  screenHeight: number;
}
const styleSheet = (params: {
  theme: Theme;
  vars: RegioSelectorModalStyleSheetVars;
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
  });
};

export default styleSheet;
