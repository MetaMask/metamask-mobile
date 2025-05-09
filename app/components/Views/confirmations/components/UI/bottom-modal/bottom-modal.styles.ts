import { StyleSheet } from 'react-native';

import { Theme } from '../../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;

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
    },
  });
};

export default styleSheet;
