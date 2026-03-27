import { renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { selectTronSpecialAssetsBySelectedAccountGroup } from '../../../../../../selectors/assets/assets-list';
import { selectCurrentCurrency } from '../../../../../../selectors/currencyRateController';
import { selectMultichainAssetsRates } from '../../../../../../selectors/multichain';
import useTronStakingRewardsSummary from './useTronStakingRewardsSummary';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../../../../selectors/assets/assets-list', () => ({
  selectTronSpecialAssetsBySelectedAccountGroup: jest.fn(),
}));

jest.mock('../../../../../../selectors/currencyRateController', () => ({
  selectCurrentCurrency: jest.fn(),
}));

jest.mock('../../../../../../selectors/multichain', () => ({
  selectMultichainAssetsRates: jest.fn(),
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockSelectTronSpecialAssetsBySelectedAccountGroup =
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

describe('useTronStakingRewardsSummary', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseSelector.mockImplementation((selector) => selector({} as never));
    mockSelectTronSpecialAssetsBySelectedAccountGroup.mockReturnValue({
      trxStakingRewards: {
        balance: '1.25',
        fiat: {
          balance: '12.5',
          currency: 'usd',
        },
      },
      totalStakedTrx: 42,
    } as never);
    mockSelectCurrentCurrency.mockReturnValue('usd' as never);
    mockSelectMultichainAssetsRates.mockReturnValue({
      'tron:abc': { rate: '0.5' },
    } as never);
  });

  it('derives the summary from tokenAddress only', () => {
    const { result } = renderHook(() =>
      useTronStakingRewardsSummary({
        tokenAddress: 'tron:abc',
      }),
    );

    expect(result.current).toEqual({
      claimableRewardsTrxAmount: 1.25,
      claimableRewardsFiatAmount: 12.5,
      claimableRewardsCurrency: 'usd',
      totalStakedTrx: 42,
      nonEvmFiatRate: 0.5,
      currentCurrency: 'USD',
    });
  });
});
