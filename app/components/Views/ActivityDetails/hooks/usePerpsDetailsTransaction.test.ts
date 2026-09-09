import { renderHook } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import {
  usePerpsConnection,
  usePerpsTransactionHistory,
} from '../../../UI/Perps/hooks';
import { usePerpsDetailsTransaction } from './usePerpsDetailsTransaction';
import type { PerpsTransaction } from '../components/ActivityDetailsPerps.utils';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('@metamask/perps-controller', () => ({
  ARBITRUM_MAINNET_CAIP_CHAIN_ID: 'eip155:42161',
  formatAccountToCaipAccountId: jest.fn(
    (address: string, chainId: string) => `${chainId}:${address}`,
  ),
}));

jest.mock('../../../UI/Perps/hooks', () => ({
  usePerpsConnection: jest.fn(),
  usePerpsTransactionHistory: jest.fn(),
}));

const useSelectorMock = jest.mocked(useSelector);
const usePerpsConnectionMock = jest.mocked(usePerpsConnection);
const usePerpsTransactionHistoryMock = jest.mocked(usePerpsTransactionHistory);

const trade = { id: 'fill-1' } as PerpsTransaction;
const deposit = {
  id: 'wallet-1',
  depositWithdrawal: { txHash: '0xabc' },
} as PerpsTransaction;

describe('usePerpsDetailsTransaction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useSelectorMock.mockReturnValue({ address: '0xabc' });
    usePerpsConnectionMock.mockReturnValue({
      isConnected: true,
    } as ReturnType<typeof usePerpsConnection>);
    usePerpsTransactionHistoryMock.mockReturnValue({
      transactions: [trade, deposit],
    } as ReturnType<typeof usePerpsTransactionHistory>);
  });

  it('returns the transaction matching the identifier', () => {
    const { result } = renderHook(() => usePerpsDetailsTransaction('FILL-1'));

    expect(result.current).toBe(trade);
  });

  it('matches a deposit by transaction hash', () => {
    const { result } = renderHook(() => usePerpsDetailsTransaction('0xABC'));

    expect(result.current).toBe(deposit);
  });

  it('returns undefined when nothing matches', () => {
    const { result } = renderHook(() => usePerpsDetailsTransaction('missing'));

    expect(result.current).toBeUndefined();
  });
});
