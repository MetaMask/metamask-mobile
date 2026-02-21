import React from 'react';
import { cleanup } from '@testing-library/react-native';
import TronEnergyBandwidthDetail from './TronEnergyBandwidthDetail';
import { IconName } from '@metamask/design-system-react-native';
import ResourceRing from './ResourceRing';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../util/test/initial-root-state';
import {
  selectTronSpecialAssetsBySelectedAccountGroup,
  TronSpecialAssetsMap,
} from '../../../../selectors/assets/assets-list';

jest.mock('./ResourceRing', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => null),
}));

jest.mock('../../../../../locales/i18n', () => ({
  strings: jest.fn().mockImplementation((key, vars) => {
    switch (key) {
      case 'asset_overview.tron.sufficient_to_cover_usdt_transfer':
        return 'USDT 1';
      case 'asset_overview.tron.sufficient_to_cover_usdt_transfers':
        return `USDT ${vars?.amount}`;
      case 'asset_overview.tron.sufficient_to_cover_trx_transfer':
        return 'TRX 1';
      case 'asset_overview.tron.sufficient_to_cover_trx_transfers':
        return `TRX ${vars?.amount}`;
      default:
        return key;
    }
  }),
}));

jest.mock('../../../../selectors/assets/assets-list', () => ({
  selectTronSpecialAssetsBySelectedAccountGroup: jest.fn(),
}));

type SelectorReturn = ReturnType<
  typeof selectTronSpecialAssetsBySelectedAccountGroup
>;

const createEmptyResourcesMap = (): TronSpecialAssetsMap => ({
  energy: undefined,
  bandwidth: undefined,
  maxEnergy: undefined,
  maxBandwidth: undefined,
  stakedTrxForEnergy: undefined,
  stakedTrxForBandwidth: undefined,
  totalStakedTrx: 0,
  readyForWithdrawal: undefined,
  stakingRewards: undefined,
  inLockPeriod: undefined,
});

interface Resource {
  symbol: string;
  balance: number | string;
}

const res = (symbol: string, balance: number | string): Resource => ({
  symbol,
  balance,
});

const ResourceRingMock = jest.mocked(ResourceRing);

const baseState = {
  engine: {
    backgroundState,
  },
} as const;

describe('TronEnergyBandwidthDetail', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders values, coverage counts, and passes correct progress to ResourceRing', () => {
    jest.mocked(selectTronSpecialAssetsBySelectedAccountGroup).mockReturnValue({
      energy: res('energy', 130000),
      bandwidth: res('bandwidth', 560),
      maxEnergy: res('max-energy', 200000),
      maxBandwidth: res('max-bandwidth', 1000),
      stakedTrxForEnergy: res('strx-energy', 70000),
      stakedTrxForBandwidth: res('strx-bandwidth', 500),
      totalStakedTrx: 70500,
    } as SelectorReturn);

    const { getByText } = renderWithProvider(<TronEnergyBandwidthDetail />, {
      state: baseState,
    });

    expect(getByText('560')).toBeTruthy();
    expect(getByText('USDT 2')).toBeTruthy();
    expect(getByText('TRX 2')).toBeTruthy();

    expect(ResourceRingMock).toHaveBeenCalledTimes(2);

    const energyRingProps = ResourceRingMock.mock.calls[0][0];
    expect(energyRingProps.icon).toBe(IconName.Flash);
    // 130000 current, 200000 max => 65%
    expect(energyRingProps.progress).toBeCloseTo(0.65, 5);

    const bandwidthRingProps = ResourceRingMock.mock.calls[1][0];
    expect(bandwidthRingProps.icon).toBe(IconName.Connect);
    // 560 current, 1000 max => 56%
    expect(bandwidthRingProps.progress).toBeCloseTo(0.56, 5);
  });

  it('parses balances and caps progress', () => {
    jest.mocked(selectTronSpecialAssetsBySelectedAccountGroup).mockReturnValue({
      energy: res('energy', '1000'),
      bandwidth: res('bandwidth', '2000'),
      maxEnergy: res('max-energy', '400'),
      maxBandwidth: res('max-bandwidth', '1000'),
      stakedTrxForEnergy: res('strx-energy', '500'),
      stakedTrxForBandwidth: res('strx-bandwidth', '500'),
      totalStakedTrx: 1000,
    } as SelectorReturn);

    const { getByText } = renderWithProvider(<TronEnergyBandwidthDetail />, {
      state: baseState,
    });

    expect(getByText('USDT 0')).toBeTruthy();
    expect(getByText('TRX 7')).toBeTruthy();

    const energyRingProps = ResourceRingMock.mock.calls[0][0];
    expect(energyRingProps.progress).toBe(1);

    const bandwidthRingProps = ResourceRingMock.mock.calls[1][0];
    expect(bandwidthRingProps.progress).toBe(1);
  });

  it('handles missing resources by showing zeros and 0 progress', () => {
    jest
      .mocked(selectTronSpecialAssetsBySelectedAccountGroup)
      .mockReturnValue(createEmptyResourcesMap());

    const { getAllByText, getByText } = renderWithProvider(
      <TronEnergyBandwidthDetail />,
      { state: baseState },
    );

    expect(getByText('USDT 0')).toBeTruthy();
    expect(getByText('TRX 0')).toBeTruthy();
    expect(getAllByText('0').length).toBeGreaterThanOrEqual(2);

    const energyRingProps = ResourceRingMock.mock.calls[0][0];
    const bandwidthRingProps = ResourceRingMock.mock.calls[1][0];

    expect(energyRingProps.progress).toBe(0);
    expect(bandwidthRingProps.progress).toBe(0);
  });
});
