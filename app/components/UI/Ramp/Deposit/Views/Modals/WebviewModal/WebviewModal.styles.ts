import { StyleSheet } from 'react-native';

interface WebviewModalStyleSheetVars {
  screenHeight: number;
}

const styleSheet = (params: { vars: WebviewModalStyleSheetVars }) => {
  const { vars } = params;
  const { screenHeight } = vars;

  return StyleSheet.create({
    headerWithoutPadding: {
      paddingVertical: 0,
    },
    bottomSheet: {
      height: screenHeight * 0.92,
    },
  });
};

export default styleSheet;
