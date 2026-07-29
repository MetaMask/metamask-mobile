import type { GroupedDeFiPositions } from '@metamask/assets-controllers';
import { renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { selectDefiPositionsByChainIds } from '../../../../../selectors/defiPositionsController';
import { selectDeFiPositionsSectionEnabled } from '../../../../../selectors/deFiPositionsSectionEnabled';
import { useNetworkEnablement } from '../../../../hooks/useNetworkEnablement/useNetworkEnablement';
import { sumDefiPositionsUsd, useDefiSlice } from './useDefiSlice';

jest.mock('react-redux', () => ({ useSelector: jest.fn() }));
jest.mock('../../../../../selectors/defiPositionsController', () => ({
  selectDefiPositionsByChainIds: jest.fn(),
}));
jest.mock('../../../../../selectors/deFiPositionsSectionEnabled', () => ({
  selectDeFiPositionsSectionEnabled: jest.fn(),
}));
jest.mock(
  '../../../../hooks/useNetworkEnablement/useNetworkEnablement',
  () => ({
    useNetworkEnablement: jest.fn(),
  }),
);

const mockUseSelector = jest.mocked(useSelector);
const mockSelectDefiPositionsByChainIds = jest.mocked(
  selectDefiPositionsByChainIds,
);
const mockUseNetworkEnablement = jest.mocked(useNetworkEnablement);

const protocol = (
  name: string,
  aggregatedMarketValue: number,
): GroupedDeFiPositions['protocols'][number] =>
  ({
    aggregatedMarketValue,
    protocolDetails: { name },
  }) as GroupedDeFiPositions['protocols'][number];

describe('sumDefiPositionsUsd', () => {
  it('aggregates nested protocols across chains and preserves debt signs', () => {
    const positions = {
      '0x1': {
        protocols: {
          aave: protocol('Aave', 100),
          compound: protocol('Compound', -25),
        },
      },
      '0xa': {
        protocols: {
          aave: protocol('Aave', 50),
        },
      },
    } as unknown as Parameters<typeof sumDefiPositionsUsd>[0];

    expect(sumDefiPositionsUsd(positions)).toBe(125);
  });

  it('ignores missing chains, protocols, and invalid market values', () => {
    const positions = {
      '0x1': undefined,
      '0x2': {},
      '0x3': {
        protocols: {
          invalid: protocol('Invalid', Number.NaN),
        },
      },
    } as unknown as Parameters<typeof sumDefiPositionsUsd>[0];

    expect(sumDefiPositionsUsd(positions)).toBe(0);
  });
});

describe('useDefiSlice', () => {
  let isEnabled: boolean;

  beforeEach(() => {
    jest.clearAllMocks();
    isEnabled = true;
    mockUseNetworkEnablement.mockReturnValue({
      popularEvmNetworks: ['0x1'],
    } as unknown as ReturnType<typeof useNetworkEnablement>);
    mockSelectDefiPositionsByChainIds.mockReturnValue({
      '0x1': {
        protocols: {
          aave: protocol('Aave', 100),
        },
      },
    } as unknown as ReturnType<typeof selectDefiPositionsByChainIds>);
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectDeFiPositionsSectionEnabled) return isEnabled;
      return selector({} as never);
    });
  });

  it('converts positions on popular EVM networks', () => {
    const { result } = renderHook(() => useDefiSlice((amount) => amount * 2));

    expect(mockSelectDefiPositionsByChainIds).toHaveBeenCalledWith({}, ['0x1']);
    expect(result.current).toEqual({
      key: 'defi',
      valueFiat: 200,
      status: 'ready',
    });
  });

  it.each([
    {
      name: 'disabled',
      enabled: false,
      positions: {},
      expectedStatus: 'ineligible',
    },
    {
      name: 'unresolved positions',
      enabled: true,
      positions: undefined,
      expectedStatus: 'loading',
    },
    {
      name: 'failed positions',
      enabled: true,
      positions: null,
      expectedStatus: 'error',
    },
  ])('returns zero when $name', ({ enabled, positions, expectedStatus }) => {
    isEnabled = enabled;
    mockSelectDefiPositionsByChainIds.mockReturnValue(
      positions as ReturnType<typeof selectDefiPositionsByChainIds>,
    );

    const { result } = renderHook(() => useDefiSlice((amount) => amount));

    expect(result.current).toEqual({
      key: 'defi',
      valueFiat: 0,
      status: expectedStatus,
    });
  });

  it('stays loading while fiat conversion is unavailable', () => {
    const { result } = renderHook(() => useDefiSlice(() => undefined));

    expect(result.current).toEqual({
      key: 'defi',
      valueFiat: 0,
      status: 'loading',
    });
  });
});
