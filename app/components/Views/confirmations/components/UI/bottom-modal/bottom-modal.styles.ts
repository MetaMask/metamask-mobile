import { StyleSheet } from 'react-native';

import { Theme } from '../../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme; vars: { isTooltip: boolean } }) => {
  const { theme } = params;
  const isTooltip = params.vars.isTooltip;

  return StyleSheet.create({
    bottomModal: {
      justifyContent: 'flex-end',
      margin: 0,
    },
    topBar: {
      alignSelf: 'center',
      backgroundColor: theme.colors.background.alternativePressed,
      borderRadius: 4,
      height: 4,
      marginBottom: -8,
      width: 56,
      zIndex: 1,
    },
    wrapper: {
      justifyContent: 'flex-end',
      // ensure the wrapper is big enough for tooltips on android 15
      ...(isTooltip && { height: 400 }),
    },
  });
};

export default styleSheet;
