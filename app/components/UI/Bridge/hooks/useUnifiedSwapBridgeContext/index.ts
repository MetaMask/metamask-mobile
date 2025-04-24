import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  selectDestToken,
  selectSourceToken,
} from '../../../../../core/redux/slices/bridge';
import { selectShouldUseSmartTransaction } from '../../../../../selectors/smartTransactionsController';

export const useUnifiedSwapBridgeContext = () => {
  const smartTransactionsEnabled = useSelector(selectShouldUseSmartTransaction);
  const fromToken = useSelector(selectSourceToken);
  const toToken = useSelector(selectDestToken);

  return useMemo(
    () => ({
      stx_enabled: smartTransactionsEnabled,
      token_symbol_source: fromToken?.symbol ?? '',
      token_symbol_destination: toToken?.symbol ?? '',
      security_warnings: [], // TODO
      warnings: [], // TODO
    }),
    [smartTransactionsEnabled, fromToken, toToken],
  );
};
