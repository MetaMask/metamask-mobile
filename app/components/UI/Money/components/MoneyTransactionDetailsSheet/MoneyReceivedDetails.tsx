import React from 'react';
import { ScrollView } from 'react-native';
import { useSelector } from 'react-redux';
import { type Hex } from '@metamask/utils';
import { Text, TextVariant } from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { useStyles } from '../../../../../component-library/hooks';
import {
  selectCurrencyRates,
  selectCurrentCurrency,
} from '../../../../../selectors/currencyRateController';
import { selectTokenMarketData } from '../../../../../selectors/tokenRatesController';
import { Box } from '../../../Box/Box';
import { AlignItems, FlexDirection } from '../../../Box/box.types';
import Name from '../../../Name/Name';
import { NameType } from '../../../Name/Name.types';
import { TransactionDetailDivider } from '../../../../Views/confirmations/components/activity/transaction-detail-divider/transaction-detail-divider';
import { TransactionDetailsDateRow } from '../../../../Views/confirmations/components/activity/transaction-details-date-row';
import { TransactionDetailsRow } from '../../../../Views/confirmations/components/activity/transaction-details-row/transaction-details-row';
import { TransactionDetailsStatusRow } from '../../../../Views/confirmations/components/activity/transaction-details-status-row';
import {
  TokenIcon,
  TokenIconVariant,
} from '../../../../Views/confirmations/components/token-icon';
import { useTransactionDetails } from '../../../../Views/confirmations/hooks/activity/useTransactionDetails';
import { resolveMusdTransferMeta } from '../../constants/activityStyles';
import { buildMoneyActivityFiatLine } from '../../utils/moneyActivityFiat';
import styleSheet from './MoneyReceivedDetails.styles';

export function MoneyReceivedDetails() {
  const { styles } = useStyles(styleSheet, {});
  const { transactionMeta } = useTransactionDetails();
  const currentCurrency = useSelector(selectCurrentCurrency);
  const currencyRates = useSelector(selectCurrencyRates);
  const tokenMarketData = useSelector(selectTokenMarketData);

  const fiatAmount = buildMoneyActivityFiatLine(
    transactionMeta,
    currencyRates,
    currentCurrency,
    tokenMarketData,
  );
  const tokenMeta = resolveMusdTransferMeta(transactionMeta);
  const from = transactionMeta.txParams?.from;
  const chainId = transactionMeta.chainId as Hex;

  return (
    <ScrollView>
      <Box style={styles.container} gap={12}>
        {fiatAmount ? (
          <Box
            testID="money-received-hero"
            alignItems={AlignItems.center}
            gap={12}
            style={styles.hero}
          >
            <Text variant={TextVariant.DisplayLg}>{fiatAmount}</Text>
          </Box>
        ) : null}
        <TransactionDetailsStatusRow />
        <TransactionDetailsDateRow />
        <TransactionDetailDivider />
        {from ? (
          <TransactionDetailsRow
            label={strings('transaction_details.label.from')}
          >
            <Name
              type={NameType.EthereumAddress}
              value={from}
              variation={chainId}
            />
          </TransactionDetailsRow>
        ) : null}
        {tokenMeta ? (
          <TransactionDetailsRow
            label={strings('transaction_details.label.token_received')}
          >
            <Box
              flexDirection={FlexDirection.Row}
              gap={6}
              alignItems={AlignItems.center}
            >
              <TokenIcon
                chainId={chainId}
                address={tokenMeta.contractAddress as Hex}
                symbol={tokenMeta.symbol}
                variant={TokenIconVariant.Row}
              />
              <Text>{tokenMeta.symbol}</Text>
            </Box>
          </TransactionDetailsRow>
        ) : null}
      </Box>
    </ScrollView>
  );
}
