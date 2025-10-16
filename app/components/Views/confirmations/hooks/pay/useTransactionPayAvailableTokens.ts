import { useCallback, useMemo } from 'react';
import { useTokensWithBalance } from '../../../../UI/Bridge/hooks/useTokensWithBalance';
import { BridgeToken } from '../../../../UI/Bridge/types';
import { selectEnabledSourceChains } from '../../../../../core/redux/slices/bridge';
import { useSelector } from 'react-redux';
import { useTransactionPayToken } from './useTransactionPayToken';
import { useTransactionRequiredTokens } from './useTransactionRequiredTokens';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { uniq } from 'lodash';
import { TransactionMeta } from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import { useTransactionPayFiat } from './useTransactionPayFiat';
import { getRequiredBalance } from '../../utils/transaction-pay';
import { getNativeTokenAddress } from '../../utils/asset';

export function useTransactionPayAvailableTokens() {
  const supportedChains = useSelector(selectEnabledSourceChains);
  const { payToken } = useTransactionPayToken();
  const requiredTokens = useTransactionRequiredTokens();
  const { convertFiat, formatFiat } = useTransactionPayFiat();

  const transactionMeta =
    useTransactionMetadataRequest() ?? ({} as TransactionMeta);

  const { chainId: transactionChainId } = transactionMeta;

  const chainIds = useMemo(
    () => supportedChains.map((c) => c.chainId),
    [supportedChains],
  );

  const allTokens = useTokensWithBalance({ chainIds });

  const targetTokens = useMemo(
    () => requiredTokens.filter((t) => !t.skipIfBalance),
    [requiredTokens],
  );

  const minimumFiat = getRequiredBalance(transactionMeta);

  const isTokenAvailable = useCallback(
    (token: BridgeToken & { balanceUsd: number }) => {
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

      const fiatAmount = token.balanceUsd ?? 0;

      const isTokenBalanceSufficient = minimumFiat
        ? fiatAmount >= minimumFiat
        : fiatAmount > 0;

      if (!isTokenBalanceSufficient) {
        return false;
      }

      const nativeTokenAddress = getNativeTokenAddress(token.chainId as Hex);

      const nativeToken = allTokens.find(
        (t) => t.address === nativeTokenAddress && t.chainId === token.chainId,
      );

      const hasNativeBalance = (nativeToken?.tokenFiatAmount ?? 0) > 0;

      return hasNativeBalance;
    },
    [allTokens, minimumFiat, payToken, targetTokens, transactionChainId],
  );

  const updateFiatValues = useCallback(
    (token: BridgeToken) => {
      const balanceFiat = formatFiat(token.tokenFiatAmount ?? '0');
      const balanceUsd = convertFiat(token.tokenFiatAmount ?? '0');

      return {
        ...token,
        balanceFiat,
        balanceUsd,
      };
    },
    [convertFiat, formatFiat],
  );

  const availableTokens = useMemo(
    () => allTokens.map(updateFiatValues).filter(isTokenAvailable),
    [allTokens, isTokenAvailable, updateFiatValues],
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
