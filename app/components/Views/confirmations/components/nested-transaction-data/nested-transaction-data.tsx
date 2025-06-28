import React from 'react';
import { Hex } from '@metamask/utils';
import { NestedTransactionMetadata } from '@metamask/transaction-controller';

import { strings } from '../../../../../../locales/i18n';
import Text from '../../../../../component-library/components/Texts/Text/Text';
import { TextVariant } from '../../../../../component-library/components/Texts/Text/Text.types';
import Name from '../../../../UI/Name';
import { NameType } from '../../../../UI/Name/Name.types';
import InfoSectionAccordion from '../../components/UI/info-section-accordion';
import CurrencyDisplay from '../UI/info-row/info-value/currency-display';
import InfoRow from '../UI/info-row';
import { useTransactionMetadataRequest } from '../../hooks/transactions/useTransactionMetadataRequest';

const TransactionInfo = ({
  chainId,
  index,
  transaction,
}: {
  chainId: Hex;
  index: number;
  transaction: NestedTransactionMetadata;
}) => {
  const { to, data, value } = transaction;
  return (
    <InfoSectionAccordion
      header={strings('confirm.nested_transaction_heading', {
        index,
      })}
    >
      <InfoRow label={strings('confirm.interacting_with')}>
        <Name
          value={to ?? ''}
          type={NameType.EthereumAddress}
          variation={chainId ?? ''}
        />
      </InfoRow>
      {value && (
        <InfoRow label={strings('confirm.label.amount')}>
          <CurrencyDisplay chainId={chainId} value={value} />
        </InfoRow>
      )}
      <InfoRow label={strings('confirm.data')} copyText={data} valueOnNewLine>
        <Text variant={TextVariant.BodyMD}>{data}</Text>
      </InfoRow>
    </InfoSectionAccordion>
  );
};

const NestedTransactionData = () => {
  const transactionMeta = useTransactionMetadataRequest();
  const { nestedTransactions = [], chainId } = transactionMeta ?? {};

  return (
    <>
      {nestedTransactions.map((transaction, index) => (
        <TransactionInfo
          chainId={chainId as Hex}
          key={`nested-transaction-${index}`}
          index={index + 1}
          transaction={transaction}
        />
      ))}
    </>
  );
};

export default NestedTransactionData;
