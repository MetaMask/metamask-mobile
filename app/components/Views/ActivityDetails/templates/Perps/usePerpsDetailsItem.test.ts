import { renderHook } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import {
  mapPerpsTransaction,
  type ActivityListItem,
} from '#app/util/activity-adapters';
import {
  usePerpsConnection,
  usePerpsTransactionHistory,
} from '#app/components/UI/Perps/hooks';
import { usePerpsDetailsItem } from './usePerpsDetailsItem';
import type { PerpsTransaction } from '../../components/ActivityDetailsPerps.utils';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('@metamask/perps-controller', () => ({
  ARBITRUM_MAINNET_CAIP_CHAIN_ID: 'eip155:42161',
  formatAccountToCaipAccountId: jest.fn(
    (address: string, chainId: string) => `${chainId}:${address}`,
  ),
}));

jest.mock('@metamask/perps-controller/constants/hyperLiquidConfig', () => ({
  USDC_ARBITRUM_MAINNET_ADDRESS: '0xUSDC',
}));

jest.mock('#app/components/UI/Perps/hooks', () => ({
  usePerpsConnection: jest.fn(),
  usePerpsTransactionHistory: jest.fn(),
}));

jest.mock('#app/util/activity-adapters', () => ({
  mapPerpsTransaction: jest.fn(),
}));

const useSelectorMock = jest.mocked(useSelector);
const usePerpsConnectionMock = jest.mocked(usePerpsConnection);
const usePerpsTransactionHistoryMock = jest.mocked(usePerpsTransactionHistory);
const mapPerpsTransactionMock = jest.mocked(mapPerpsTransaction);

const trade = { id: 'fill-1' } as PerpsTransaction;
const deposit = {
  id: 'wallet-1',
  depositWithdrawal: { txHash: '0xabc' },
} as PerpsTransaction;
const mappedTrade = {
  type: 'perpsOpenLong',
  hash: 'fill-1',
} as ActivityListItem;

describe('usePerpsDetailsItem', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useSelectorMock.mockReturnValue({ address: '0xabc' });
    usePerpsConnectionMock.mockReturnValue({
      isConnected: true,
    } as ReturnType<typeof usePerpsConnection>);
    usePerpsTransactionHistoryMock.mockReturnValue({
      transactions: [trade, deposit],
      isLoading: false,
    } as ReturnType<typeof usePerpsTransactionHistory>);
    mapPerpsTransactionMock.mockReturnValue(mappedTrade);
  });

  it('returns the transaction matching the identifier', () => {
    const { result } = renderHook(() => usePerpsDetailsItem('FILL-1'));

    expect(result.current.transaction).toBe(trade);
    expect(result.current.item).toBe(mappedTrade);
  });

  it('matches a deposit by transaction hash', () => {
    const { result } = renderHook(() => usePerpsDetailsItem('0xABC'));

    expect(result.current.transaction).toBe(deposit);
  });

  it('returns undefined when nothing matches', () => {
    const { result } = renderHook(() => usePerpsDetailsItem('missing'));

    expect(result.current.transaction).toBeUndefined();
    expect(result.current.item).toBeUndefined();
  });

  it('returns the mapped activity item for the matching transaction', () => {
    const { result } = renderHook(() => usePerpsDetailsItem('FILL-1'));

    expect(result.current.item).toBe(mappedTrade);
    expect(result.current.isLoading).toBe(false);
    expect(mapPerpsTransactionMock).toHaveBeenCalledWith({
      transaction: trade,
      chainId: 'eip155:42161',
      collateralAssetId: 'eip155:42161/erc20:0xusdc',
    });
  });
});
