/* eslint-disable import/prefer-default-export */
import { createSelector } from 'reselect';
import { RootState } from '../reducers';
import { TokenBalancesControllerState } from '@metamask/assets-controllers';
import { selectChainId } from './networkController';
import { selectSelectedInternalAccountAddress } from './accountsController';

const selectTokenBalancesControllerState = (state: RootState) =>
  state.engine.backgroundState.TokenBalancesController;

export const selectTokensBalances = createSelector(
  selectTokenBalancesControllerState,
  (tokenBalancesControllerState: TokenBalancesControllerState) =>
    tokenBalancesControllerState.tokenBalances,
);

export const selectContractBalances = createSelector(
  selectTokenBalancesControllerState,
  selectChainId,
  selectSelectedInternalAccountAddress,
  (
    tokenBalancesControllerState: TokenBalancesControllerState,
    chainId: string,
    address,
  ) =>
    tokenBalancesControllerState.tokenBalances?.[address as `0x${string}`]?.[
      chainId as `0x${string}`
    ] ?? {},
);
