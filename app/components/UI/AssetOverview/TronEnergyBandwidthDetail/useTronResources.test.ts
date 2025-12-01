/* eslint-disable @typescript-eslint/no-explicit-any */
import { renderHook } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';

import { TRON_RESOURCE } from '../../../../core/Multichain/constants';
import { useTronResources } from './useTronResources';
import { selectTronResourcesBySelectedAccountGroup } from '../../../../selectors/assets/assets-list';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../../selectors/assets/assets-list', () => ({
  __esModule: true,
  ...jest.requireActual('../../../../selectors/assets/assets-list'),
  selectTronResourcesBySelectedAccountGroup: jest.fn(),
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockSelectTronResourcesBySelectedAccountGroup =
  selectTronResourcesBySelectedAccountGroup as jest.MockedFunction<
    typeof selectTronResourcesBySelectedAccountGroup
  >;

interface MockTronAsset {
  symbol?: string;
  balance?: string | number;
}

describe('useTronResources', () => {
  const createTronAsset = (
    symbol: string,
    balance: string | number,
  ): MockTronAsset => ({
    symbol,
    balance,
  });

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseSelector.mockImplementation((selector: any) => selector());
    mockSelectTronResourcesBySelectedAccountGroup.mockReturnValue([]);
  });

  it('builds energy and bandwidth resources from base max capacity', () => {
    const tronResources: MockTronAsset[] = [
      createTronAsset(TRON_RESOURCE.ENERGY, '500'),
      createTronAsset(TRON_RESOURCE.MAX_ENERGY, '1000'),
      createTronAsset(TRON_RESOURCE.STRX_ENERGY, '500'),
      createTronAsset(TRON_RESOURCE.BANDWIDTH, '300'),
      createTronAsset(TRON_RESOURCE.MAX_BANDWIDTH, '600'),
      createTronAsset(TRON_RESOURCE.STRX_BANDWIDTH, 0),
    ];

    mockSelectTronResourcesBySelectedAccountGroup.mockReturnValue(
      tronResources as any,
    );

    const { result } = renderHook(() => useTronResources());

    expect(result.current.energy.current).toBe(500);
    expect(result.current.energy.max).toBe(1000);
    expect(result.current.energy.percentage).toBe(50);

    expect(result.current.bandwidth.current).toBe(300);
    expect(result.current.bandwidth.max).toBe(600);
    expect(result.current.bandwidth.percentage).toBe(50);
  });

  it('returns zeroed resources when no Tron resources exist', () => {
    mockSelectTronResourcesBySelectedAccountGroup.mockReturnValue([] as any);

    const { result } = renderHook(() => useTronResources());

    expect(result.current.energy).toEqual({
      type: 'energy',
      current: 0,
      max: 1,
      percentage: 0,
    });

    expect(result.current.bandwidth).toEqual({
      type: 'bandwidth',
      current: 0,
      max: 1,
      percentage: 0,
    });
  });

  it('parses balances with comma separators', () => {
    const tronResources: MockTronAsset[] = [
      createTronAsset(TRON_RESOURCE.ENERGY, '1,000'),
      createTronAsset(TRON_RESOURCE.MAX_ENERGY, '2,000'),
    ];

    mockSelectTronResourcesBySelectedAccountGroup.mockReturnValue(
      tronResources as any,
    );

    const { result } = renderHook(() => useTronResources());

    expect(result.current.energy.current).toBe(1000);
    expect(result.current.energy.max).toBe(2000);
    expect(result.current.energy.percentage).toBe(50);
  });

  it('caps percentage at one hundred when current exceeds max', () => {
    const tronResources: MockTronAsset[] = [
      createTronAsset(TRON_RESOURCE.ENERGY, 200),
      createTronAsset(TRON_RESOURCE.MAX_ENERGY, 100),
    ];

    mockSelectTronResourcesBySelectedAccountGroup.mockReturnValue(
      tronResources as any,
    );

    const { result } = renderHook(() => useTronResources());

    expect(result.current.energy.max).toBe(100);
    expect(result.current.energy.percentage).toBe(100);
  });

  it('sets percentage to zero when balances cannot be parsed', () => {
    const tronResources: MockTronAsset[] = [
      createTronAsset(TRON_RESOURCE.ENERGY, 'invalid'),
      createTronAsset(TRON_RESOURCE.MAX_ENERGY, '1000'),
    ];

    mockSelectTronResourcesBySelectedAccountGroup.mockReturnValue(
      tronResources as any,
    );

    const { result } = renderHook(() => useTronResources());

    expect(result.current.energy.current).toBe(0);
    expect(result.current.energy.max).toBe(1000);
    expect(result.current.energy.percentage).toBe(0);
  });
});
