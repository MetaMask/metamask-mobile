import { renderHook } from '@testing-library/react-hooks';
import type { TransactionMeta } from '@metamask/transaction-controller';

import { usePersistGasFeePreference } from './usePersistGasFeePreference';
import Engine from '../../../../../core/Engine';

const mockSetAdvancedGasFee = jest.mocked(
  Engine.context.PreferencesController.setAdvancedGasFee,
);

describe('usePersistGasFeePreference', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('persists gas fee preferences for the transaction account and chain', () => {
    const transactionMeta = {
      chainId: '0x1',
      txParams: {
        from: '0x123',
      },
    } as unknown as TransactionMeta;

    const { result } = renderHook(() => usePersistGasFeePreference());

    result.current(transactionMeta, {
      userFeeLevel: 'custom',
      maxBaseFee: '0x1',
      priorityFee: '0x2',
    });

    expect(mockSetAdvancedGasFee).toHaveBeenCalledWith({
      account: '0x123',
      chainId: '0x1',
      gasFeePreferences: {
        userFeeLevel: 'custom',
        maxBaseFee: '0.000000001',
        priorityFee: '0.000000002',
      },
    });
  });

  it('does not persist without an account', () => {
    const transactionMeta = {
      chainId: '0x1',
      txParams: {},
    } as unknown as TransactionMeta;

    const { result } = renderHook(() => usePersistGasFeePreference());

    result.current(transactionMeta, {
      userFeeLevel: 'medium',
    });

    expect(mockSetAdvancedGasFee).not.toHaveBeenCalled();
  });
});
