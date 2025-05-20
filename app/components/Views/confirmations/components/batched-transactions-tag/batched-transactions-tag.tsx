import React from 'react';

import Icon, {
  IconColor,
  IconName,
} from '../../../../../component-library/components/Icons/Icon';
import TagBase from '../../../../../component-library/base-components/TagBase';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../hooks/useStyles';
import { useTransactionMetadataRequest } from '../../hooks/transactions/useTransactionMetadataRequest';
import styleSheet from './batched-transactions-tag.styles';
import { strings } from '../../../../../../locales/i18n';
import { useTransactionBatchesMetadataRequest } from '../../hooks/transactions/useTransactionBatchesMetadataRequest';
import { MMM_ORIGIN } from '../../constants/confirmations';

export const BatchedTransactionTag = () => {
  const { styles } = useStyles(styleSheet, {});
  const transactionMetadata = useTransactionMetadataRequest();
  const transactionBatchesMetadata = useTransactionBatchesMetadataRequest();

  const nestedTransactionCount =
    transactionMetadata?.nestedTransactions?.length ?? 0;
  const batchedTransactionCount =
    transactionBatchesMetadata?.transactions?.length ?? 0;
  const isWalletInitiated = transactionBatchesMetadata?.origin === MMM_ORIGIN;
  if (nestedTransactionCount <= 1 && (batchedTransactionCount <= 1 || isWalletInitiated)) {
    return null;
  }

  return (
    <TagBase
      style={styles.tagBaseStyle}
      startAccessory={
        <Icon name={IconName.Info} color={IconColor.Alternative} />
      }
    >
      <Text color={TextColor.Alternative} variant={TextVariant.BodySMMedium}>
        {strings('confirm.7702_functionality.includes_transaction', {
          transactionCount: nestedTransactionCount || batchedTransactionCount,
        })}
      </Text>
    </TagBase>
  );
};
