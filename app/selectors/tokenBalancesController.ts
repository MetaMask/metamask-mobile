/* eslint-disable import/prefer-default-export */
import { Hex } from '@metamask/utils';
import { createSelector } from 'reselect';
import { RootState } from '../reducers';
import { TokenBalancesControllerState } from '@metamask/assets-controllers';
import { selectSelectedInternalAccountAddress } from './accountsController';
import { selectChainId } from './networkController';

const selectTokenBalancesControllerState = (state: RootState) =>
  state.engine.backgroundState.TokenBalancesController;

export const selectTokensBalances = createSelector(
  selectTokenBalancesControllerState,
  (tokenBalancesControllerState: TokenBalancesControllerState) =>
    tokenBalancesControllerState.tokenBalances,
);

export const selectContractBalances = createSelector(
  selectTokenBalancesControllerState,
  selectSelectedInternalAccountAddress,
  selectChainId,
  (
    tokenBalancesControllerState: TokenBalancesControllerState,
    selectedInternalAccountAddress: string | undefined,
    chainId: string,
  ) =>
    tokenBalancesControllerState.tokenBalances?.[
      selectedInternalAccountAddress as Hex
    ]?.[chainId as Hex] ?? {},
);

export const selectAllTokenBalances = createSelector(
  selectTokenBalancesControllerState,
  (tokenBalancesControllerState: TokenBalancesControllerState) =>
    tokenBalancesControllerState.tokenBalances,
);
