import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../../util/theme/models';

interface FiatSelectorModalStyleSheetVars {
  screenHeight: number;
}

const styleSheet = (params: {
  theme: Theme;
  vars: FiatSelectorModalStyleSheetVars;
}) => {
  const { vars } = params;
  const { screenHeight } = vars;

  return StyleSheet.create({
    searchContainer: {
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    list: {
      height: screenHeight * 0.4,
    },
  });
};

export default styleSheet;
