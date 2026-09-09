import { useSelector } from 'react-redux';
import { useCallback, useMemo } from 'react';
import { selectRelayFixedSpread } from '../../../../selectors/featureFlagController/confirmations';
import { selectCurrencyRates } from '../../../../selectors/currencyRateController';
import { selectNetworkConfigurations } from '../../../../selectors/networkController';
import { calcUsdAmountFromFiat } from '../../Bridge/utils/exchange-rates';
import {
  type MoneyDepositAsset,
  selectMoneyDepositEligibleAssets,
} from '../selectors/depositTokens';
import { isMoneyDepositFeeSubsidized } from '../utils/isMoneyDepositFeeSubsidized';

/**
 * Converts a token's `fiat.balance` (assumed to be in the user's preferred
 * currency) to USD. Fails loud: drops `fiat` rather than showing a value in
 * the wrong currency when the USD rate can't be resolved.
 */
const toUsdToken = (
  token: MoneyDepositAsset,
  currencyRates: ReturnType<typeof selectCurrencyRates>,
  networkConfigurationsByChainId: ReturnType<
    typeof selectNetworkConfigurations
  >,
): MoneyDepositAsset => {
  if (token.fiat?.balance === undefined) {
    return token;
  }

  const usdBalance = calcUsdAmountFromFiat({
    tokenFiatValue: token.fiat.balance,
    chainId: token.chainId,
    networkConfigurationsByChainId,
    evmMultiChainCurrencyRates: currencyRates,
  });

  return {
    ...token,
    fiat:
      usdBalance === undefined
        ? undefined
        : { ...token.fiat, balance: usdBalance, currency: 'usd' },
  };
};

/**
 * Returns Money-account deposit assets, with their optional USD balances and
 * no-fee-route predicate.
 *
 * `selectMoneyDepositEligibleAssets` is the eligibility source of truth. It
 * selects assets from the chosen account group, excludes zero-balance,
 * non-EVM, MM Pay-blocked, and below-minimum-fiat-balance assets, then sorts
 * the remaining assets by fiat balance descending.
 *
 * `isNoFeeToken` returns true when an asset has a subsidized route targeting
 * Monad mUSD, or when the asset is Monad mUSD itself.
 *
 * @param options.overrideToUsd - When true, converts each returned token's
 * `fiat.balance` to USD. Defaults to false.
 */
export const useMoneyDepositTokens = ({
  overrideToUsd = false,
}: { overrideToUsd?: boolean } = {}) => {
  const relayFixedSpread = useSelector(selectRelayFixedSpread);
  const eligibleAssets = useSelector(selectMoneyDepositEligibleAssets);
  const currencyRates = useSelector(selectCurrencyRates);
  const networkConfigurationsByChainId = useSelector(
    selectNetworkConfigurations,
  );

  const isNoFeeToken = useCallback(
    (token: { address: string; chainId?: string }) =>
      isMoneyDepositFeeSubsidized(relayFixedSpread, token),
    [relayFixedSpread],
  );

  const tokens = useMemo(() => {
    if (!overrideToUsd) {
      return eligibleAssets;
    }

    return eligibleAssets.map((token) =>
      toUsdToken(token, currencyRates, networkConfigurationsByChainId),
    );
  }, [
    eligibleAssets,
    overrideToUsd,
    currencyRates,
    networkConfigurationsByChainId,
  ]);

  return { tokens, isNoFeeToken };
};
