import type { Theme } from '@metamask/design-tokens';
import { StyleSheet, TextStyle } from 'react-native';
import {
  getFontFamily,
  TextVariant,
} from '../../../../component-library/components/Texts/Text';

const styleSheet = (params: {
  theme: Theme;
  vars: { chartHeight: number };
}) => {
  const { theme } = params;
  const { chartHeight } = params.vars;
  const { typography } = theme;
  return StyleSheet.create({
    chart: {
      paddingRight: 0,
      paddingLeft: 0,
      height: chartHeight,
      paddingTop: 0,
      marginVertical: 0,
      // Match parent width (e.g. token overview with horizontal padding). Full screen width here
      // overflows the padded container and clips the SVG on the right — hiding the end dot.
      width: '100%',
      alignSelf: 'stretch',
      overflow: 'visible',
    },
    chartArea: {
      flex: 1,
    },
    chartLoading: {
      width: '100%',
      alignSelf: 'stretch',
      paddingHorizontal: 16,
      paddingTop: 10,
    },
    tooltipLine: {
      color: theme.colors.icon.alternative,
    },
    tooltipCircle: {
      color: theme.colors.primary.inverse,
    },
  });
};

export default styleSheet;
