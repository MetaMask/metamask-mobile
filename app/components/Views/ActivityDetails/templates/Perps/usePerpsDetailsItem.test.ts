import { renderHook } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import type { CaipChainId } from '@metamask/utils';
import { mapPerpsTransaction } from '#app/util/activity-adapters';
import { selectPerpsEnabledFlag } from '../../../../UI/Perps/selectors/featureFlags';
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

const selectedAccountId =
  'eip155:42161:0x1234567890123456789012345678901234567890';
const trade = { id: 'fill-1' } as PerpsTransaction;
const deposit = {
  id: 'wallet-1',
  depositWithdrawal: { txHash: '0xabc' },
} as PerpsTransaction;

interface MockSelectorOptions {
  isPerpsEnabled?: boolean;
  accountId?: string | undefined;
}

function mockSelectors(options: MockSelectorOptions = {}) {
  const { isPerpsEnabled = true, accountId } = options;
  const selectedAccount =
    'accountId' in options ? accountId : selectedAccountId;
  useSelectorMock.mockImplementation((selector: unknown) =>
    selector === selectPerpsEnabledFlag ? isPerpsEnabled : selectedAccount,
  );
}

describe('usePerpsDetailsItem', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSelectors();
    usePerpsActivityQueryMock.mockReturnValue({
      transactions: [trade, deposit],
      isFetching: false,
    } as ReturnType<typeof usePerpsActivityQuery>);
    mapPerpsTransactionMock.mockReturnValue(null);
  });

  it('returns the transaction matching the identifier', () => {
    const { result } = renderHook(() =>
      usePerpsDetailsItem('FILL-1', 'eip155:42161', false),
    );

    expect(result.current.transaction).toBe(trade);
    expect(usePerpsActivityQueryMock).toHaveBeenCalledWith(
      expect.anything(),
      true,
      false,
    );
  });

  it('matches a deposit by transaction hash', () => {
    const { result } = renderHook(() => usePerpsDetailsItem('0xABC'));

    expect(result.current.transaction).toBe(deposit);
  });

  it('resolves a row id that only exists while aggregation is turned off', () => {
    // The list can be showing individual executions when a row is tapped, and those ids do
    // not exist in the aggregated set the details screen builds by default.
    const individualFillId = 'fill-order-1-1700000000000-3000-1.5-0';
    const individualFill = { id: individualFillId } as PerpsTransaction;
    usePerpsActivityQueryMock.mockImplementation(
      (_accountId, _enabled, options) =>
        ({
          transactions:
            options?.fillDisplay === 'individual'
              ? [individualFill]
              : [trade, deposit],
          isFetching: false,
        }) as ReturnType<typeof usePerpsActivityQuery>,
    );

    const { result } = renderHook(() => usePerpsDetailsItem(individualFillId));

    expect(result.current.transaction).toBe(individualFill);
  });

  it('returns undefined when nothing matches', () => {
    const { result } = renderHook(() => usePerpsDetailsItem('missing'));

    expect(result.current.transaction).toBeUndefined();
  });

  it('enables the activity query for a supported perps transaction', () => {
    renderHook(() => usePerpsDetailsItem('fill-1'));

    expect(usePerpsActivityQueryMock).toHaveBeenCalledWith(
      selectedAccountId,
      true,
      true,
    );
  });

  it.each([
    {
      name: 'missing identifier',
      arrange: () => undefined,
      identifier: undefined,
      chainId: undefined,
    },
    {
      name: 'disabled perps',
      arrange: () => mockSelectors({ isPerpsEnabled: false }),
      identifier: 'fill-1',
      chainId: undefined,
    },
    {
      name: 'unsupported chain',
      arrange: () => undefined,
      identifier: 'fill-1',
      chainId: 'eip155:1' as CaipChainId,
    },
    {
      name: 'missing account',
      arrange: () => mockSelectors({ accountId: undefined }),
      identifier: 'fill-1',
      chainId: undefined,
    },
  ])(
    'keeps the activity query disabled for $name',
    ({ arrange, identifier, chainId }) => {
      arrange();

      renderHook(() => usePerpsDetailsItem(identifier, chainId));

      expect(usePerpsActivityQueryMock).toHaveBeenCalledWith(
        undefined,
        false,
        true,
      );
    },
  );

  it('reports loading while fetching a transaction missing from cache', () => {
    usePerpsActivityQueryMock.mockReturnValue({
      transactions: [] as PerpsTransaction[],
      isFetching: true,
    } as ReturnType<typeof usePerpsActivityQuery>);

    const { result } = renderHook(() => usePerpsDetailsItem('fill-1'));

    expect(result.current.isLoading).toBe(true);
  });
});
