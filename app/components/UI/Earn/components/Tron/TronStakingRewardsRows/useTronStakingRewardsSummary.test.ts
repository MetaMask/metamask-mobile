import { useSelector } from 'react-redux';
import { renderHook } from '@testing-library/react-native';
import type { RootState } from '../../../../../../reducers';

import useTronStakingRewardsSummary from './useTronStakingRewardsSummary';
import { selectTronSpecialAssetsBySelectedAccountGroup } from '../../../../../../selectors/assets/assets-list';
import { selectCurrentCurrency } from '../../../../../../selectors/currencyRateController';
import { selectMultichainAssetsRates } from '../../../../../../selectors/multichain';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../../../../selectors/assets/assets-list', () => ({
  selectTronSpecialAssetsBySelectedAccountGroup: jest.fn(),
  TronSpecialAssetsStatus: {
    Loading: 'loading',
    Ready: 'ready',
  },
}));

jest.mock('../../../../../../selectors/currencyRateController', () => ({
  selectCurrentCurrency: jest.fn(),
}));

jest.mock('../../../../../../selectors/multichain', () => ({
  selectMultichainAssetsRates: jest.fn(),
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockSelectTronSpecialAssets =
  selectTronSpecialAssetsBySelectedAccountGroup as jest.MockedFunction<
    typeof selectTronSpecialAssetsBySelectedAccountGroup
  >;
const mockSelectCurrentCurrency = selectCurrentCurrency as jest.MockedFunction<
  typeof selectCurrentCurrency
>;
const mockSelectMultichainAssetsRates =
  selectMultichainAssetsRates as jest.MockedFunction<
    typeof selectMultichainAssetsRates
  >;

const renderSummary = (tokenAddress?: string) =>
  renderHook(() => useTronStakingRewardsSummary({ tokenAddress })).result
    .current;

describe('useTronStakingRewardsSummary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSelector.mockImplementation((selector) => selector({} as RootState));
    mockSelectCurrentCurrency.mockReturnValue('USD');
    mockSelectMultichainAssetsRates.mockReturnValue({});
    mockSelectTronSpecialAssets.mockReturnValue({
      energy: undefined,
      bandwidth: undefined,
      maxEnergy: undefined,
      maxBandwidth: undefined,
      stakedTrxForEnergy: undefined,
      stakedTrxForBandwidth: undefined,
      totalStakedTrx: 0,
      status: 'ready',
      trxReadyForWithdrawal: undefined,
      trxStakingRewards: undefined,
      trxInLockPeriod: undefined,
    });
  });

  it('exposes zero claimable rewards and staked totals when data is available', () => {
    mockSelectTronSpecialAssets.mockReturnValue({
      energy: undefined,
      bandwidth: undefined,
      maxEnergy: undefined,
      maxBandwidth: undefined,
      stakedTrxForEnergy: {
        assetId: 'tron:728126428/slip44:195-staked-for-energy',
        balance: '10',
        fiat: undefined,
      },
      stakedTrxForBandwidth: {
        assetId: 'tron:728126428/slip44:195-staked-for-bandwidth',
        balance: '5',
        fiat: undefined,
      },
      totalStakedTrx: 15,
      status: 'ready',
      trxReadyForWithdrawal: undefined,
      trxStakingRewards: {
        assetId: 'tron:728126428/slip44:195-staking-rewards',
        balance: '2.5',
        fiat: undefined,
      },
      trxInLockPeriod: undefined,
    });

    const result = renderSummary();

    expect(result.claimableRewardsTrxAmount).toBe(2.5);
    expect(result.claimableRewardsUnknown).toBe(false);
    expect(result.totalStakedTrx).toBe(15);
    expect(result.totalStakedTrxUnknown).toBe(false);
    expect(result.isLoading).toBe(false);
  });

  it('flags claimable rewards as unknown when the upstream value is null', () => {
    mockSelectTronSpecialAssets.mockReturnValue({
      energy: undefined,
      bandwidth: undefined,
      maxEnergy: undefined,
      maxBandwidth: undefined,
      stakedTrxForEnergy: undefined,
      stakedTrxForBandwidth: undefined,
      totalStakedTrx: 0,
      status: 'ready',
      trxReadyForWithdrawal: undefined,
      trxStakingRewards: {
        assetId: 'tron:728126428/slip44:195',
        balance: '0',
        fiat: undefined,
        unknown: true,
      },
      trxInLockPeriod: undefined,
    });

    const result = renderSummary();

    expect(result.claimableRewardsUnknown).toBe(true);
    expect(result.claimableRewardsTrxAmount).toBe(0);
  });

  it('flags the staked total as unknown when staked values are null', () => {
    mockSelectTronSpecialAssets.mockReturnValue({
      energy: undefined,
      bandwidth: undefined,
      maxEnergy: undefined,
      maxBandwidth: undefined,
      stakedTrxForEnergy: {
        assetId: 'tron:728126428/slip44:195',
        balance: '0',
        fiat: undefined,
        unknown: true,
      },
      stakedTrxForBandwidth: {
        assetId: 'tron:728126428/slip44:195',
        balance: '0',
        fiat: undefined,
        unknown: true,
      },
      totalStakedTrx: 0,
      status: 'ready',
      trxReadyForWithdrawal: undefined,
      trxStakingRewards: undefined,
      trxInLockPeriod: undefined,
    });

    const result = renderSummary();

    expect(result.totalStakedTrxUnknown).toBe(true);
    expect(result.totalStakedTrx).toBe(0);
  });

  it('reports loading while the balance request has not completed', () => {
    mockSelectTronSpecialAssets.mockReturnValue({
      energy: undefined,
      bandwidth: undefined,
      maxEnergy: undefined,
      maxBandwidth: undefined,
      stakedTrxForEnergy: undefined,
      stakedTrxForBandwidth: undefined,
      totalStakedTrx: 0,
      status: 'loading',
      trxReadyForWithdrawal: undefined,
      trxStakingRewards: undefined,
      trxInLockPeriod: undefined,
    });

    const result = renderSummary();

    expect(result.isLoading).toBe(true);
    expect(result.claimableRewardsUnknown).toBe(false);
    expect(result.totalStakedTrxUnknown).toBe(false);
  });

  it('drops the fiat amount instead of rendering zero when it cannot be parsed', () => {
    mockSelectTronSpecialAssets.mockReturnValue({
      energy: undefined,
      bandwidth: undefined,
      maxEnergy: undefined,
      maxBandwidth: undefined,
      stakedTrxForEnergy: undefined,
      stakedTrxForBandwidth: undefined,
      totalStakedTrx: 0,
      status: 'ready',
      trxReadyForWithdrawal: undefined,
      trxStakingRewards: {
        assetId: 'tron:728126428/slip44:195-staking-rewards',
        balance: '2.5',
        fiat: { balance: 'not-a-number' as unknown as number, currency: 'USD' },
      },
      trxInLockPeriod: undefined,
    });

    const result = renderSummary();

    expect(result.claimableRewardsFiatAmount).toBeUndefined();
    expect(result.claimableRewardsCurrency).toBe('USD');
    expect(result.claimableRewardsTrxAmount).toBe(2.5);
  });
});
