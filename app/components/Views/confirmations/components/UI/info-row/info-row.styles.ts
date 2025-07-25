import { StyleSheet } from 'react-native';

import { Theme } from '../../../../../../util/theme/models';
import { fontStyles } from '../../../../../../styles/common';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;

  return StyleSheet.create({
    container: {
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'flex-end',
      alignItems: 'center',
      flexWrap: 'wrap',
      paddingBottom: 8,
      paddingHorizontal: 8,
    },
    labelContainer: {
      display: 'flex',
      flexDirection: 'row',
      alignSelf: 'flex-start',
      alignItems: 'center',
      minHeight: 38,
      paddingEnd: 4,
      marginRight: 'auto',
    },
    value: {
      color: theme.colors.text.default,
      ...fontStyles.normal,
    },
    valueOnNewLineContainer: {
      paddingBottom: 8,
      paddingHorizontal: 8,
    },
  });
};

export default styleSheet;
