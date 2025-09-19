import { useCallback, useMemo } from 'react';
import { useTokensWithBalance } from '../../../../UI/Bridge/hooks/useTokensWithBalance';
import { BridgeToken } from '../../../../UI/Bridge/types';
import { selectEnabledSourceChains } from '../../../../../core/redux/slices/bridge';
import { useSelector } from 'react-redux';
import { useTransactionPayToken } from './useTransactionPayToken';
import { useTransactionRequiredTokens } from './useTransactionRequiredTokens';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { NATIVE_TOKEN_ADDRESS } from '../../constants/tokens';
import { uniq } from 'lodash';
import { TransactionType } from '@metamask/transaction-controller';
import { PERPS_MINIMUM_DEPOSIT } from '../../constants/perps';
import { Hex } from '@metamask/utils';

export function useTransactionPayAvailableTokens() {
  const supportedChains = useSelector(selectEnabledSourceChains);
  const { payToken } = useTransactionPayToken();
  const requiredTokens = useTransactionRequiredTokens();

  const { chainId: transactionChainId, type } =
    useTransactionMetadataRequest() ?? {};

  const chainIds = useMemo(
    () => supportedChains.map((c) => c.chainId),
    [supportedChains],
  );

  const allTokens = useTokensWithBalance({ chainIds });

  const targetTokens = useMemo(
    () => requiredTokens.filter((t) => !t.skipIfBalance),
    [requiredTokens],
  );

  const minimumFiat =
    type === TransactionType.perpsDeposit ? PERPS_MINIMUM_DEPOSIT : 0;

  const isTokenAvailable = useCallback(
    (token: BridgeToken) => {
      const isSelected =
        payToken?.address.toLowerCase() === token.address.toLowerCase() &&
        payToken?.chainId === token.chainId;

      if (isSelected) {
        return true;
      }

      const isRequiredToken = targetTokens.some(
        (t) =>
          t.address.toLowerCase() === token.address.toLowerCase() &&
          transactionChainId === token.chainId,
      );

      if (isRequiredToken) {
        return true;
      }

      const fiatAmount = token.tokenFiatAmount ?? 0;

      const isTokenBalanceSufficient = minimumFiat
        ? fiatAmount >= minimumFiat
        : fiatAmount > 0;

      if (!isTokenBalanceSufficient) {
        return false;
      }

      const nativeToken = allTokens.find(
        (t) =>
          t.address === NATIVE_TOKEN_ADDRESS && t.chainId === token.chainId,
      );

      const hasNativeBalance = (nativeToken?.tokenFiatAmount ?? 0) > 0;

      return hasNativeBalance;
    },
    [allTokens, minimumFiat, payToken, targetTokens, transactionChainId],
  );

  const availableTokens = useMemo(
    () => allTokens.filter(isTokenAvailable),
    [allTokens, isTokenAvailable],
  );

  const availableChainIds = useMemo(
    () => uniq(availableTokens.map((t) => t.chainId as Hex)),
    [availableTokens],
  );

  return {
    availableChainIds,
    availableTokens,
  };
}
