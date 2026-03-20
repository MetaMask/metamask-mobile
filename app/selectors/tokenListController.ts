import { createSelector } from 'reselect';
import { TokenListState } from '@metamask/assets-controllers';
import { RootState } from '../reducers';
import { selectEvmChainId } from './networkController';

const selectTokenListConstrollerState = (state: RootState) =>
  state.engine.backgroundState.TokenListController;

/**
 * Return token list from TokenListController.
 * Can pass directly into useSelector.
 *
 * @deprecated `tokensChainsCache` is deprecated. Use `useERC20Tokens` from
 * `app/components/hooks/DisplayName/useERC20Tokens.ts` to fetch token metadata instead.
 */
export const selectTokenList = createSelector(
  selectTokenListConstrollerState,
  selectEvmChainId,
  (tokenListControllerState: TokenListState, chainId) =>
    tokenListControllerState?.tokensChainsCache?.[chainId]?.data || [],
);
