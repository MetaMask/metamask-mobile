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

const createDefaultRewardsSummary = () =>
  ({
    trxStakingRewards: {
      balance: '1.25',
      fiat: {
        balance: '12.5',
        currency: 'usd',
      },
    },
    totalStakedTrx: 42,
  }) as never;

const createDefaultRates = () =>
  ({
    'tron:abc': { rate: '0.5' },
  }) as never;

const withUseTronStakingRewardsSummary = (
  testFn: (context: {
    result: ReturnType<typeof renderHook>['result'];
    multichainAssetsRatesMock: typeof mockSelectMultichainAssetsRates;
    tronSpecialAssetsSelectorMock: typeof mockSelectTronSpecialAssetsBySelectedAccountGroup;
    currentCurrencySelectorMock: typeof mockSelectCurrentCurrency;
  }) => void,
  {
    rewardsSummary = createDefaultRewardsSummary(),
    currentCurrency = 'usd' as never,
    rates = createDefaultRates(),
    tokenAddress = 'tron:abc',
  }: {
    rewardsSummary?: ReturnType<typeof createDefaultRewardsSummary>;
    currentCurrency?: ReturnType<typeof selectCurrentCurrency>;
    rates?: ReturnType<typeof createDefaultRates>;
    tokenAddress?: string;
  } = {},
) => {
  jest.clearAllMocks();

  mockUseSelector.mockImplementation((selector) => selector({} as never));
  mockSelectTronSpecialAssetsBySelectedAccountGroup.mockReturnValue(
    rewardsSummary,
  );
  mockSelectCurrentCurrency.mockReturnValue(currentCurrency);
  mockSelectMultichainAssetsRates.mockReturnValue(rates);

  const hook = renderHook(() =>
    useTronStakingRewardsSummary({
      tokenAddress,
    }),
  );

  testFn({
    result: hook.result,
    multichainAssetsRatesMock: mockSelectMultichainAssetsRates,
    tronSpecialAssetsSelectorMock:
      mockSelectTronSpecialAssetsBySelectedAccountGroup,
    currentCurrencySelectorMock: mockSelectCurrentCurrency,
  });
};

describe('useTronStakingRewardsSummary', () => {
  it('derives the summary from tokenAddress only', () => {
    withUseTronStakingRewardsSummary(({ result }) => {
      expect(result.current).toEqual({
        claimableRewardsTrxAmount: 1.25,
        claimableRewardsFiatAmount: 12.5,
        claimableRewardsCurrency: 'usd',
        totalStakedTrx: 42,
        fiatRate: 0.5,
        currentCurrency: 'USD',
      });
    });
  });

  it('keeps fiatRate when multichain rate is the string zero', () => {
    withUseTronStakingRewardsSummary(
      ({ result }) => {
        expect(result.current.fiatRate).toBe(0);
      },
      {
        rates: {
          'tron:abc': { rate: '0' },
        } as never,
      },
    );
  });

  it('keeps fiatRate when multichain rate is numeric zero', () => {
    withUseTronStakingRewardsSummary(
      ({ result }) => {
        expect(result.current.fiatRate).toBe(0);
      },
      {
        rates: {
          'tron:abc': { rate: 0 },
        } as never,
      },
    );
  });
});
