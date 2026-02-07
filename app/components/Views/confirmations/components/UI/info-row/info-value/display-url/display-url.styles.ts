import { StyleSheet } from 'react-native';

import { Theme } from '../../../../../../../../util/theme/models';
import { fontStyles } from '../../../../../../../../styles/common';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;

  return StyleSheet.create({
    container: {
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
    },
    value: {
      color: theme.colors.text.default,
      ...fontStyles.normal,
    },
    warningContainer: {
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      marginRight: 8,
      marginTop: 8,
      paddingVertical: 2,
      paddingHorizontal: 4,
      backgroundColor: theme.colors.error.muted,
      borderRadius: 4,
    },
    warningText: {
      color: theme.colors.error.default,
      marginLeft: 4,
    },
    trustSignalIcon: {
      marginRight: 4,
    },
  });
};

export default styleSheet;
