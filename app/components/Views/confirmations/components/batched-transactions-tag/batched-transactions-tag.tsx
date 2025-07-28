import React from 'react';

import { strings } from '../../../../../../locales/i18n';
import TagBase from '../../../../../component-library/base-components/TagBase';
import Icon, {
  IconColor,
  IconName,
} from '../../../../../component-library/components/Icons/Icon';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../hooks/useStyles';
import { useIsInternalConfirmation } from '../../hooks/transactions/useIsInternalConfirmation';
import { useTransactionBatchesMetadata } from '../../hooks/transactions/useTransactionBatchesMetadata';
import { useTransactionMetadataRequest } from '../../hooks/transactions/useTransactionMetadataRequest';
import styleSheet from './batched-transactions-tag.styles';

export const BatchedTransactionTag = () => {
  const { styles } = useStyles(styleSheet, {});
  const transactionMetadata = useTransactionMetadataRequest();
  const transactionBatchesMetadata = useTransactionBatchesMetadata();

  const nestedTransactionCount =
    transactionMetadata?.nestedTransactions?.length ?? 0;
  const batchedTransactionCount =
    transactionBatchesMetadata?.transactions?.length ?? 0;
  const isInternalConfirmation = useIsInternalConfirmation();
  if (
    nestedTransactionCount <= 1 &&
    (batchedTransactionCount <= 1 || isInternalConfirmation)
  ) {
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
