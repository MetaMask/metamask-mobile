import { StyleSheet } from 'react-native';

import { Theme } from '../../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;

  return StyleSheet.create({
    container: {
      backgroundColor: theme.colors.background.alternative,
      borderRadius: 99,
      paddingVertical: 4,
      paddingLeft: 8,
      paddingRight: 8,
      gap: 5,
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'center',
    },
  });
};

export type TooltipStylesType = ReturnType<typeof styleSheet>;
export default styleSheet;
