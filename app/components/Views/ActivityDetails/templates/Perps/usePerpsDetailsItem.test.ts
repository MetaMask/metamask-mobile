import { renderHook } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import { mapPerpsTransaction } from '#app/util/activity-adapters';
import { usePerpsActivityQuery } from '../../hooks/usePerpsActivityQuery';
import { usePerpsDetailsItem } from './usePerpsDetailsItem';
import type { PerpsTransaction } from '../../components/ActivityDetailsPerps.utils';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('@metamask/perps-controller', () => ({
  ARBITRUM_MAINNET_CAIP_CHAIN_ID: 'eip155:42161',
  ARBITRUM_TESTNET_CAIP_CHAIN_ID: 'eip155:421614',
}));

jest.mock('@metamask/perps-controller/constants/hyperLiquidConfig', () => ({
  getCaipChainId: (isTestnet: boolean) =>
    isTestnet ? 'eip155:421614' : 'eip155:42161',
  USDC_ARBITRUM_MAINNET_ADDRESS: '0xUSDC',
  USDC_ARBITRUM_TESTNET_ADDRESS: '0xUSDCT',
}));

jest.mock('../../hooks/usePerpsActivityQuery', () => ({
  usePerpsActivityQuery: jest.fn(),
}));

jest.mock('#app/util/activity-adapters', () => ({
  getPerpsActivityMappingIds: jest.requireActual(
    '#app/util/activity-adapters/adapters/perps-transaction',
  ).getPerpsActivityMappingIds,
  mapPerpsTransaction: jest.fn(),
}));

const useSelectorMock = jest.mocked(useSelector);
const usePerpsActivityQueryMock = jest.mocked(usePerpsActivityQuery);
const mapPerpsTransactionMock = jest.mocked(mapPerpsTransaction);

const trade = { id: 'fill-1' } as PerpsTransaction;
const deposit = {
  id: 'wallet-1',
  depositWithdrawal: { txHash: '0xabc' },
} as PerpsTransaction;
describe('usePerpsDetailsItem', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useSelectorMock.mockReturnValue(true);
    usePerpsActivityQueryMock.mockReturnValue({
      transactions: [trade, deposit],
      isFetching: false,
    } as ReturnType<typeof usePerpsActivityQuery>);
    mapPerpsTransactionMock.mockReturnValue(null);
  });

  it('returns the transaction matching the identifier', () => {
    const { result } = renderHook(() => usePerpsDetailsItem('FILL-1'));

    expect(result.current.transaction).toBe(trade);
  });

  it('matches a deposit by transaction hash', () => {
    const { result } = renderHook(() => usePerpsDetailsItem('0xABC'));

    expect(result.current.transaction).toBe(deposit);
  });

  it('returns undefined when nothing matches', () => {
    const { result } = renderHook(() => usePerpsDetailsItem('missing'));

    expect(result.current.transaction).toBeUndefined();
  });
});
