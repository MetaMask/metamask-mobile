/* eslint-disable import/prefer-default-export */
import { createSelector } from 'reselect';
import { RootState } from '../reducers';
import { TokenBalancesControllerState } from '@metamask/assets-controllers';
import { selectChainId } from './networkController';
import { selectSelectedInternalAccountAddress } from './accountsController';
import { HexString } from '../components/UI/Tokens/types';

const selectTokenBalancesControllerState = (state: RootState) =>
  state.engine.backgroundState.TokenBalancesController;

// TODO: Needs controller updates for both of these to work
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
    tokenBalancesControllerState.tokenBalances?.[address as HexString]?.[
      chainId as `0x${string}`
    ] ?? {},
);
