import { createSelector } from 'reselect';
import { TokenListState } from '@metamask/assets-controllers';
import { RootState } from '../reducers';
import { tokenListToArray } from '../util/tokens';
import { createDeepEqualSelector } from '../selectors/util';
import { selectEvmChainId } from './networkController';

// TODO Unified Assets Controller State Access (1)
// TokenListController: tokensChainsCache
// References
// app/selectors/tokenListController.ts (2)
const selectTokenListConstrollerState = (state: RootState) =>
  state.engine.backgroundState.TokenListController;

// TODO Unified Assets Controller State Access (1)
// TokenListController: tokensChainsCache
// References
// app/selectors/tokenListController.ts (1)
// app/selectors/multichain/evm.ts (1)
// app/reducers/swaps/index.js (4)
// app/components/Views/AssetOptions/AssetOptions.tsx (1)
// app/components/Nav/Main/RootRPCMethodsUI.js (1)
// app/components/Views/confirmations/legacy/components/TransactionReview/index.js (1)
// app/components/Views/confirmations/legacy/Send/index.js (1)
// app/components/UI/Perps/hooks/useWithdrawTokens.ts (1)
// app/components/UI/Perps/hooks/usePerpsPaymentTokens.ts (1)
// app/components/UI/PaymentRequest/AssetList/index.tsx (1)
// app/components/UI/TokenImage/index.js (1)
/**
 * Return token list from TokenListController.
 * Can pass directly into useSelector.
 */
export const selectTokenList = createSelector(
  selectTokenListConstrollerState,
  selectEvmChainId,
  (tokenListControllerState: TokenListState, chainId) =>
    tokenListControllerState?.tokensChainsCache?.[chainId]?.data || [],
);

/**
 * Return token list array from TokenListController.
 * Can pass directly into useSelector.
 */
export const selectTokenListArray = createDeepEqualSelector(
  selectTokenList,
  tokenListToArray,
);

// TODO Unified Assets Controller State Access (1)
// TokenListController: tokensChainsCache
// References
// app/selectors/tokenListController.ts (1)
// app/components/Views/confirmations/legacy/components/ApproveTransactionReview/index.js (1)
// app/components/UI/Earn/hooks/useMusdConversionStatus.ts (1)
// app/components/UI/Bridge/hooks/useTopTokens/index.ts (1)
// app/components/hooks/DisplayName/useERC20Tokens.ts (1)
const selectERC20TokensByChainInternal = createDeepEqualSelector(
  selectTokenListConstrollerState,
  (tokenListControllerState) => tokenListControllerState?.tokensChainsCache,
);

export const selectERC20TokensByChain = createDeepEqualSelector(
  selectERC20TokensByChainInternal,
  (tokensChainsCache) => tokensChainsCache,
);
