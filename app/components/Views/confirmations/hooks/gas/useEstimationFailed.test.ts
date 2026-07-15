import {
  TransactionMeta,
  TransactionStatus,
  TransactionType,
  UserFeeLevel,
} from '@metamask/transaction-controller';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { useEstimationFailed } from './useEstimationFailed';

jest.mock('../transactions/useTransactionMetadataRequest');

const MOCK_TRANSACTION_META = {
  id: '1',
  status: TransactionStatus.unapproved,
  type: TransactionType.contractInteraction,
  chainId: '0x1',
  simulationFails: undefined,
} as unknown as TransactionMeta;

function runHook(transactionMeta: TransactionMeta | undefined) {
  const mockUseTransactionMetadataRequest = jest.mocked(
    useTransactionMetadataRequest,
  );
  mockUseTransactionMetadataRequest.mockReturnValue(transactionMeta);

  const { result } = renderHookWithProvider(() => useEstimationFailed());

  return result.current;
}

describe('useEstimationFailed', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns false when simulationFails is undefined', () => {
    const result = runHook({
      ...MOCK_TRANSACTION_META,
      simulationFails: undefined,
    });

    expect(result).toBe(false);
  });

  it('returns false when simulationFails is undefined and userFeeLevel is CUSTOM', () => {
    const result = runHook({
      ...MOCK_TRANSACTION_META,
      simulationFails: undefined,
      userFeeLevel: UserFeeLevel.CUSTOM,
    });

    expect(result).toBe(false);
  });

  it('returns true when simulationFails is truthy and userFeeLevel is not CUSTOM', () => {
    const result = runHook({
      ...MOCK_TRANSACTION_META,
      simulationFails: { debug: {} },
      userFeeLevel: UserFeeLevel.MEDIUM,
    } as unknown as TransactionMeta);

    expect(result).toBe(true);
  });

  it('returns false when simulationFails is truthy but userFeeLevel is CUSTOM', () => {
    const result = runHook({
      ...MOCK_TRANSACTION_META,
      simulationFails: { debug: {} },
      userFeeLevel: UserFeeLevel.CUSTOM,
    } as unknown as TransactionMeta);

    expect(result).toBe(false);
  });

  it('returns true when simulationFails is truthy and userFeeLevel is DAPP_SUGGESTED', () => {
    const result = runHook({
      ...MOCK_TRANSACTION_META,
      simulationFails: { debug: {} },
      userFeeLevel: UserFeeLevel.DAPP_SUGGESTED,
    } as unknown as TransactionMeta);

    expect(result).toBe(true);
  });

  it('returns false when transaction metadata is undefined', () => {
    const result = runHook(undefined);

    expect(result).toBe(false);
  });
});
