import React from 'react';

import Icon, {
  IconColor,
  IconName,
} from '../../../../../../component-library/components/Icons/Icon';
import TagBase from '../../../../../../component-library/base-components/TagBase';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../hooks/useStyles';
import { useTransactionMetadataRequest } from '../../../hooks/transactions/useTransactionMetadataRequest';
import styleSheet from './batched-transactions-tag.styles';

export const BatchedTransactionTag = () => {
  const { styles } = useStyles(styleSheet, {});
  const transactionMetadata = useTransactionMetadataRequest();

  if ((transactionMetadata?.nestedTransactions?.length ?? 0) <= 1) {
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
        {`Includes ${transactionMetadata?.nestedTransactions?.length} transactions`}
      </Text>
    </TagBase>
  );
};
