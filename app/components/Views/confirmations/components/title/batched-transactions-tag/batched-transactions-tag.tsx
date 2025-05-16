import React from 'react';
import { FlexAlignType } from 'react-native';

import Icon, {
  IconColor,
  IconName,
} from '../../../../../../component-library/components/Icons/Icon';
import TagBase from '../../../../../../component-library/base-components/TagBase';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import { useTransactionMetadataRequest } from '../../../hooks/transactions/useTransactionMetadataRequest';

const styles = {
  tagBaseStyle: { alignSelf: 'center' as FlexAlignType, marginTop: 16 },
};

export const BatchedTransactionTag = () => {
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
      <Text color={TextColor.Alternative} variant={TextVariant.BodySM}>
        {`Includes ${transactionMetadata?.nestedTransactions?.length} transactions`}
      </Text>
    </TagBase>
  );
};
