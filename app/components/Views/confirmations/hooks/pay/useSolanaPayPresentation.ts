import { useMemo } from 'react';
import BigNumber from 'bignumber.js';
import { SolScope } from '@metamask/keyring-api';

import { useAccountTokens } from '../send/useAccountTokens';
import { useSolanaPayQuote } from './useTransactionPayData';
import { useTransactionPaySource } from './useTransactionPaySource';

const LAMPORTS_PER_SOL = new BigNumber(1_000_000_000);

export function useSolanaPayPresentation() {
  const quote = useSolanaPayQuote();
  const { isSolana, solanaAsset, solanaIntent } = useTransactionPaySource();
  const assets = useAccountTokens({ includeNoBalance: true });

  return useMemo(() => {
    if (!isSolana || !quote || !solanaAsset || !solanaIntent) {
      return undefined;
    }

    const nativeAsset = assets.find(
      (asset) =>
        asset.accountId === solanaIntent.sourceWalletAccountId &&
        asset.address === `${SolScope.Mainnet}/slip44:501`,
    );
    const solPrice = new BigNumber(nativeAsset?.fiat?.conversionRate ?? 0);
    const sourceNetworkFeeUsd = new BigNumber(quote.preflight.totalFeeRaw)
      .plus(quote.preflight.rentDebitRaw)
      .dividedBy(LAMPORTS_PER_SOL)
      .multipliedBy(solPrice);
    const providerFeeUsd = new BigNumber(
      quote.providerQuote.fees.relayer?.amountUsd ?? 0,
    ).plus(quote.providerQuote.fees.app?.amountUsd ?? 0);
    const feeUsd = sourceNetworkFeeUsd.plus(providerFeeUsd);
    const sourceAmountUsd = new BigNumber(
      quote.providerQuote.details.currencyIn.amountUsd,
    );

    return {
      affordability: quote.preflight.affordability,
      feeUsd,
      isNative: solanaAsset.isNative === true,
      reserveSol: new BigNumber(
        quote.preflight.rentExemptionRequirementRaw,
      ).dividedBy(LAMPORTS_PER_SOL),
      sourceAmountFormatted:
        quote.providerQuote.details.currencyIn.amountFormatted,
      sourceSymbol: solanaAsset.symbol,
      totalUsd: sourceAmountUsd.plus(feeUsd),
    };
  }, [assets, isSolana, quote, solanaAsset, solanaIntent]);
}
