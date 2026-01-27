import { createSelector } from 'reselect';
import { AccountTrackerControllerState } from '@metamask/assets-controllers';
import { RootState } from '../reducers';
import { createDeepEqualSelector } from './util';
import { selectEvmChainId } from './networkController';
import { selectSelectedInternalAccountFormattedAddress } from './accountsController';
import { Hex } from '@metamask/utils';

// TODO Unified Assets Controller State Access (1)
// AccountTrackerController: accountsByChainId
// References
// app/selectors/accountTrackerController.ts (1)
const selectAccountTrackerControllerState = (state: RootState) =>
  state.engine.backgroundState.AccountTrackerController;

// TODO Unified Assets Controller State Access (1)
// AccountTrackerController: accountsByChainId
// References
// app/selectors/accountTrackerController.ts (2)
// app/selectors/assets/assets-list.ts (1)
// app/selectors/earnController/earn/index.ts (1)
// app/selectors/multichain/evm.ts (1)
// app/components/UI/AssetOverview/AssetOverview.tsx (1)
// app/components/Views/ActivityView/index.js (1)
// app/components/UI/Swaps/index.js (1)
// app/components/UI/Ramp/Aggregator/hooks/useBalance.ts (1)
// app/components/hooks/useAddressBalance/useAddressBalance.ts (1)
// app/components/Views/confirmations/legacy/ApproveView/Approve/index.js (1)
// app/components/Views/confirmations/legacy/Approve/index.js (1)
// app/components/Views/confirmations/hooks/tokens/useTokenWithBalance.ts (1)
// app/components/UI/Ramp/Aggregator/hooks/useHandleSuccessfulOrder.ts (1)
// app/components/UI/Bridge/hooks/useTokensWithBalance/index.ts (1)
// app/components/UI/AccountFromToInfoCard/AddressFrom.tsx (1)
// app/components/Views/confirmations/legacy/Approval/components/TransactionEditor/index.js (1)
// app/components/Views/confirmations/legacy/components/ApproveTransactionHeader/ApproveTransactionHeader.tsx (1)
// app/components/UI/Stake/hooks/useBalance.ts (1)
// app/components/hooks/useGetTotalFiatBalanceCrossChains.tsx (1)
// app/components/Views/confirmations/hooks/useAccountNativeBalance.ts (1)
// app/components/Views/confirmations/legacy/SendFlow/AddressFrom/AddressFrom.tsx (1)
export const selectAccountsByChainId = createDeepEqualSelector(
  selectAccountTrackerControllerState,
  (accountTrackerControllerState: AccountTrackerControllerState) =>
    accountTrackerControllerState?.accountsByChainId ?? {},
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
