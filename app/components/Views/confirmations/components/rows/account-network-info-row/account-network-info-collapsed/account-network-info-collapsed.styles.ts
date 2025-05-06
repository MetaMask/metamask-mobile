import { StyleSheet } from 'react-native';

import { Theme } from '../../../../../../../util/theme/models';
import { fontStyles } from '../../../../../../../styles/common';

const styleSheet = (params: {
  theme: Theme;
  vars: { accountNameWide: boolean };
}) => {
  const {
    theme,
    vars: { accountNameWide },
  } = params;

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
      width: '100%',
    },
    accountName: {
      color: theme.colors.text.default,
      width: accountNameWide ? '86%' : '40%',
      ...fontStyles.bold,
    },
    accountLabel: {
      borderRadius: 16,
      marginStart: 8,
      paddingHorizontal: 12,
    },
    networkName: {
      color: theme.colors.text.default,
      ...fontStyles.normal,
    },
  });
};

export default styleSheet;
