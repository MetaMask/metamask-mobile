import { renderHook } from '@testing-library/react-hooks';
import Engine from '../../core/Engine';
import { isNonEvmChainId } from '../../core/Multichain/utils';
import { getAllowedSmartTransactionsChainIds } from '../../constants/smartTransactions';
import { selectSmartTransactionsOptInStatus } from '../../selectors/preferencesController';
import { useRefreshSmartTransactionsLiveness } from './useRefreshSmartTransactionsLiveness';

jest.mock('react-redux', () => ({
  useSelector: jest.fn((selector) => selector()),
}));

jest.mock('../../core/Engine', () => ({
  context: {
    SmartTransactionsController: {
      fetchLiveness: jest.fn(),
    },
  },
}));

jest.mock('../../core/Multichain/utils', () => ({
  isNonEvmChainId: jest.fn(),
}));

jest.mock('../../constants/smartTransactions', () => ({
  getAllowedSmartTransactionsChainIds: jest.fn(),
}));

jest.mock('../../selectors/preferencesController', () => ({
  selectSmartTransactionsOptInStatus: jest.fn(),
}));

describe('useRefreshSmartTransactionsLiveness', () => {
  const mockFetchLiveness = jest.mocked(
    Engine.context.SmartTransactionsController.fetchLiveness,
  );
  const mockIsNonEvmChainId = jest.mocked(isNonEvmChainId);
  const mockGetAllowedChainIds = jest.mocked(
    getAllowedSmartTransactionsChainIds,
  );
  const mockSelectOptInStatus = jest.mocked(selectSmartTransactionsOptInStatus);

  beforeEach(() => {
    jest.clearAllMocks();
    mockIsNonEvmChainId.mockReturnValue(false);
    mockGetAllowedChainIds.mockReturnValue(['0x1', '0x38']);
    mockSelectOptInStatus.mockReturnValue(true);
  });

  it('does not fetch when chainId is null', () => {
    renderHook(() => useRefreshSmartTransactionsLiveness(null));
    expect(mockFetchLiveness).not.toHaveBeenCalled();
  });

  it('does not fetch when chainId is undefined', () => {
    renderHook(() => useRefreshSmartTransactionsLiveness(undefined));
    expect(mockFetchLiveness).not.toHaveBeenCalled();
  });

  it('does not fetch for non-EVM chains', () => {
    mockIsNonEvmChainId.mockReturnValue(true);
    renderHook(() => useRefreshSmartTransactionsLiveness('solana:mainnet'));
    expect(mockFetchLiveness).not.toHaveBeenCalled();
  });

  it('does not fetch for unsupported EVM chains', () => {
    mockGetAllowedChainIds.mockReturnValue(['0x1']);
    renderHook(() => useRefreshSmartTransactionsLiveness('0x999'));
    expect(mockFetchLiveness).not.toHaveBeenCalled();
  });

  it('does not fetch when user has not opted in to smart transactions', () => {
    mockSelectOptInStatus.mockReturnValue(false);
    renderHook(() => useRefreshSmartTransactionsLiveness('0x1'));
    expect(mockFetchLiveness).not.toHaveBeenCalled();
  });

  it('fetches liveness for supported EVM chain', () => {
    renderHook(() => useRefreshSmartTransactionsLiveness('0x1'));
    expect(mockFetchLiveness).toHaveBeenCalledTimes(1);
    expect(mockFetchLiveness).toHaveBeenCalledWith({
      chainId: '0x1',
    });
  });

  it('re-fetches when chainId changes to another supported chain', () => {
    const { rerender } = renderHook<{ chainId: string }, void>(
      ({ chainId }) => useRefreshSmartTransactionsLiveness(chainId),
      { initialProps: { chainId: '0x1' } },
    );

    expect(mockFetchLiveness).toHaveBeenCalledTimes(1);

    rerender({ chainId: '0x38' });
    expect(mockFetchLiveness).toHaveBeenCalledTimes(2);
  });
});
