import { renderHook, waitFor } from '@testing-library/react-native';
import { TransactionType } from '@metamask/transaction-controller';

import Engine from '../../../../../core/Engine';
import { addTransaction } from '../../../../../util/transaction-controller';
import { useTransactionMetadataRequest } from './useTransactionMetadataRequest';
import { useSyncPerpsLighterTransactionType } from './useSyncPerpsLighterTransactionType';

jest.mock('../../../../../core/Engine', () => ({
  context: {
    ApprovalController: {
      rejectRequest: jest.fn(),
    },
  },
}));

jest.mock('../../../../../util/transaction-controller', () => ({
  addTransaction: jest.fn(),
}));

jest.mock('../../../../../util/Logger', () => ({
  __esModule: true,
  default: { error: jest.fn() },
}));

jest.mock('./useTransactionMetadataRequest', () => ({
  useTransactionMetadataRequest: jest.fn(),
}));

const mockAddTransaction = jest.mocked(addTransaction);
const mockUseTransactionMetadataRequest = jest.mocked(
  useTransactionMetadataRequest,
);

const hyperliquidDeposit = {
  id: 'tx-1',
  networkClientId: 'network-client-1',
  origin: 'metamask',
  txParams: { from: '0xabc', value: '0x1' },
  type: TransactionType.perpsDeposit,
};

describe('useSyncPerpsLighterTransactionType', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAddTransaction.mockResolvedValue({} as never);
  });

  it('recreates the transaction when the user switches to Lighter', async () => {
    mockUseTransactionMetadataRequest.mockReturnValue(
      hyperliquidDeposit as never,
    );

    renderHook(() =>
      useSyncPerpsLighterTransactionType({
        destination: 'lighter',
        source: 'hyperliquid',
      }),
    );

    expect(mockAddTransaction).toHaveBeenCalledWith(
      expect.objectContaining({ from: '0xabc', value: '0x1' }),
      expect.objectContaining({
        networkClientId: 'network-client-1',
        origin: 'metamask',
        requireApproval: true,
        type: TransactionType.perpsLighterDeposit,
      }),
    );

    await waitFor(() => {
      expect(
        Engine.context.ApprovalController.rejectRequest,
      ).toHaveBeenCalledWith('tx-1', expect.anything());
    });
  });

  it('recreates the transaction when the user switches back to Hyperliquid', async () => {
    mockUseTransactionMetadataRequest.mockReturnValue({
      ...hyperliquidDeposit,
      type: TransactionType.perpsLighterDeposit,
    } as never);

    renderHook(() =>
      useSyncPerpsLighterTransactionType({
        destination: 'hyperliquid',
        source: 'lighter',
      }),
    );

    expect(mockAddTransaction).toHaveBeenCalledWith(
      expect.objectContaining({ from: '0xabc', value: '0x1' }),
      expect.objectContaining({
        requireApproval: true,
        type: TransactionType.perpsDeposit,
      }),
    );

    await waitFor(() => {
      expect(
        Engine.context.ApprovalController.rejectRequest,
      ).toHaveBeenCalledWith('tx-1', expect.anything());
    });
  });

  it('does not recreate when the open transaction already has the selected type', () => {
    mockUseTransactionMetadataRequest.mockReturnValue(
      hyperliquidDeposit as never,
    );

    renderHook(() =>
      useSyncPerpsLighterTransactionType({
        destination: 'hyperliquid',
        source: 'hyperliquid',
      }),
    );

    expect(mockAddTransaction).not.toHaveBeenCalled();
  });
});
