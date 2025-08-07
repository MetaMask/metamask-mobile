import { useDispatch, useSelector } from 'react-redux';
import { useTokensWithBalance } from '../../../../UI/Bridge/hooks/useTokensWithBalance';
import { selectEnabledSourceChains } from '../../../../../core/redux/slices/bridge';
import { useTransactionRequiredTokens } from './useTransactionRequiredTokens';
import { NATIVE_TOKEN_ADDRESS } from '../../constants/tokens';
import { useTransactionRequiredFiat } from './useTransactionRequiredFiat';
import { useTransactionMetadataOrThrow } from '../transactions/useTransactionMetadataRequest';
import { orderBy } from 'lodash';
import { useEffect, useState } from 'react';
import { setTransactionPayToken } from '../../../../../core/redux/slices/confirmationMetrics';
import { Hex } from 'viem';
import { createProjectLogger } from '@metamask/utils';

const log = createProjectLogger('transaction-pay');

export function useAutomaticTransactionPayToken({
  balanceOverrides,
}: {
  balanceOverrides?: { address: Hex; balance: number; chainId: Hex }[];
} = {}) {
  const dispatch = useDispatch();
  const [isUpdated, setIsUpdated] = useState(false);
  const { id: transactionId } = useTransactionMetadataOrThrow();

  const supportedChainIds = useSelector(selectEnabledSourceChains).map(
    (chain) => chain.chainId,
  );

  const { totalWithBalanceFiat } = useTransactionRequiredFiat();
  const tokens = useTokensWithBalance({ chainIds: supportedChainIds });
  const requiredTokens = useTransactionRequiredTokens();
  const { chainId } = useTransactionMetadataOrThrow();

  const targetToken =
    requiredTokens.find((token) => token.address !== NATIVE_TOKEN_ADDRESS) ??
    requiredTokens[0];

  const requiredBalance =
    balanceOverrides?.find(
      (token) =>
        token.address.toLowerCase() === targetToken?.address?.toLowerCase() &&
        token.chainId === chainId,
    )?.balance ?? totalWithBalanceFiat;

  const sufficientBalanceTokens = orderBy(
    tokens.filter((token) => (token.tokenFiatAmount ?? 0) >= requiredBalance),
    (token) => token?.tokenFiatAmount ?? 0,
    'desc',
  );

  const requiredToken = sufficientBalanceTokens.find(
    (token) =>
      token.address === targetToken?.address && token.chainId === chainId,
  );

  const sameChainHighestBalanceToken = sufficientBalanceTokens?.find(
    (token) => token.chainId === chainId,
  );

  const alternateChainHighestBalanceToken = sufficientBalanceTokens?.find(
    (token) => token.chainId !== chainId,
  );

  const automaticToken =
    requiredToken ??
    sameChainHighestBalanceToken ??
    alternateChainHighestBalanceToken;

  useEffect(() => {
    if (isUpdated || !automaticToken) {
      return;
    }

    dispatch(
      setTransactionPayToken({
        transactionId,
        payToken: {
          address: automaticToken.address as Hex,
          chainId: automaticToken.chainId as Hex,
        },
      }),
    );

    setIsUpdated(true);

    log('Automatically selected pay token', automaticToken);
  }, [automaticToken, dispatch, isUpdated, transactionId]);
}
