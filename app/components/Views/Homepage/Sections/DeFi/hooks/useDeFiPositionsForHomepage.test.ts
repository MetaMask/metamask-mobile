import { renderHook } from '@testing-library/react-hooks';
import { useDeFiPositionsForHomepage } from './useDeFiPositionsForHomepage';

const mockSelectDeFiPositionsByAddress = jest.fn();
const mockSelectDefiPositionsByEnabledNetworks = jest.fn();
const mockSelectTokenSortConfig = jest.fn();

jest.mock('../../../../../../selectors/defiPositionsController', () => ({
  selectDeFiPositionsByAddress: () => mockSelectDeFiPositionsByAddress(),
  selectDefiPositionsByEnabledNetworks: () =>
    mockSelectDefiPositionsByEnabledNetworks(),
}));

jest.mock('../../../../../../selectors/preferencesController', () => ({
  selectTokenSortConfig: () => mockSelectTokenSortConfig(),
}));

jest.mock('react-redux', () => ({
  useSelector: (selector: () => unknown) => selector(),
}));

jest.mock('../../../../../UI/Tokens/util', () => ({
  sortAssets: jest.fn((assets) => assets),
}));

const createMockProtocolAggregate = (name: string, marketValue: number) => ({
  protocolDetails: {
    name,
    iconUrl: `https://example.com/${name}.png`,
  },
  aggregatedMarketValue: marketValue,
  positionTypes: {},
});

describe('useDeFiPositionsForHomepage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSelectTokenSortConfig.mockReturnValue({
      key: 'tokenFiatAmount',
      order: 'dsc',
    });
  });

  it('returns loading state when defiPositions is undefined', () => {
    mockSelectDeFiPositionsByAddress.mockReturnValue(undefined);
    mockSelectDefiPositionsByEnabledNetworks.mockReturnValue(undefined);

    const { result } = renderHook(() => useDeFiPositionsForHomepage());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.hasError).toBe(false);
    expect(result.current.isEmpty).toBe(false);
    expect(result.current.positions).toEqual([]);
  });

  it('returns error state when defiPositions is null', () => {
    mockSelectDeFiPositionsByAddress.mockReturnValue(null);
    mockSelectDefiPositionsByEnabledNetworks.mockReturnValue(null);

    const { result } = renderHook(() => useDeFiPositionsForHomepage());

    expect(result.current.isLoading).toBe(false);
    expect(result.current.hasError).toBe(true);
    expect(result.current.isEmpty).toBe(false);
    expect(result.current.positions).toEqual([]);
  });

  it('returns empty state when defiPositions is empty object', () => {
    mockSelectDeFiPositionsByAddress.mockReturnValue({});
    mockSelectDefiPositionsByEnabledNetworks.mockReturnValue({});

    const { result } = renderHook(() => useDeFiPositionsForHomepage());

    expect(result.current.isLoading).toBe(false);
    expect(result.current.hasError).toBe(false);
    expect(result.current.isEmpty).toBe(true);
    expect(result.current.positions).toEqual([]);
  });

  it('returns positions flattened from multiple chains', () => {
    const mockPositions = {
      '0x1': {
        protocols: {
          aave: createMockProtocolAggregate('Aave', 1000),
          uniswap: createMockProtocolAggregate('Uniswap', 500),
        },
      },
      '0x89': {
        protocols: {
          quickswap: createMockProtocolAggregate('QuickSwap', 300),
        },
      },
    };

    mockSelectDeFiPositionsByAddress.mockReturnValue(mockPositions);
    mockSelectDefiPositionsByEnabledNetworks.mockReturnValue(mockPositions);

    const { result } = renderHook(() => useDeFiPositionsForHomepage());

    expect(result.current.isLoading).toBe(false);
    expect(result.current.hasError).toBe(false);
    expect(result.current.isEmpty).toBe(false);
    expect(result.current.positions).toHaveLength(3);
  });

  it('limits positions to maxPositions parameter', () => {
    const mockPositions = {
      '0x1': {
        protocols: {
          aave: createMockProtocolAggregate('Aave', 1000),
          uniswap: createMockProtocolAggregate('Uniswap', 500),
          compound: createMockProtocolAggregate('Compound', 400),
          curve: createMockProtocolAggregate('Curve', 300),
        },
      },
    };

    mockSelectDeFiPositionsByAddress.mockReturnValue(mockPositions);
    mockSelectDefiPositionsByEnabledNetworks.mockReturnValue(mockPositions);

    const { result } = renderHook(() => useDeFiPositionsForHomepage(2));

    expect(result.current.positions).toHaveLength(2);
  });
});
