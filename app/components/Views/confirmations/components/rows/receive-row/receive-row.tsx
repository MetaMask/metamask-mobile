import React, { useMemo } from 'react';
import {
  Box,
  FontWeight,
  KeyValueRow,
  KeyValueRowVariant,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import { BigNumber } from 'bignumber.js';
import {
  useIsTransactionPayLoading,
  useTransactionPaySourceAmounts,
  useTransactionPayTotals,
} from '../../../hooks/pay/useTransactionPayData';
import { useTransactionMetadataOrThrow } from '../../../hooks/transactions/useTransactionMetadataRequest';
import useFiatFormatter from '../../../../../UI/SimulationDetails/FiatDisplay/useFiatFormatter';
import { ConfirmationRowComponentIDs } from '../../../ConfirmationView.testIds';
import { KeyValueRowSkeleton } from '../key-value-row-skeleton';

export interface ReceiveRowProps {
  /** The user's input amount in USD */
  inputAmountUsd: string;
}

/**
 * Row component that displays "You'll receive" for withdrawal transactions.
 * Calculates: Input amount - (Provider fee + Source network fee + Target network fee)
 * For post-quote withdrawals, the source network fee already includes the
 * original transaction gas (added in relay-quotes.ts when isPostQuote).
 */
export function ReceiveRow({ inputAmountUsd }: ReceiveRowProps) {
  const formatFiat = useFiatFormatter({ currency: 'usd' });
  const isLoading = useIsTransactionPayLoading();
  const totals = useTransactionPayTotals();
  const sourceAmounts = useTransactionPaySourceAmounts();
  const transactionMeta = useTransactionMetadataOrThrow();

  const receiveUsd = useMemo(() => {
    if (!totals || inputAmountUsd == null) return '';

    const inputUsd = new BigNumber(inputAmountUsd);

    if (transactionMeta?.isGasFeeSponsored && !sourceAmounts?.length) {
      return formatFiat(inputUsd.isPositive() ? inputUsd : new BigNumber(0));
    }

    const providerFee = new BigNumber(totals.fees?.provider?.usd ?? 0);
    const sourceNetworkFee = new BigNumber(
      totals.fees?.sourceNetwork?.estimate?.usd ?? 0,
    );
    const targetNetworkFee = new BigNumber(
      totals.fees?.targetNetwork?.usd ?? 0,
    );
    const metaMaskFee = new BigNumber(totals.fees?.metaMask?.usd ?? 0);

    const totalFees = providerFee
      .plus(sourceNetworkFee)
      .plus(targetNetworkFee)
      .plus(metaMaskFee);
    const youReceive = inputUsd.minus(totalFees);
    return formatFiat(youReceive.isPositive() ? youReceive : new BigNumber(0));
  }, [
    totals,
    formatFiat,
    inputAmountUsd,
    transactionMeta?.isGasFeeSponsored,
    sourceAmounts?.length,
  ]);

  if (isLoading) {
    return <KeyValueRowSkeleton testID="receive-row-skeleton" />;
  }

  return (
    <Box testID="receive-row">
      <KeyValueRow
        variant={KeyValueRowVariant.Summary}
        keyLabel={strings('confirm.label.you_receive')}
        value={
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            color={TextColor.TextDefault}
            testID={ConfirmationRowComponentIDs.RECEIVE}
          >
            {receiveUsd}
          </Text>
        }
      />
    </Box>
  );
}
