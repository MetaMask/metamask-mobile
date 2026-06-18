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

const isEvmToken = (token: AssetType) =>
  Boolean(token.accountType?.includes('eip155'));

/**
 * Money deposits ALWAYS convert TO Monad mUSD. The no-fee tag must match a
 * subsidized route whose TARGET is Monad mUSD — NOT merely a token that is a
 * subsidized source on some other route (e.g. a withdraw mUSD->USDC route).
 */
const MONAD_MUSD_TARGET = {
  address: MUSD_TOKEN_ADDRESS,
  chainId: CHAIN_IDS.MONAD,
};

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
 * isNoFeeToken: true only when the token has a subsidized route whose target
 * is Monad mUSD (i.e. the deposit destination). Source-only matching is
 * intentionally avoided — see MONAD_MUSD_TARGET above.
 */
export const useMoneyEarnableTokens = () => {
  const payTokensFlags = useSelector(selectMetaMaskPayTokensFlags);
  const relayFixedSpread = useSelector(selectRelayFixedSpread);
  const minBalance = useSelector(selectMoneyDepositMinBalance);
  const allTokens = useAccountTokens({ includeNoBalance: false });

  const mmPayBlocked = useMemo(
    () =>
      getBlockedTokensForTransactionType(
        payTokensFlags.blockedTokens,
        TransactionType.moneyAccountDeposit,
      ),
    [payTokensFlags.blockedTokens],
  );

  const isNoFeeToken = useCallback(
    (token: AssetType) =>
      Boolean(token.chainId) &&
      isSubsidizedRoute(
        relayFixedSpread,
        {
          address: token.address,
          chainId: safeFormatChainIdToHex(token.chainId as string),
        },
        MONAD_MUSD_TARGET,
      ),
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

  const tokens = useMemo(
    () =>
      allTokens
        .filter(
          (t) =>
            isEvmToken(t) &&
            !isTokenBlocked(t, mmPayBlocked) &&
            meetsMinBalance(t),
        )
        .sort((a, b) => (b.fiat?.balance ?? 0) - (a.fiat?.balance ?? 0)),
    [allTokens, mmPayBlocked, meetsMinBalance],
  );

  return { tokens, isNoFeeToken };
};
