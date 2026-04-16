import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { createProjectLogger } from '@metamask/utils';
import { useTransactionPayToken } from './useTransactionPayToken';
import { isHardwareAccount } from '../../../../../util/address';
import { TransactionMeta } from '@metamask/transaction-controller';
import { useTransactionPayRequiredTokens } from './useTransactionPayData';
import { useTransactionPayAvailableTokens } from './useTransactionPayAvailableTokens';
import {
  getPostQuoteTransactionType,
  isTransactionPayWithdraw,
} from '../../utils/transaction';
import { useSelector } from 'react-redux';
import {
  selectMetaMaskPayTokensFlags,
  getPreferredTokensForTransactionType,
} from '../../../../../selectors/featureFlagController/confirmations';
import { RootState } from '../../../../../reducers';
import { selectLastWithdrawTokenByType } from '../../../../../selectors/transactionController';
import { useWithdrawTokenFilter } from './useWithdrawTokenFilter';
import { getBestToken, SetPayTokenRequest } from '../../utils/getBestToken';

export type { SetPayTokenRequest } from '../../utils/getBestToken';

const log = createProjectLogger('transaction-pay');

export function useAutomaticTransactionPayToken({
  disable = false,
  preferredToken,
}: {
  disable?: boolean;
  preferredToken?: SetPayTokenRequest;
} = {}) {
  const isUpdated = useRef<string | undefined>();
  const { payToken, setPayToken } = useTransactionPayToken();
  const requiredTokens = useTransactionPayRequiredTokens();
  const { availableTokens } = useTransactionPayAvailableTokens();
  const payTokensFlags = useSelector(selectMetaMaskPayTokensFlags);

  const transactionMetaRequest = useTransactionMetadataRequest();
  const transactionMeta = useMemo(
    () => transactionMetaRequest ?? ({ txParams: {} } as TransactionMeta),
    [transactionMetaRequest],
  );
  const transactionId = transactionMeta.id;
  const postQuoteTransactionType = getPostQuoteTransactionType(transactionMeta);

  const {
    txParams: { from },
  } = transactionMeta;

  const isHardwareWallet = useMemo(
    () => isHardwareAccount(from ?? '') ?? false,
    [from],
  );

  const targetToken = useMemo(
    () => requiredTokens.find((token) => !token.allowUnderMinimum),
    [requiredTokens],
  );

  const preferredTokensFromFlags = useMemo(
    () =>
      getPreferredTokensForTransactionType(
        payTokensFlags.preferredTokens,
        postQuoteTransactionType ?? transactionMeta.type,
      ),
    [
      transactionMeta.type,
      postQuoteTransactionType,
      payTokensFlags.preferredTokens,
    ],
  );

  const isWithdraw = isTransactionPayWithdraw(transactionMeta);
  const lastWithdrawToken = useSelector((state: RootState) =>
    selectLastWithdrawTokenByType(state, postQuoteTransactionType),
  );
  const withdrawTokenFilter = useWithdrawTokenFilter();

  const tokens = useMemo(
    () =>
      isWithdraw
        ? withdrawTokenFilter(availableTokens)
        : availableTokens.filter((t) => !t.disabled),
    [availableTokens, isWithdraw, withdrawTokenFilter],
  );

  const selectBestToken = useCallback(
    () =>
      getBestToken({
        isHardwareWallet,
        isWithdraw,
        lastWithdrawToken,
        targetToken,
        tokens,
        preferredToken,
        preferredTokensFromFlags,
        minimumRequiredTokenBalance: payTokensFlags.minimumRequiredTokenBalance,
      }),
    [
      isHardwareWallet,
      isWithdraw,
      lastWithdrawToken,
      payTokensFlags.minimumRequiredTokenBalance,
      preferredToken,
      preferredTokensFromFlags,
      targetToken,
      tokens,
    ],
  );

  useEffect(() => {
    if (
      disable ||
      payToken ||
      !transactionId ||
      isUpdated.current === transactionId
    ) {
      return;
    }

    const automaticToken = selectBestToken();

    if (!automaticToken) {
      log('No automatic pay token found');
      return;
    }

    setPayToken({
      address: automaticToken.address,
      chainId: automaticToken.chainId,
    });

    isUpdated.current = transactionId;

    log('Automatically selected pay token', automaticToken);
  }, [
    disable,
    payToken,
    requiredTokens,
    selectBestToken,
    setPayToken,
    tokens,
    transactionId,
  ]);

  const prevFromRef = useRef(from);
  useEffect(() => {
    if (disable || !from || from === prevFromRef.current) {
      return;
    }
    prevFromRef.current = from;

    const automaticToken = selectBestToken();
    if (automaticToken) {
      setPayToken({
        address: automaticToken.address,
        chainId: automaticToken.chainId,
      });
      log('Re-selected pay token after account change', automaticToken);
    }
  }, [disable, from, selectBestToken, setPayToken]);
}
