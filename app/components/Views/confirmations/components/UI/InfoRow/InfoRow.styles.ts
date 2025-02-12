import { StyleSheet } from 'react-native';

import { Theme } from '../../../../../../util/theme/models';
import { fontStyles } from '../../../../../../styles/common';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;

  return StyleSheet.create({
    container: {
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      flexWrap: 'wrap',
      paddingBottom: 8,
      paddingHorizontal: 8,
    },
    labelContainer: {
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 8,
    },
    label: {
      color: theme.colors.text.default,
      ...fontStyles.bold,
      fontSize: 14,
      fontWeight: '500',
    },
    value: {
      color: theme.colors.text.default,
      ...fontStyles.normal,
      fontSize: 14,
      marginTop: 8,
    },
    valueComponent: {
      alignSelf: 'flex-end',
    },
  });
};

export default styleSheet;
