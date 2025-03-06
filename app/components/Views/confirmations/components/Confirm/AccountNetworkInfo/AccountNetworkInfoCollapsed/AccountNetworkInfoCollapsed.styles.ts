import { StyleSheet } from 'react-native';

import { Theme } from '../../../../../../../util/theme/models';
import { fontStyles } from '../../../../../../../styles/common';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;

  return StyleSheet.create({
    container: {
      display: 'flex',
      flexDirection: 'row',
    },
    badgeWrapper: {
      marginRight: 16,
      alignSelf: 'center',
    },
    accountInfo: {
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
    },
    accountName: {
      color: theme.colors.text.default,
      ...fontStyles.bold,
      fontSize: 14,
    },
    accountLabelWrapper: {
      marginStart: 8,
    },
    networkName: {
      color: theme.colors.text.default,
      ...fontStyles.normal,
      fontSize: 14,
    },
  });
};

export default styleSheet;
