import { StyleSheet } from 'react-native';

import { Theme } from '../../../../../../util/theme/models';
import { fontStyles } from '../../../../../../styles/common';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;

  return StyleSheet.create({
    backIcon: {
      left: 10,
      top: 10,
      position: 'absolute',
    },
    container: {
      backgroundColor: theme.colors.background.default,
      paddingHorizontal: 8,
      paddingVertical: 8,
    },
    text: {
      fontSize: 16,
      ...fontStyles.normal,
    },
    tooltipHeader: {
      flexDirection: 'row',
      justifyContent: 'center',
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
