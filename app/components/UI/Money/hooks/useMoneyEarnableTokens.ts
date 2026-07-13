import { useSelector } from 'react-redux';
import { useCallback, useMemo } from 'react';
import { TransactionType, CHAIN_IDS } from '@metamask/transaction-controller';
import { useAccountTokens } from '../../../Views/confirmations/hooks/send/useAccountTokens';
import {
  isTokenBlocked,
  getBlockedTokensForTransactionType,
} from '../../../Views/confirmations/utils/transaction-pay';
import { isSubsidizedRoute } from '../../../Views/confirmations/utils/relayFixedSpread';
import { MUSD_TOKEN_ADDRESS } from '../../Earn/constants/musd';
import {
  selectMetaMaskPayTokensFlags,
  selectRelayFixedSpread,
} from '../../../../selectors/featureFlagController/confirmations';
import { selectMoneyDepositMinBalance } from '../selectors/featureFlags';
import { AssetType } from '../../../Views/confirmations/types/token';
import { safeFormatChainIdToHex } from '../../Card/util/safeFormatChainIdToHex';
import { selectCurrencyRates } from '../../../../selectors/currencyRateController';
import { selectNetworkConfigurations } from '../../../../selectors/networkController';
import { calcUsdAmountFromFiat } from '../../Bridge/utils/exchange-rates';

const isEvmToken = (token: AssetType) =>
  Boolean(token.accountType?.includes('eip155'));

/**
 * Converts a token's `fiat.balance` (assumed to be in the user's preferred
 * currency) to USD. Fails loud: drops `fiat` rather than showing a value in
 * the wrong currency when the USD rate can't be resolved.
 */
const toUsdToken = (
  token: AssetType,
  currencyRates: ReturnType<typeof selectCurrencyRates>,
  networkConfigurationsByChainId: ReturnType<
    typeof selectNetworkConfigurations
  >,
): AssetType => {
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
 * Money deposits ALWAYS convert TO Monad mUSD. The no-fee tag matches a
 * subsidized route whose TARGET is Monad mUSD — NOT merely a token that is a
 * subsidized source on some other route (e.g. a USDC -> Linea mUSD deposit or
 * a Monad mUSD -> USDC withdraw), which would mislabel tokens that have no
 * subsidized route into Monad mUSD.
 */
const MONAD_MUSD_TARGET = {
  address: MUSD_TOKEN_ADDRESS,
  chainId: CHAIN_IDS.MONAD,
};

/**
 * Monad mUSD -> Monad mUSD needs no swap or bridge, so the fixed-spread SSOT
 * flag omits it; depositing Monad mUSD still incurs no Relay fee, so it is
 * tagged no-fee explicitly.
 */
const isMonadMusd = (address: string, chainId: string) =>
  chainId?.toLowerCase() === MONAD_MUSD_TARGET.chainId.toLowerCase() &&
  address?.toLowerCase() === MONAD_MUSD_TARGET.address.toLowerCase();

/**
 * Returns tokens the user holds that are eligible for Money account deposits
 * ("Earn on your crypto").
 *
 * Filtering pipeline:
 * 1. useAccountTokens({ includeNoBalance: false }) — zero-balance tokens excluded
 * 2. EVM-only — non-EVM tokens excluded (crash prevention)
 * 3. MM Pay blocklist scoped to moneyAccountDeposit — inherits the MM Pay
 * team's remote-config blocklist for deposit transactions specifically
 * 4. Minimum fiat balance — dust tokens below `earnMoneyDepositMinAssetBalance`
 * excluded (remotely configurable, fallback $0.01)
 *
 * Sort: fiat balance descending.
 *
 * isNoFeeToken: true when the token has a subsidized route whose target is
 * Monad mUSD, or when the token IS Monad mUSD (see isMonadMusd above).
 *
 * @param options.overrideToUsd - When true, converts each returned token's
 * `fiat.balance` to USD. Defaults to false.
 */
export const useMoneyEarnableTokens = ({
  overrideToUsd = false,
}: { overrideToUsd?: boolean } = {}) => {
  const payTokensFlags = useSelector(selectMetaMaskPayTokensFlags);
  const relayFixedSpread = useSelector(selectRelayFixedSpread);
  const minBalance = useSelector(selectMoneyDepositMinBalance);
  const allTokens = useAccountTokens({ includeNoBalance: false });
  const currencyRates = useSelector(selectCurrencyRates);
  const networkConfigurationsByChainId = useSelector(
    selectNetworkConfigurations,
  );

  const mmPayBlocked = useMemo(
    () =>
      getBlockedTokensForTransactionType(
        payTokensFlags.blockedTokens,
        TransactionType.moneyAccountDeposit,
      ),
    [payTokensFlags.blockedTokens],
  );

  const isNoFeeToken = useCallback(
    (token: AssetType) => {
      if (!token.chainId) return false;
      const chainId = safeFormatChainIdToHex(token.chainId as string);
      return (
        isMonadMusd(token.address, chainId) ||
        isSubsidizedRoute(
          relayFixedSpread,
          { address: token.address, chainId },
          MONAD_MUSD_TARGET,
        )
      );
    },
    [relayFixedSpread],
  );

  const meetsMinBalance = useCallback(
    (token: AssetType) => {
      const fiat = token?.fiat?.balance;
      if (fiat === undefined || fiat === null) return false;
      const n = Number(fiat);
      return Number.isFinite(n) && n >= minBalance;
    },
    [minBalance],
  );

  const tokens = useMemo(() => {
    const filtered = allTokens
      .filter(
        (t) =>
          isEvmToken(t) &&
          !isTokenBlocked(t, mmPayBlocked) &&
          meetsMinBalance(t),
      )
      .sort((a, b) => (b.fiat?.balance ?? 0) - (a.fiat?.balance ?? 0));

    if (!overrideToUsd) {
      return filtered;
    }

    return filtered.map((token) =>
      toUsdToken(token, currencyRates, networkConfigurationsByChainId),
    );
  }, [
    allTokens,
    mmPayBlocked,
    meetsMinBalance,
    overrideToUsd,
    currencyRates,
    networkConfigurationsByChainId,
  ]);

  return { tokens, isNoFeeToken };
};
