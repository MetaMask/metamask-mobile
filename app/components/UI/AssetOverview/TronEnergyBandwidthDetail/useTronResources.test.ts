/* eslint-disable @typescript-eslint/no-explicit-any */
import { renderHook } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';

import { useTronResources } from './useTronResources';
import {
  selectTronResourcesBySelectedAccountGroup,
  TronResourcesMap,
} from '../../../../selectors/assets/assets-list';

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

const createEmptyResourcesMap = (): TronResourcesMap => ({
  energy: undefined,
  bandwidth: undefined,
  maxEnergy: undefined,
  maxBandwidth: undefined,
  stakedTrxForEnergy: undefined,
  stakedTrxForBandwidth: undefined,
  totalStakedTrx: 0,
});

const createTronAsset = (
  symbol: string,
  balance: string | number,
): MockTronAsset => ({
  symbol,
  balance,
});

describe('useTronResources', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseSelector.mockImplementation((selector: any) => selector());
    mockSelectTronResourcesBySelectedAccountGroup.mockReturnValue(
      createEmptyResourcesMap(),
    );
  });

  it('builds energy and bandwidth resources from base max capacity', () => {
    const tronResourcesMap: TronResourcesMap = {
      energy: createTronAsset('energy', '500') as any,
      bandwidth: createTronAsset('bandwidth', '300') as any,
      maxEnergy: createTronAsset('max-energy', '1000') as any,
      maxBandwidth: createTronAsset('max-bandwidth', '600') as any,
      stakedTrxForEnergy: createTronAsset('strx-energy', '500') as any,
      stakedTrxForBandwidth: createTronAsset('strx-bandwidth', 0) as any,
      totalStakedTrx: 500,
    };

    mockSelectTronResourcesBySelectedAccountGroup.mockReturnValue(
      tronResourcesMap,
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
    mockSelectTronResourcesBySelectedAccountGroup.mockReturnValue(
      createEmptyResourcesMap(),
    );

    const { result } = renderHook(() => useTronResources());

    expect(result.current.energy).toEqual({
      type: 'energy',
      current: 0,
      max: 0,
      percentage: 0,
    });

    expect(result.current.bandwidth).toEqual({
      type: 'bandwidth',
      current: 0,
      max: 0,
      percentage: 0,
    });
  });

  it('parses balances with comma separators', () => {
    const tronResourcesMap: TronResourcesMap = {
      ...createEmptyResourcesMap(),
      energy: createTronAsset('energy', '1,000') as any,
      maxEnergy: createTronAsset('max-energy', '2,000') as any,
    };

    mockSelectTronResourcesBySelectedAccountGroup.mockReturnValue(
      tronResourcesMap,
    );

    const { result } = renderHook(() => useTronResources());

    expect(result.current.energy.current).toBe(1000);
    expect(result.current.energy.max).toBe(2000);
    expect(result.current.energy.percentage).toBe(50);
  });

  it('caps percentage at one hundred when current exceeds max', () => {
    const tronResourcesMap: TronResourcesMap = {
      ...createEmptyResourcesMap(),
      energy: createTronAsset('energy', 200) as any,
      maxEnergy: createTronAsset('max-energy', 100) as any,
    };

    mockSelectTronResourcesBySelectedAccountGroup.mockReturnValue(
      tronResourcesMap,
    );

    const { result } = renderHook(() => useTronResources());

    expect(result.current.energy.max).toBe(100);
    expect(result.current.energy.percentage).toBe(100);
  });

  it('sets percentage to zero when balances cannot be parsed', () => {
    const tronResourcesMap: TronResourcesMap = {
      ...createEmptyResourcesMap(),
      energy: createTronAsset('energy', 'invalid') as any,
      maxEnergy: createTronAsset('max-energy', '1000') as any,
    };

    mockSelectTronResourcesBySelectedAccountGroup.mockReturnValue(
      tronResourcesMap,
    );

    const { result } = renderHook(() => useTronResources());

    expect(result.current.energy.current).toBe(0);
    expect(result.current.energy.max).toBe(1000);
    expect(result.current.energy.percentage).toBe(0);
  });
});
