import React, { memo } from 'react';
import { View } from 'react-native';

import { useStyles } from '../../../../hooks';
import createStyles from '../MultichainAccountSelectorList.styles';

const AccountListFooter = memo(() => {
  const { styles } = useStyles(createStyles, {});

  return <View style={styles.footerSpacing} />;
});

AccountListFooter.displayName = 'AccountListFooter';

export default AccountListFooter;
