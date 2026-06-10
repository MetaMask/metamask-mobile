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
import { useMoneyAnalytics } from './useMoneyAnalytics';
import {
  COMPONENT_NAMES,
  MONEY_BUTTON_INTENTS,
  MONEY_BUTTON_TYPES,
  SCREEN_NAMES,
} from '../constants/moneyEvents';

export interface UseMoneyAccountAddRoutingOptions {
  componentName?: COMPONENT_NAMES;
}

export interface UseMoneyAccountAddRoutingResult {
  hasMusdBalance: boolean;
  convertCrypto: () => Promise<void>;
  depositFunds: () => void;
  moveMusd: () => Promise<void>;
  routeAddMoney: () => Promise<void> | void;
}

export const useMoneyAccountAddRouting = ({
  componentName,
}: UseMoneyAccountAddRoutingOptions = {}): UseMoneyAccountAddRoutingResult => {
  const {
    fiatBalanceAggregated,
    hasMusdBalanceOnAnyChain,
    tokenBalanceByChain,
  } = useMusdBalance();
  const { getChainIdForBuyFlow } = useMusdConversionFlowData();
  const { goToBuy } = useRampNavigation();
  const { initiateDeposit } = useMoneyAccountDeposit();
  const { trackButtonClicked } = useMoneyAnalytics({
    component_name: componentName,
  });

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
    trackButtonClicked({
      button_type: MONEY_BUTTON_TYPES.TEXT,
      button_intent: MONEY_BUTTON_INTENTS.ADD_MONEY,
      label_key: 'money.musd_row.add',
      redirect_target: SCREEN_NAMES.MONEY_DEPOSIT,
    });
    if (hasMusdBalance) {
      return moveMusd();
    }
    return depositFunds();
  }, [depositFunds, hasMusdBalance, moveMusd, trackButtonClicked]);

  return {
    hasMusdBalance,
    convertCrypto,
    depositFunds,
    moveMusd,
    routeAddMoney,
  };
};
