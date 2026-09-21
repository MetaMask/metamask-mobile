import React from 'react';

import { strings } from '../../../../../../locales/i18n';
import TagBase from '../../../../../component-library/base-components/TagBase';
import Icon, {
  IconColor,
  IconName,
} from '../../../../../component-library/components/Icons/Icon';
import { useStyles } from '../../../../hooks/useStyles';
import { useIsInternalConfirmation } from '../../hooks/transactions/useIsInternalConfirmation';
import { useTransactionBatchesMetadata } from '../../hooks/transactions/useTransactionBatchesMetadata';
import { useTransactionMetadataRequest } from '../../hooks/transactions/useTransactionMetadataRequest';
import styleSheet from './batched-transactions-tag.styles';
import {
  Text,
  TextVariant,
  TextColor,
  FontWeight,
} from '@metamask/design-system-react-native';

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
      <Text
        color={TextColor.TextAlternative}
        variant={TextVariant.BodySm}
        fontWeight={FontWeight.Medium}
      >
        {strings('confirm.7702_functionality.includes_transaction', {
          transactionCount: nestedTransactionCount || batchedTransactionCount,
        })}
      </Text>
    </TagBase>
  );
};
