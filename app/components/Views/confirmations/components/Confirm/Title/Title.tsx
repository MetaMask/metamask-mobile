import React from 'react';
import { Text, View } from 'react-native';
import { TransactionType } from '@metamask/transaction-controller';

import { strings } from '../../../../../../../locales/i18n';
import { useStyles } from '../../../../../../component-library/hooks';
import useApprovalRequest from '../../../hooks/useApprovalRequest';
import styleSheet from './Title.styles';

const getTitle = (confirmationType?: string) => {
  switch (confirmationType) {
    case TransactionType.personalSign:
    case TransactionType.signTypedData:
      return strings('confirm.title.signature');
    default:
      return '';
  }
};

const Title = () => {
  const { approvalRequest } = useApprovalRequest();
  const { styles } = useStyles(styleSheet, {});

  const title = getTitle(approvalRequest?.type);

  return (
    <View style={styles.titleContainer}>
      <Text style={styles.title}>{title}</Text>
    </View>
  );
};

export default Title;
