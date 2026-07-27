import React from 'react';
import type { MoneyActivityItem } from '../../types/moneyActivity';
import MoneyActivityItemView from '../MoneyActivityItem/MoneyActivityItem';
import AccountsApiActivityItem from '../AccountsApiActivityItem/AccountsApiActivityItem';
import CardTransactionRow from '../../../Card/components/CardTransactionRow/CardTransactionRow';
import { TransactionMeta } from '@metamask/transaction-controller';
import type { CardTransaction } from '../../../../../core/Engine/controllers/card-controller/provider-types';
import Routes from '../../../../../constants/navigation/Routes';
import { useNavigation } from '@react-navigation/native';

export interface MoneyActivityRowProps {
  item: MoneyActivityItem;
  moneyAddress: string | undefined;
  /** Press handler for on-chain rows; Accounts-API rows handle their own. */
  onPress?: (transaction: TransactionMeta) => void;
  showNetworkBadge?: boolean;
  /** Whether the crypto/fiat amounts should be masked. */
  privacyMode?: boolean;
  cardEnrichmentByHash?: Map<string, CardTransaction>;
}

function CardProviderActivityRow({
  transaction,
  privacyMode,
}: {
  transaction: CardTransaction;
  privacyMode?: boolean;
}) {
  const navigation = useNavigation();

  return (
    <CardTransactionRow
      transaction={transaction}
      privacyMode={privacyMode}
      onPress={(tx) => {
        navigation.navigate(Routes.MONEY.CARD_TRANSACTION_DETAILS, {
          cardTransaction: tx,
        });
      }}
    />
  );
}

const MoneyActivityRow = ({
  item,
  moneyAddress,
  onPress,
  showNetworkBadge,
  privacyMode,
  cardEnrichmentByHash,
}: MoneyActivityRowProps) => {
  if (item.kind === 'cardProvider') {
    return (
      <CardProviderActivityRow
        transaction={item.tx}
        privacyMode={privacyMode}
      />
    );
  }

  if (item.kind === 'accountsApi') {
    const enrichment =
      item.tx.kind === 'card'
        ? cardEnrichmentByHash?.get(item.tx.hash.toLowerCase())
        : undefined;
    return (
      <AccountsApiActivityItem
        activity={item.tx}
        showNetworkBadge={showNetworkBadge}
        privacyMode={privacyMode}
        enrichment={enrichment}
      />
    );
  }
  return (
    <MoneyActivityItemView
      tx={item.tx}
      moneyAddress={moneyAddress}
      onPress={onPress}
      showNetworkBadge={showNetworkBadge}
      privacyMode={privacyMode}
    />
  );
};

export default React.memo(MoneyActivityRow);
