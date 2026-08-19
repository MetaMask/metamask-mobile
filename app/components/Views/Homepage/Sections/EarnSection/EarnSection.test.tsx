import React, { createRef } from 'react';
import type { Asset } from '@metamask/assets-controllers';
import { EthAccountType } from '@metamask/keyring-api';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import {
  Icon,
  IconColor,
  IconName,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import Routes from '../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../locales/i18n';
import useMoneyAccountBalance from '../../../../UI/Money/hooks/useMoneyAccountBalance';
import { selectIsMoneyAccountVisible } from '../../../../UI/Money/selectors/visibility';
import { useMoneyNavigation } from '../../../../UI/Money/hooks/useMoneyNavigation';
import useEarnSectionAssets from '../../../../UI/Earn/hooks/useEarnSectionAssets';
import useHomeViewedEvent from '../../hooks/useHomeViewedEvent';
import { useSectionPerformance } from '../../hooks/useSectionPerformance';
import { TokenDetailsSource } from '../../../../UI/TokenDetails/constants/constants';
import type { SectionRefreshHandle } from '../../types';
import type { EarnAssetId } from '../../../../UI/Earn/types/earnAssets';
import type {
  EarnSectionAssetSlot,
  EarnSectionRankedAsset,
} from '../../../../UI/Earn/utils/earnSection';
import { EARN_EXPERIENCES } from '../../../../UI/Earn/constants/experiences';
import EarnSection from './EarnSection';
import HomepageEarnSection from './HomepageEarnSection';

jest.mock('@react-navigation/native');
jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));
jest.mock('@metamask/design-system-twrnc-preset');
jest.mock('../../../../UI/Earn/hooks/useEarnSectionAssets');
jest.mock('../../../../UI/Money/hooks/useMoneyAccountBalance');
jest.mock('../../../../UI/Money/selectors/visibility');
jest.mock('../../../../UI/Money/hooks/useMoneyNavigation');
jest.mock('../../../../Views/Homepage/hooks/useHomeViewedEvent');
jest.mock('../../../../Views/Homepage/hooks/useSectionPerformance');
jest.mock(
  '../../../../UI/Assets/components/AssetLogo/AssetLogo',
  () => () => null,
);

const mockUseNavigation = useNavigation as jest.MockedFunction<
  typeof useNavigation
>;
const mockUseTailwind = useTailwind as jest.MockedFunction<typeof useTailwind>;
const mockUseEarnSectionAssets = jest.mocked(useEarnSectionAssets);
const mockUseMoneyAccountBalance =
  useMoneyAccountBalance as jest.MockedFunction<typeof useMoneyAccountBalance>;
const mockUseSelector = jest.mocked(useSelector);
const mockUseMoneyNavigation = useMoneyNavigation as jest.MockedFunction<
  typeof useMoneyNavigation
>;
const mockUseHomeViewedEvent = useHomeViewedEvent as jest.MockedFunction<
  typeof useHomeViewedEvent
>;
const mockUseSectionPerformance = useSectionPerformance as jest.MockedFunction<
  typeof useSectionPerformance
>;

const assetId =
  'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48' as EarnAssetId;
type HeldEarnSectionAsset = Extract<EarnSectionRankedAsset, { kind: 'held' }>;

const assetSlot: {
  kind: 'asset';
  key: string;
  asset: HeldEarnSectionAsset;
} = {
  kind: 'asset',
  key: assetId,
  asset: {
    kind: 'held',
    assetId,
    asset: {
      accountType: EthAccountType.Eoa,
      accountId: 'account-id',
      assetId: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      chainId: '0x1',
      decimals: 6,
      image: 'usdc.png',
      name: 'USD Coin',
      symbol: 'USDC',
      balance: '10',
      rawBalance: '0x989680',
      fiat: { balance: 10, currency: 'USD', conversionRate: 1 },
      isNative: false,
    } as Asset,
    experiences: [
      {
        id: 'lending:1:aave:usdc',
        type: EARN_EXPERIENCES.STABLECOIN_LENDING,
        role: 'underlying',
        rate: {
          type: 'APY',
          percentage: 4.2,
          status: 'ready',
        },
        isFeeSubsidized: false,
      },
    ],
    highestRatePercent: 4.2,
    highestRateExperience: {
      id: 'lending:1:aave:usdc',
      type: EARN_EXPERIENCES.STABLECOIN_LENDING,
      role: 'underlying',
      rate: {
        type: 'APY',
        percentage: 4.2,
        status: 'ready',
      },
      isFeeSubsidized: false,
    },
    rateStatus: 'ready',
  },
};
const zeroBalanceAssetSlot: typeof assetSlot = {
  ...assetSlot,
  asset: {
    ...assetSlot.asset,
    asset: {
      ...assetSlot.asset.asset,
      balance: '0',
      rawBalance: '0x0',
      fiat: { balance: 0, currency: 'USD', conversionRate: 1 },
    } as Asset,
  },
};
const navigate = jest.fn();
const mockRefetchBalance = jest.fn();
let mockMoneyAccountVisible = false;

const mockSectionResult = (
  overrides: Partial<ReturnType<typeof useEarnSectionAssets>> = {},
) => {
  mockUseEarnSectionAssets.mockReturnValue({
    assetSlots: [assetSlot],
    hasMoreAssets: false,
    moneyApyPercent: 6.2,
    moneyRateStatus: 'ready',
    isLoading: false,
    hasError: false,
    errors: [],
    refresh: jest.fn(),
    ...overrides,
  });
};

const getSuccessArrowIcons = () =>
  screen
    .UNSAFE_queryAllByType(Icon)
    .filter(
      ({ props }) =>
        props.name === IconName.ArrowRight &&
        props.color === IconColor.SuccessDefault,
    );

describe('EarnSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMoneyAccountVisible = false;
    mockUseSelector.mockImplementation((selector) =>
      selector === selectIsMoneyAccountVisible
        ? mockMoneyAccountVisible
        : undefined,
    );
    mockUseNavigation.mockReturnValue({
      navigate,
    } as unknown as ReturnType<typeof useNavigation>);
    mockUseTailwind.mockReturnValue({
      style: jest.fn(() => ({})),
    } as unknown as ReturnType<typeof useTailwind>);
    mockUseMoneyAccountBalance.mockReturnValue({
      totalFiatFormatted: '$0.00',
      totalFiatRaw: '0',
      isBalanceLoading: false,
      refetchBalance: mockRefetchBalance,
    } as unknown as ReturnType<typeof useMoneyAccountBalance>);
    mockUseMoneyNavigation.mockReturnValue({
      isOnboardingRedirectNeeded: false,
      navigateToMoneyHome: jest.fn(),
    } as ReturnType<typeof useMoneyNavigation>);
    mockUseHomeViewedEvent.mockReturnValue({
      onLayout: jest.fn(),
    } as ReturnType<typeof useHomeViewedEvent>);
    mockUseSectionPerformance.mockReturnValue(undefined);
    mockSectionResult();
  });

  it('renders the Earn section title', () => {
    render(<EarnSection />);

    expect(
      screen.getByText(strings('homepage.sections.earn')),
    ).toBeOnTheScreen();
  });

  it('disables Homepage telemetry for shared Explore rendering', () => {
    render(<EarnSection />);

    expect(mockUseHomeViewedEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        sectionRef: null,
        sectionIndex: -1,
        totalSectionsLoaded: 0,
        fireImmediateWhenNoView: false,
      }),
    );
    expect(mockUseSectionPerformance).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: false }),
    );
  });

  it('passes required section metadata to Homepage telemetry', () => {
    render(<HomepageEarnSection sectionIndex={2} totalSectionsLoaded={5} />);

    expect(mockUseHomeViewedEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        sectionIndex: 2,
        totalSectionsLoaded: 5,
        fireImmediateWhenNoView: true,
      }),
    );
    expect(mockUseSectionPerformance).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: true }),
    );
  });

  it('renders funded lending assets with Get APY copy', () => {
    render(<EarnSection />);

    expect(screen.getByTestId('earn-section-asset-0-card')).toBeOnTheScreen();
    expect(
      screen.getByText(
        strings('earn_module.get_rate_apy', {
          percentage: '4.2',
        }),
      ),
    ).toBeOnTheScreen();
  });

  it('renders APR copy for funded staking assets', () => {
    mockSectionResult({
      assetSlots: [
        {
          ...assetSlot,
          asset: {
            ...assetSlot.asset,
            highestRateExperience: {
              id: 'pooled:eip155:1/slip44:60',
              type: EARN_EXPERIENCES.POOLED_STAKING,
              role: 'underlying',
              rate: {
                type: 'APR',
                percentage: 4.2,
                status: 'ready',
              },
              isFeeSubsidized: false,
            },
          },
        },
      ],
    });

    render(<EarnSection />);

    expect(
      screen.getByText(
        strings('earn_module.get_rate_apr', {
          percentage: '4.2',
        }),
      ),
    ).toBeOnTheScreen();
  });

  it('renders No fee when a Money deposit experience is subsidized', () => {
    mockSectionResult({
      assetSlots: [
        {
          ...assetSlot,
          asset: {
            ...assetSlot.asset,
            experiences: [
              ...assetSlot.asset.experiences,
              {
                id: 'money:usdc',
                type: 'MONEY_ACCOUNT_DEPOSIT',
                role: 'funding',
                rate: {
                  type: 'APY',
                  percentage: 3.5,
                  status: 'ready',
                },
                isFeeSubsidized: true,
              },
            ],
          },
        },
      ],
    });

    render(<EarnSection />);

    expect(
      screen.getByTestId('earn-section-asset-0-no-fee-tag'),
    ).toBeOnTheScreen();
  });

  it('hides No fee when asset experiences are not subsidized', () => {
    render(<EarnSection />);

    expect(
      screen.queryByTestId('earn-section-asset-0-no-fee-tag'),
    ).not.toBeOnTheScreen();
  });

  it('renders New on the Money card with a zero balance', () => {
    mockMoneyAccountVisible = true;
    mockSectionResult({ assetSlots: [] });

    render(<EarnSection />);

    expect(
      screen.getByTestId('earn-section-money-account-card'),
    ).toBeOnTheScreen();
    expect(screen.getByText(strings('earn_module.new_tag'))).toBeOnTheScreen();
  });

  it('hides New on the Money card with a nonzero balance', () => {
    mockMoneyAccountVisible = true;
    mockUseMoneyAccountBalance.mockReturnValue({
      totalFiatFormatted: '$10.00',
      totalFiatRaw: '10',
    } as ReturnType<typeof useMoneyAccountBalance>);
    mockSectionResult({ assetSlots: [] });

    render(<EarnSection />);

    expect(
      screen.queryByText(strings('earn_module.new_tag')),
    ).not.toBeOnTheScreen();
  });

  it('hides New on the Money card when balance is unavailable', () => {
    mockMoneyAccountVisible = true;
    mockUseMoneyAccountBalance.mockReturnValue({
      totalFiatFormatted: undefined,
      totalFiatRaw: undefined,
    } as ReturnType<typeof useMoneyAccountBalance>);
    mockSectionResult({ assetSlots: [] });

    render(<EarnSection />);

    expect(
      screen.queryByText(strings('earn_module.new_tag')),
    ).not.toBeOnTheScreen();
    expect(
      screen.getByText(strings('earn_module.balance_unavailable')),
    ).toBeOnTheScreen();
  });

  it('renders a skeleton while the Money balance is loading', () => {
    mockMoneyAccountVisible = true;
    mockUseMoneyAccountBalance.mockReturnValue({
      totalFiatFormatted: undefined,
      totalFiatRaw: undefined,
      isBalanceLoading: true,
    } as ReturnType<typeof useMoneyAccountBalance>);
    mockSectionResult({ assetSlots: [] });

    render(<EarnSection />);

    expect(
      screen.getByTestId('earn-section-money-account-balance-skeleton'),
    ).toBeOnTheScreen();
    expect(
      screen.queryByText(strings('earn_module.balance_unavailable')),
    ).not.toBeOnTheScreen();
  });

  it('renders a skeleton while the Money APY is loading', () => {
    mockMoneyAccountVisible = true;
    mockSectionResult({
      assetSlots: [],
      moneyApyPercent: undefined,
      moneyRateStatus: 'loading',
    });

    render(<EarnSection />);

    expect(
      screen.getByTestId('earn-section-money-account-apy-skeleton'),
    ).toBeOnTheScreen();
    expect(
      screen.queryByText(strings('earn_module.rate_unavailable')),
    ).not.toBeOnTheScreen();
  });

  it('renders unavailable APY copy after loading settles without a rate', () => {
    mockMoneyAccountVisible = true;
    mockSectionResult({
      assetSlots: [],
      moneyApyPercent: undefined,
      moneyRateStatus: 'unavailable',
    });

    render(<EarnSection />);

    expect(
      screen.getByText(strings('earn_module.rate_unavailable')),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId('earn-section-money-account-apy-skeleton'),
    ).not.toBeOnTheScreen();
  });

  it('uses the asset name for zero-balance tiles', () => {
    mockSectionResult({ assetSlots: [zeroBalanceAssetSlot] });

    render(<EarnSection />);

    expect(screen.getByTestId('earn-section-asset-0-card')).toBeOnTheScreen();
    expect(
      screen.getByText(zeroBalanceAssetSlot.asset.asset.name),
    ).toBeOnTheScreen();
    expect(
      screen.queryByText(strings('earn_module.get_started')),
    ).not.toBeOnTheScreen();
  });

  it('removes green arrows from Money and asset tiles', () => {
    mockMoneyAccountVisible = true;

    render(<EarnSection />);

    expect(getSuccessArrowIcons()).toHaveLength(0);
  });

  it('navigates with the selected CAIP-19 asset ID', () => {
    render(<EarnSection />);

    fireEvent.press(screen.getByTestId('earn-section-asset-0-card'));

    expect(navigate).toHaveBeenCalledWith(Routes.EARN.ROOT, {
      screen: Routes.EARN.STRATEGY_SELECTION,
      params: { assetId },
    });
  });

  it('navigates zero-balance assets to Asset Overview', () => {
    mockSectionResult({ assetSlots: [zeroBalanceAssetSlot] });

    render(<EarnSection />);

    fireEvent.press(screen.getByTestId('earn-section-asset-0-card'));

    expect(navigate).toHaveBeenCalledWith(
      'Asset',
      expect.objectContaining({
        address: zeroBalanceAssetSlot.asset.asset.assetId,
        chainId: zeroBalanceAssetSlot.asset.asset.chainId,
        symbol: zeroBalanceAssetSlot.asset.asset.symbol,
        name: zeroBalanceAssetSlot.asset.asset.name,
        decimals: zeroBalanceAssetSlot.asset.asset.decimals,
        image: zeroBalanceAssetSlot.asset.asset.image,
        balance: '0',
        isNative: zeroBalanceAssetSlot.asset.asset.isNative,
        isETH: false,
        source: TokenDetailsSource.HomeSection,
      }),
    );
    expect(navigate).not.toHaveBeenCalledWith(
      Routes.EARN.ROOT,
      expect.anything(),
    );
  });

  it('navigates funded assets to Earn strategy selection', () => {
    render(<EarnSection sectionIndex={0} totalSectionsLoaded={1} />);

    fireEvent.press(screen.getByTestId('earn-section-asset-0-card'));

    expect(navigate).toHaveBeenCalledWith(Routes.EARN.ROOT, {
      screen: Routes.EARN.STRATEGY_SELECTION,
      params: { assetId },
    });
  });

  it('displays a retryable error without hiding healthy asset cards', () => {
    mockSectionResult({
      hasError: true,
    });

    render(<EarnSection />);

    expect(screen.getByTestId('earn-section-error')).toBeOnTheScreen();
    expect(screen.getByTestId('earn-section-asset-0-card')).toBeOnTheScreen();
  });

  it('refreshes catalogue sources from the error action', async () => {
    const refresh = jest.fn().mockResolvedValue(undefined);
    mockSectionResult({
      hasError: true,
      refresh,
    });
    render(<EarnSection />);

    await act(async () => {
      fireEvent.press(screen.getByTestId('earn-section-error-retry-button'));
    });

    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('refreshes catalogue sources and Money balance from the section refresh handle', async () => {
    const refresh = jest.fn().mockResolvedValue(undefined);
    mockSectionResult({ refresh });
    const ref = createRef<SectionRefreshHandle>();

    render(<EarnSection ref={ref} sectionIndex={0} totalSectionsLoaded={1} />);

    await act(async () => {
      await ref.current?.refresh();
    });

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(mockRefetchBalance).toHaveBeenCalledTimes(1);
  });

  it('prevents duplicate retries while a refresh is pending', async () => {
    let resolveRefresh: (() => void) | undefined;
    const refresh = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveRefresh = resolve;
        }),
    );
    mockSectionResult({
      hasError: true,
      refresh,
    });
    render(<EarnSection />);

    const retryButton = screen.getByTestId('earn-section-error-retry-button');
    fireEvent.press(retryButton);
    fireEvent.press(retryButton);

    expect(refresh).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveRefresh?.();
    });

    fireEvent.press(retryButton);

    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it('renders skeleton slots while catalogue data loads', () => {
    mockSectionResult({ isLoading: true });

    render(<EarnSection />);

    expect(screen.getByTestId(assetId)).toBeOnTheScreen();
    expect(
      screen.queryByTestId('earn-section-asset-0-card'),
    ).not.toBeOnTheScreen();
  });
});
