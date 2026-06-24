import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../../util/theme/models';

interface NetworksFilterSelectorStyleSheetVars {
  screenHeight: number;
}
const styleSheet = (params: {
  theme: Theme;
  vars: NetworksFilterSelectorStyleSheetVars;
}) => {
  const { vars } = params;
  const { screenHeight } = vars;

  return StyleSheet.create({
    list: {
      height: screenHeight * 0.4,
    },
    buttonContainer: {
      paddingHorizontal: 16,
      marginTop: 12,
    },
  });
};

export default styleSheet;
