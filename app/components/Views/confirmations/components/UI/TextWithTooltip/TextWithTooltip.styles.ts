import { StyleSheet } from 'react-native';

import { Theme } from '../../../../../../util/theme/models';
import { fontStyles } from '../../../../../../styles/common';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;

  return StyleSheet.create({
    container: {
      backgroundColor: theme.colors.background.default,
      paddingHorizontal: 8,
      paddingVertical: 8,
    },
    tooltipText: {
      fontSize: 16,
      ...fontStyles.normal,
    },
    tooltipHeader: {
      paddingHorizontal: 8,
      paddingVertical: 8,
    },
    tooltipContext: {
      paddingHorizontal: 40,
      paddingTop: 40,
      paddingBottom: 56,
    },
  });
};

export default styleSheet;
