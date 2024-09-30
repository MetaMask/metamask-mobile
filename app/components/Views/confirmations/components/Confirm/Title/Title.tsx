import React, { useMemo } from 'react';
import { Text, View } from 'react-native';
import { TransactionType } from '@metamask/transaction-controller';

import { strings } from '../../../../../../../locales/i18n';
import { useTheme } from '../../../../../../util/theme';
import useApprovalRequest from '../../../hooks/useApprovalRequest';
import createStyles from './style';

const getTitle = (confirmationType?: string) => {
  switch (confirmationType) {
    case TransactionType.personalSign:
      return strings('confirm.title.signature');
    default:
      return '';
  }
};

const Title = () => {
  const { approvalRequest } = useApprovalRequest();
  const { colors } = useTheme();

  const styles = createStyles(colors);
  const title = useMemo(
    () => getTitle(approvalRequest?.type),
    [approvalRequest?.type],
  );

  return (
    <View style={styles.titleContainer}>
      <Text style={styles.title}>{title}</Text>
    </View>
  );
};

export default Title;
