import { useEffect, useMemo, useRef } from 'react';
import { TransactionType } from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';

import {
  MUSD_CONVERSION_DEFAULT_CHAIN_ID,
  MUSD_TOKEN,
  MUSD_TOKEN_ADDRESS,
} from '../../../../UI/Earn/constants/musd';
import { isTestNet } from '../../../../../util/networks';
import { useAccountTokens } from '../send/useAccountTokens';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { useTransactionAccountOverride } from '../transactions/useTransactionAccountOverride';
import { hasTransactionType } from '../../utils/transaction';
import { useTransactionPayToken } from './useTransactionPayToken';

const MUSD_FALLBACK_TOKEN = {
  address: MUSD_TOKEN_ADDRESS,
  chainId: MUSD_CONVERSION_DEFAULT_CHAIN_ID,
  symbol: MUSD_TOKEN.symbol,
  decimals: MUSD_TOKEN.decimals,
} as const;

export function useMoneyAccountPayToken() {
  const transactionMeta = useTransactionMetadataRequest();
  const { payToken, setPayToken } = useTransactionPayToken();
  const accountOverride = useTransactionAccountOverride();

  const isMoneyAccountWithdraw = hasTransactionType(transactionMeta, [
    TransactionType.moneyAccountWithdraw,
  ]);
  const isMoneyAccountDeposit = hasTransactionType(transactionMeta, [
    TransactionType.moneyAccountDeposit,
  ]);

  const accountTokens = useAccountTokens();

  const isAwaitingAccountSelection =
    (isMoneyAccountDeposit || isMoneyAccountWithdraw) && !accountOverride;

  const initializedForAccountOverride = useRef<string | undefined>();

  useEffect(() => {
    if (
      !accountOverride ||
      initializedForAccountOverride.current === accountOverride
    ) {
      return;
    }

    if (isMoneyAccountWithdraw) {
      setPayToken({
        address: MUSD_TOKEN_ADDRESS,
        chainId: MUSD_CONVERSION_DEFAULT_CHAIN_ID,
      });
      initializedForAccountOverride.current = accountOverride;
      return;
    }

    if (isMoneyAccountDeposit) {
      const firstEvmToken = accountTokens.find(
        (t) => t.chainId?.startsWith('0x') && !isTestNet(t.chainId),
      );
      if (firstEvmToken) {
        setPayToken({
          address: firstEvmToken.address as Hex,
          chainId: firstEvmToken.chainId as Hex,
        });
        initializedForAccountOverride.current = accountOverride;
      }
    }
  }, [
    accountOverride,
    accountTokens,
    isMoneyAccountDeposit,
    isMoneyAccountWithdraw,
    setPayToken,
  ]);

  const displayToken = useMemo(() => {
    if (isMoneyAccountWithdraw) {
      return payToken ?? MUSD_FALLBACK_TOKEN;
    }
    return undefined;
  }, [isMoneyAccountWithdraw, payToken]);

  return {
    displayToken,
    isAwaitingAccountSelection,
    isMoneyAccountDeposit,
    isMoneyAccountWithdraw,
  };
}
