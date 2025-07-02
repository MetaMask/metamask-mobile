import { TransactionMeta } from '@metamask/transaction-controller';

import Engine from '../../../../../core/Engine';
import {
  batchApprovalConfirmation,
  downgradeAccountConfirmation,
  getAppStateForConfirmation,
} from '../../../../../util/test/confirm-data-helpers';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { BalanceChange } from '../../../../UI/SimulationDetails/types';
import { useBatchApproveBalanceActions } from './useBatchApproveBalanceActions';

jest.mock('../../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      NetworkController: {
        findNetworkClientIdByChainId: jest.fn().mockReturnValue('mainnet'),
      },
      TokenListController: {
        fetchTokenList: jest.fn(),
      },
      TransactionController: {
        updateAtomicBatchData: jest.fn(),
      },
    },
  },
}));

function runHook(confirmation?: TransactionMeta) {
  const { result, rerender } = renderHookWithProvider(
    () => useBatchApproveBalanceActions(),
    {
      state: getAppStateForConfirmation(
        confirmation ?? batchApprovalConfirmation,
      ),
    },
  );
  return { result: result.current, rerender };
}

describe('useBatchApproveBalanceActions', () => {
  it('call TransactionController.updateAtomicBatchData to update approval data', async () => {
    const mockUpdateAtomicBatchData = jest.fn().mockResolvedValue(undefined);
    Engine.context.TransactionController.updateAtomicBatchData =
      mockUpdateAtomicBatchData;
    const { result } = runHook();
    result.onApprovalAmountUpdate(
      {
        nestedTransactionIndex: 0,
        decimals: 4,
      } as unknown as BalanceChange,
      '100',
    );
    expect(mockUpdateAtomicBatchData).toHaveBeenCalledTimes(1);
  });

  it('does not call TransactionController.updateAtomicBatchData to update approval data if there are no nested transactions', async () => {
    const mockUpdateAtomicBatchData = jest.fn().mockResolvedValue(undefined);
    Engine.context.TransactionController.updateAtomicBatchData =
      mockUpdateAtomicBatchData;
    const { result } = runHook(downgradeAccountConfirmation);
    result.onApprovalAmountUpdate(
      {
        nestedTransactionIndex: -1,
        decimals: 4,
      } as unknown as BalanceChange,
      '100',
    );
    expect(mockUpdateAtomicBatchData).toHaveBeenCalledTimes(0);
  });
});
