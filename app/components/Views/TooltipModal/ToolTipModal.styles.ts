import { StyleSheet } from 'react-native';
import { Theme } from '../../../util/theme/models';

interface StyleSheetVars {
  bottomPadding?: number;
}

const styleSheet = (params: { theme: Theme; vars: StyleSheetVars }) =>
  StyleSheet.create({
    content: {
      paddingHorizontal: 16,
      paddingBottom: params.vars.bottomPadding ?? 0,
      flexDirection: 'row',
      justifyContent: 'center',
    },
  });

export default styleSheet;
