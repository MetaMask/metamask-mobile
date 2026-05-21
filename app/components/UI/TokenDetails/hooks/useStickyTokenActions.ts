import { useSelector } from 'react-redux';
import { useAddNetwork } from '../../../hooks/useAddNetwork';
import { selectHasEligibleSwapSource } from '../../../../selectors/assets/assets-list';
import type { RootState } from '../../../../reducers';
import {
  TokenActionInput,
  useHandleOnBuy,
  useHandleOnSwap,
} from './useTokenAtomicActions';

/**
 * Composed hook for the Token Details sticky footer.
 */
export const useStickyTokenActions = ({
  token,
  currentTokenBalance,
  sourcePage = 'MainView',
}: {
  token: TokenActionInput;
  /** Optional up-to-date token balance from Token Details balance hook */
  currentTokenBalance?: string;
  /** Page name sent with swap/bridge analytics. Defaults to `'MainView'`. */
  sourcePage?: string;
}) => {
  const hasEligibleSwapTokens = useSelector((state: RootState) =>
    selectHasEligibleSwapSource(state, token.chainId, token.address),
  );

  const onBuy = useHandleOnBuy({ token });
  const onSwap = useHandleOnSwap({ token, currentTokenBalance, sourcePage });

  const { networkModal } = useAddNetwork();

  return {
    onBuy,
    onSwap,
    hasEligibleSwapTokens,
    networkModal,
  };
};

export default useStickyTokenActions;
