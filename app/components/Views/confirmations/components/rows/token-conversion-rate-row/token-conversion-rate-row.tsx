import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { BigNumber } from 'bignumber.js';
import { Hex } from '@metamask/utils';
import InfoRow, { InfoRowSkeleton } from '../../UI/info-row/info-row';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import { MUSD_TOKEN } from '../../../../../UI/Earn/constants/musd';
import { strings } from '../../../../../../../locales/i18n';
import {
  useIsTransactionPayLoading,
  useTransactionPayQuotes,
} from '../../../hooks/pay/useTransactionPayData';
import { useTransactionMetadataRequest } from '../../../hooks/transactions/useTransactionMetadataRequest';
import { useTransactionPayToken } from '../../../hooks/pay/useTransactionPayToken';
import { RootState } from '../../../../../../reducers';
import { selectSingleTokenByAddressAndChainId } from '../../../../../../selectors/tokensController';

const TokenConversionRateRowTestIds = {
  CONTAINER: 'rate-row-container',
  SKELETON: 'rate-row-skeleton',
} as const;

export function TokenConversionRateRow() {
  const transactionMetadata = useTransactionMetadataRequest();
  const isQuoteLoading = useIsTransactionPayLoading();

  const isLoading = !transactionMetadata || isQuoteLoading;

  const quotes = useTransactionPayQuotes();
  const { payToken } = useTransactionPayToken();
  const quote = quotes?.[0];
  const inputTokenSymbol = payToken?.symbol;

  const outputTokenAddress = quote?.request?.targetTokenAddress;
  const outputTokenChainId = quote?.request?.targetChainId as Hex | undefined;
  const outputToken = useSelector((state: RootState) =>
    outputTokenAddress && outputTokenChainId
      ? selectSingleTokenByAddressAndChainId(
          state,
          outputTokenAddress as Hex,
          outputTokenChainId,
        )
      : undefined,
  );

  const outputTokenSymbol = outputToken?.symbol ?? MUSD_TOKEN.symbol;

  const conversionRate = useMemo(() => {
    const sourceAmountUsd = quote?.sourceAmount?.usd;
    const targetAmountUsd = quote?.targetAmount?.usd;

    if (
      !sourceAmountUsd ||
      !targetAmountUsd ||
      new BigNumber(sourceAmountUsd).isZero()
    ) {
      return undefined;
    }

    return new BigNumber(targetAmountUsd)
      .dividedBy(sourceAmountUsd)
      .decimalPlaces(3, BigNumber.ROUND_HALF_UP)
      .toString(10);
  }, [quote?.sourceAmount?.usd, quote?.targetAmount?.usd]);

  if (isLoading) {
    return <InfoRowSkeleton testId={TokenConversionRateRowTestIds.SKELETON} />;
  }

  return (
    <InfoRow
      label={strings('earn.musd_conversion.rate')}
      testID={TokenConversionRateRowTestIds.CONTAINER}
    >
      <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
        {`1 ${inputTokenSymbol} = ${conversionRate} ${outputTokenSymbol}`}
      </Text>
    </InfoRow>
  );
}
