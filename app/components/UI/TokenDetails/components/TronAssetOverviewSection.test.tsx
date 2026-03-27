import React, { type ComponentProps, type ReactNode } from 'react';
import { View } from 'react-native';
import { render } from '@testing-library/react-native';
import TronAssetOverviewSection from './TronAssetOverviewSection';
import useTronAssetOverviewSection from './useTronAssetOverviewSection';

const MockView = View;

jest.mock('@metamask/design-system-react-native', () => ({
  Box: ({ children }: { children?: ReactNode }) => children ?? null,
}));

jest.mock('../../AssetOverview/Balance', () => ({
  __esModule: true,
  default: () => <MockView testID="staked-balance" />,
}));

jest.mock(
  '../../Earn/components/Tron/TronUnstakingBanner/TronUnstakingBanner',
  () => ({
    __esModule: true,
    default: () => <MockView testID="tron-unstaking-banner" />,
  }),
);

jest.mock(
  '../../Earn/components/Tron/TronUnstakedBanner/TronUnstakedBanner',
  () => ({
    __esModule: true,
    default: () => <MockView testID="tron-unstaked-banner" />,
  }),
);

jest.mock(
  '../../Earn/components/Tron/TronStakingButtons/TronStakingButtons',
  () => ({
    __esModule: true,
    default: () => <MockView testID="tron-staking-buttons" />,
  }),
);

jest.mock('../../Earn/components/Tron/TronStakingCta/TronStakingCta', () => ({
  __esModule: true,
  default: () => <MockView testID="tron-staking-cta" />,
}));

jest.mock(
  '../../Earn/components/Tron/TronStakingRewardsRows/TronClaimableRewardsRow',
  () => ({
    __esModule: true,
    default: () => <MockView testID="tron-claimable-rewards-row" />,
  }),
);

jest.mock(
  '../../Earn/components/Tron/TronStakingRewardsRows/TronEstimatedAnnualRewardsRow',
  () => ({
    __esModule: true,
    default: () => <MockView testID="tron-estimated-annual-rewards-row" />,
  }),
);

jest.mock(
  '../../Earn/components/Tron/TronStakingRewardsRows/TronErrorsBanner',
  () => ({
    __esModule: true,
    default: ({ messages }: { messages: string[] }) => (
      <MockView
        testID="tron-errors-banner"
        accessibilityLabel={messages.join('|')}
      />
    ),
  }),
);

jest.mock('./useTronAssetOverviewSection', () => ({
  __esModule: true,
  default: jest.fn(),
}));

const mockUseTronAssetOverviewSection =
  useTronAssetOverviewSection as jest.MockedFunction<
    typeof useTronAssetOverviewSection
  >;

type TronAssetOverviewSectionProps = ComponentProps<
  typeof TronAssetOverviewSection
>;

const tronToken: TronAssetOverviewSectionProps['token'] = {
  address: 'tron:token',
  chainId: 'tron:728126428',
  ticker: 'TRX',
  symbol: 'TRX',
  name: 'TRON',
  decimals: 6,
  balance: '10',
  balanceFiat: '$1.00',
  logo: '',
  image: '',
  isETH: false,
  hasBalanceError: false,
  aggregators: [],
};

const renderSubject = (props: Partial<TronAssetOverviewSectionProps> = {}) => {
  const defaultProps: TronAssetOverviewSectionProps = {
    token: tronToken,
  };
  return render(<TronAssetOverviewSection {...defaultProps} {...props} />);
};

const createDefaultHookResult = () => ({
  aprText: undefined,
  claimableRewardsRowProps: undefined,
  estimatedAnnualRewardsRowProps: undefined,
  errorMessages: [],
});

const withTronAssetOverviewSection = (
  testFn: (
    context: ReturnType<typeof renderSubject> & {
      tronAssetOverviewSectionMock: typeof mockUseTronAssetOverviewSection;
    },
  ) => void,
  {
    props = {},
    hookResult = createDefaultHookResult(),
  }: {
    props?: Partial<TronAssetOverviewSectionProps>;
    hookResult?: ReturnType<typeof createDefaultHookResult>;
  } = {},
) => {
  jest.clearAllMocks();
  mockUseTronAssetOverviewSection.mockReturnValue(hookResult);

  const view = renderSubject(props);

  testFn({
    ...view,
    tronAssetOverviewSectionMock: mockUseTronAssetOverviewSection,
  });
};

describe('TronAssetOverviewSection', () => {
  it('shows staking errors banner even when no staked TRX asset exists', () => {
    withTronAssetOverviewSection(
      ({ getByTestId }) => {
        expect(getByTestId('tron-errors-banner')).toHaveProp(
          'accessibilityLabel',
          'APR unavailable',
        );
      },
      {
        hookResult: {
          aprText: '4.5%',
          claimableRewardsRowProps: undefined,
          estimatedAnnualRewardsRowProps: undefined,
          errorMessages: ['APR unavailable'],
        },
      },
    );
  });

  it('does not render staking errors banner when there are no errors', () => {
    withTronAssetOverviewSection(({ queryByTestId }) => {
      expect(queryByTestId('tron-errors-banner')).toBeNull();
    });
  });

  it('renders only the claimable rewards row when the hook exposes only claimable props', () => {
    withTronAssetOverviewSection(
      ({ getByTestId, queryByTestId }) => {
        expect(getByTestId('tron-claimable-rewards-row')).toBeOnTheScreen();
        expect(queryByTestId('tron-estimated-annual-rewards-row')).toBeNull();
        expect(queryByTestId('staked-balance')).toBeNull();
      },
      {
        props: {
          stakedTrxAsset: undefined,
        },
        hookResult: {
          aprText: '4.5%',
          claimableRewardsRowProps: {
            title: 'Claimable',
            subtitle: '$1.00 · 1 TRX',
            hideBalances: false,
          },
          estimatedAnnualRewardsRowProps: undefined,
          errorMessages: [],
        },
      },
    );
  });

  it('renders both rewards rows when the hook exposes both props', () => {
    withTronAssetOverviewSection(
      ({ getByTestId }) => {
        expect(getByTestId('tron-claimable-rewards-row')).toBeOnTheScreen();
        expect(
          getByTestId('tron-estimated-annual-rewards-row'),
        ).toBeOnTheScreen();
      },
      {
        props: {
          stakedTrxAsset: { ...tronToken, symbol: 'sTRX' },
        },
        hookResult: {
          aprText: '4.5%',
          claimableRewardsRowProps: {
            title: 'Claimable',
            subtitle: '$1.00 · 1 TRX',
            hideBalances: false,
          },
          estimatedAnnualRewardsRowProps: {
            title: 'Estimated annual rewards',
            subtitle: '$2.00 · 2 TRX',
            hideBalances: false,
          },
          errorMessages: [],
        },
      },
    );
  });
});
