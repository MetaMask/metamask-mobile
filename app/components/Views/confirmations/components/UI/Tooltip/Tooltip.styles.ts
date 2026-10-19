import { StyleSheet } from 'react-native';

import { Theme } from '../../../../../../util/theme/models';
import { fontStyles } from '../../../../../../styles/common';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;

  return StyleSheet.create({
    modalContent: {
      alignSelf: 'stretch',
      marginTop: 8,
      marginBottom: 30,
      marginHorizontal: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalContentValue: {
      color: theme.colors.text.default,
      ...fontStyles.normal,
    },
    iconButton: {
      marginLeft: 4,
    },
  });
};

export type TooltipStylesType = ReturnType<typeof styleSheet>;
export default styleSheet;
