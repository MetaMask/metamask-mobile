import { StyleSheet } from 'react-native';

import { Theme } from '../../../../../../../util/theme/models';
import { fontStyles } from '../../../../../../../styles/common';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;

  return StyleSheet.create({
    container: {
      width: '100%',
      flexDirection: 'column',
      alignItems: 'center',
      backgroundColor: theme.colors.background.default,
    },
    title: {
      flexDirection: 'row',
      justifyContent: 'center',
      marginTop: 20,
      marginBottom: 20,
    },
    titleText: {
      ...fontStyles.normal,
      fontSize: 14,
      color: theme.colors.text.default,
    },
    errorText: {
      ...fontStyles.normal,
      fontSize: 12,
      color: theme.colors.error.default,
    },
    alert: {
      marginHorizontal: 16,
      marginTop: 12,
    },
  });
};

export default styleSheet;
