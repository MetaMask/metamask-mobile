import { useCallback, useMemo } from 'react';
import BigNumber from 'bignumber.js';
import { Hex } from '@metamask/utils';
import { useMusdBalance } from '../../Earn/hooks/useMusdBalance';
import { useMusdConversionFlowData } from '../../Earn/hooks/useMusdConversionFlowData';
import { useRampNavigation } from '../../Ramp/hooks/useRampNavigation';
import { useMoneyAccountDeposit } from './useMoneyAccount';
import {
  MUSD_CONVERSION_DEFAULT_CHAIN_ID,
  MUSD_TOKEN_ADDRESS_BY_CHAIN,
  MUSD_TOKEN_ASSET_ID_BY_CHAIN,
} from '../../Earn/constants/musd';
export interface UseMoneyAccountAddRoutingResult {
  hasMusdBalance: boolean;
  convertCrypto: () => Promise<void>;
  depositFunds: () => void;
  moveMusd: () => Promise<void>;
  routeAddMoney: () => Promise<void> | void;
}

export const useMoneyAccountAddRouting =
  (): UseMoneyAccountAddRoutingResult => {
    const {
      fiatBalanceAggregated,
      hasMusdBalanceOnAnyChain,
      tokenBalanceByChain,
    } = useMusdBalance();
    const { getChainIdForBuyFlow } = useMusdConversionFlowData();
    const { goToBuy } = useRampNavigation();
    const { initiateDeposit } = useMoneyAccountDeposit();

    const hasMusdBalance = useMemo(() => {
      const parsedMusdFiat = Number(fiatBalanceAggregated);
      const hasParsedFiatBalance =
        Number.isFinite(parsedMusdFiat) && parsedMusdFiat > 0;
      return hasMusdBalanceOnAnyChain || hasParsedFiatBalance;
    }, [fiatBalanceAggregated, hasMusdBalanceOnAnyChain]);

    const convertCrypto = useCallback(
      () => initiateDeposit().catch(() => undefined),
      [initiateDeposit],
    );

    const depositFunds = useCallback(() => {
      const chainId = getChainIdForBuyFlow
        ? getChainIdForBuyFlow()
        : MUSD_CONVERSION_DEFAULT_CHAIN_ID;
      const assetId =
        MUSD_TOKEN_ASSET_ID_BY_CHAIN[chainId] ??
        MUSD_TOKEN_ASSET_ID_BY_CHAIN[MUSD_CONVERSION_DEFAULT_CHAIN_ID];
      goToBuy({ assetId });
    }, [getChainIdForBuyFlow, goToBuy]);

    const moveMusd = useCallback(() => {
      let sourceChainId: Hex = MUSD_CONVERSION_DEFAULT_CHAIN_ID;
      let bestBalance = new BigNumber(0);
      for (const [chainId, balance] of Object.entries(
        tokenBalanceByChain ?? {},
      )) {
        const candidate = new BigNumber(balance ?? 0);
        if (candidate.isGreaterThan(bestBalance)) {
          sourceChainId = chainId as Hex;
          bestBalance = candidate;
        }
      }

      return initiateDeposit({
        intent: 'addMusd',
        preferredPaymentToken: {
          address: MUSD_TOKEN_ADDRESS_BY_CHAIN[sourceChainId],
          chainId: sourceChainId,
        },
      }).catch(() => undefined);
    }, [initiateDeposit, tokenBalanceByChain]);

    const routeAddMoney = useCallback(() => {
      if (hasMusdBalance) {
        return moveMusd();
      }
      return depositFunds();
    }, [depositFunds, hasMusdBalance, moveMusd]);

    return {
      hasMusdBalance,
      convertCrypto,
      depositFunds,
      moveMusd,
      routeAddMoney,
    };
  };
