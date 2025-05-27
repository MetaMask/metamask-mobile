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

export const BatchedTransactionTag = () => {
  const { styles } = useStyles(styleSheet, {});
  const transactionMetadata = useTransactionMetadataRequest();

  const nestedTransactionCount =
    transactionMetadata?.nestedTransactions?.length ?? 0;
  if (nestedTransactionCount <= 1) {
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
        {
           strings('confirm.7702_functionality.includes_transaction', {
               transactionCount: nestedTransactionCount
           })
        }
      </Text>
    </TagBase>
  );
};
