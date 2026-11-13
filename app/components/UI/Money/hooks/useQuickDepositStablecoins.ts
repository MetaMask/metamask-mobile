import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { Hex } from '@metamask/utils';
import { selectRemoteFeatureFlags } from '../../../../selectors/featureFlagController';
import { selectTokensBalances } from '../../../../selectors/tokenBalancesController';
import { selectSelectedInternalAccountByScope } from '../../../../selectors/multichainAccounts/accounts';
import { EVM_SCOPE } from '../../Earn/constants/networks';
import { RootState } from '../../../../reducers';
import { selectMoneyDepositBlockedTokens } from '../selectors/depositTokens';
import {
  buildQuickDepositStablecoinOptions,
  type AccountTokenBalances,
  type QuickDepositStablecoinOption,
} from '../utils/quickDepositStablecoins';

/**
 * USDC and USDT the selected EVM account can quick-deposit into the Money
 * account. Empty when the account holds neither token on a chain this flow
 * supports.
 */
export const useQuickDepositStablecoins =
  (): QuickDepositStablecoinOption[] => {
    const selectedEvmAddress = useSelector(
      (state: RootState) =>
        selectSelectedInternalAccountByScope(state)(EVM_SCOPE)?.address,
    );
    const tokenBalances = useSelector(selectTokensBalances);
    const blockedTokens = useSelector(selectMoneyDepositBlockedTokens);
    const remoteFeatureFlags = useSelector(selectRemoteFeatureFlags);

    return useMemo(() => {
      const accountBalances = selectedEvmAddress
        ? (tokenBalances?.[selectedEvmAddress as Hex] ??
          tokenBalances?.[selectedEvmAddress.toLowerCase() as Hex])
        : undefined;

      return buildQuickDepositStablecoinOptions({
        relayFlag: remoteFeatureFlags?.confirmations_relay_fixed_spread,
        // TokenBalancesController stores checksummed hex keys. The builder
        // only reads them, so the controller's branded Hex map is safe here.
        accountBalances: accountBalances as AccountTokenBalances | undefined,
        blockedTokens,
      });
    }, [blockedTokens, remoteFeatureFlags, selectedEvmAddress, tokenBalances]);
  };
