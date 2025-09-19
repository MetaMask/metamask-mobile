import { StyleSheet } from 'react-native';

import { Theme } from '../../../../../../../util/theme/models';
import { fontStyles } from '../../../../../../../styles/common';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;

  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingBottom: 4,
    },
    accountContainer: {
      flex: 1,
      flexDirection: 'row',
    },
    badgeWrapper: {
      marginRight: 16,
      alignSelf: 'center',
    },
    accountInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      width: '100%',
    },
    accountName: {
      color: theme.colors.text.default,
      ...fontStyles.bold,
    },
    accountLabel: {
      borderRadius: 16,
      marginStart: 8,
      paddingHorizontal: 12,
    },
    infoContainer: {
      marginLeft: -4,
      justifyContent: 'center',
    },
  });
};

export default styleSheet;
