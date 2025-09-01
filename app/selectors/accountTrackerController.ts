import { createSelector } from 'reselect';
import { AccountTrackerControllerState } from '@metamask/assets-controllers';
import { RootState } from '../reducers';
import { createDeepEqualSelector } from './util';
import { selectEvmChainId } from './networkController';
import { selectSelectedInternalAccountFormattedAddress } from './accountsController';
import { Hex } from '@metamask/utils';

const selectAccountTrackerControllerState = (state: RootState) =>
  state.engine.backgroundState.AccountTrackerController;

export const selectAccountsByChainId = createDeepEqualSelector(
  selectAccountTrackerControllerState,
  (accountTrackerControllerState: AccountTrackerControllerState) =>
    accountTrackerControllerState.accountsByChainId,
);

export const selectAccounts = createDeepEqualSelector(
  selectAccountsByChainId,
  selectEvmChainId,
  selectSelectedInternalAccountFormattedAddress,
  (accountsByChainId, chainId) => accountsByChainId?.[chainId] || {},
);

export const selectAccountsLength = createSelector(
  selectAccounts,
  (accounts) => Object.keys(accounts).length,
);

export const selectAccountBalanceByChainId = createDeepEqualSelector(
  selectAccountsByChainId,
  selectEvmChainId,
  selectSelectedInternalAccountFormattedAddress,
  (_state: RootState, chainId?: Hex) => chainId,
  (
    accountsByChainId,
    globalChainId,
    selectedInternalAccountChecksummedAddress,
    chainId,
  ) => {
    const accountsBalance = selectedInternalAccountChecksummedAddress
      ? accountsByChainId?.[chainId ?? globalChainId]?.[
          selectedInternalAccountChecksummedAddress
        ]
      : undefined;
    return accountsBalance;
  },
);
