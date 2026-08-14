import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';
import {
  Icon,
  IconColor,
  IconName,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import Routes from '../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../locales/i18n';
import useMoneyAccountBalance from '../../../Money/hooks/useMoneyAccountBalance';
import useMoneyAccountVisibility from '../../../Money/hooks/useMoneyAccountVisibility';
import { useMoneyNavigation } from '../../../Money/hooks/useMoneyNavigation';
import useEarnSectionAssets from '../../hooks/useEarnSectionAssets';
import useHomeViewedEvent from '../../../../Views/Homepage/hooks/useHomeViewedEvent';
import { useSectionPerformance } from '../../../../Views/Homepage/hooks/useSectionPerformance';
import { TokenDetailsSource } from '../../../TokenDetails/constants/constants';
import type { EarnAssetId } from '../../types/earnAssets';
import type { EarnSectionAssetSlot } from '../../utils/earnSection';
import { EARN_EXPERIENCES } from '../../constants/experiences';
import EarnSection from './EarnSection';

jest.mock('@react-navigation/native');
jest.mock('@metamask/design-system-twrnc-preset');
jest.mock('../../hooks/useEarnSectionAssets');
jest.mock('../../../Money/hooks/useMoneyAccountBalance');
jest.mock('../../../Money/hooks/useMoneyAccountVisibility');
jest.mock('../../../Money/hooks/useMoneyNavigation');
jest.mock('../../../../Views/Homepage/hooks/useHomeViewedEvent');
jest.mock('../../../../Views/Homepage/hooks/useSectionPerformance');
jest.mock('../../../Assets/components/AssetLogo/AssetLogo', () => () => null);

const mockUseNavigation = useNavigation as jest.MockedFunction<
  typeof useNavigation
>;
const mockUseTailwind = useTailwind as jest.MockedFunction<typeof useTailwind>;
const mockUseEarnSectionAssets = useEarnSectionAssets as jest.MockedFunction<
  typeof useEarnSectionAssets
>;
const mockUseMoneyAccountBalance =
  useMoneyAccountBalance as jest.MockedFunction<typeof useMoneyAccountBalance>;
const mockUseMoneyAccountVisibility =
  useMoneyAccountVisibility as jest.MockedFunction<
    typeof useMoneyAccountVisibility
  >;
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
const assetSlot: EarnSectionAssetSlot = {
  kind: 'asset',
  key: assetId,
  asset: {
    assetId,
    address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    chainId: '0x1',
    decimals: 6,
    image: 'usdc.png',
    name: 'USD Coin',
    symbol: 'USDC',
    balance: '10',
    balanceMinimalUnit: '10000000',
    logo: 'usdc.png',
    isETH: false,
    balanceFiatNumber: 10,
    balanceFiat: '$10.00',
    experiences: [
      {
        id: 'lending:1:aave:usdc',
        type: EARN_EXPERIENCES.STABLECOIN_LENDING,
        role: 'underlying',
        rate: {
          type: 'APR',
          percentage: 4.2,
          status: 'ready',
        },
      },
    ],
    highestRatePercent: 4.2,
    highestRateExperience: {
      id: 'lending:1:aave:usdc',
      type: EARN_EXPERIENCES.STABLECOIN_LENDING,
      role: 'underlying',
      rate: {
        type: 'APR',
        percentage: 4.2,
        status: 'ready',
      },
    },
    rateStatus: 'ready',
  },
};
const zeroBalanceAssetSlot: EarnSectionAssetSlot = {
  ...assetSlot,
  asset: {
    ...assetSlot.asset,
    balance: '0',
    balanceMinimalUnit: '0',
    balanceFiat: '$0.00',
    balanceFiatNumber: 0,
  },
};
const navigate = jest.fn();

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

const getArrowIcons = () =>
  screen
    .UNSAFE_getAllByType(Icon)
    .filter(
      ({ props }) =>
        props.name === IconName.ArrowRight &&
        props.color === IconColor.SuccessDefault,
    );

describe('EarnSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseNavigation.mockReturnValue({
      navigate,
    } as unknown as ReturnType<typeof useNavigation>);
    mockUseTailwind.mockReturnValue({
      style: jest.fn(() => ({})),
    } as unknown as ReturnType<typeof useTailwind>);
    mockUseMoneyAccountVisibility.mockReturnValue({
      isMoneyAccountVisible: false,
    });
    mockUseMoneyAccountBalance.mockReturnValue({
      totalFiatFormatted: '0',
    } as ReturnType<typeof useMoneyAccountBalance>);
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

  it('renders the highest experience rate with its rate type', () => {
    render(<EarnSection sectionIndex={0} totalSectionsLoaded={1} />);

    expect(screen.getByTestId('earn-section-asset-0-card')).toBeOnTheScreen();
    expect(
      screen.getByText(
        strings('earn_module.rate_apr', {
          percentage: '4.2',
        }),
      ),
    ).toBeOnTheScreen();
  });

  it('renders a success chevron on the Money card', () => {
    mockUseMoneyAccountVisibility.mockReturnValue({
      isMoneyAccountVisible: true,
    });
    mockSectionResult({ assetSlots: [] });

    render(<EarnSection sectionIndex={0} totalSectionsLoaded={1} />);

    expect(
      screen.getByTestId('earn-section-money-account-card'),
    ).toBeOnTheScreen();
    const arrowIcons = getArrowIcons();
    expect(arrowIcons).toHaveLength(1);
    expect(arrowIcons[0].props.color).toBe(IconColor.SuccessDefault);
  });

  it('renders a success chevron on held asset cards', () => {
    render(<EarnSection sectionIndex={0} totalSectionsLoaded={1} />);

    expect(screen.getByTestId('earn-section-asset-0-card')).toBeOnTheScreen();
    const arrowIcons = getArrowIcons();
    expect(arrowIcons).toHaveLength(1);
    expect(arrowIcons[0].props.color).toBe(IconColor.SuccessDefault);
  });

  it('does not render a chevron on zero-balance asset cards', () => {
    mockSectionResult({ assetSlots: [zeroBalanceAssetSlot] });

    render(<EarnSection sectionIndex={0} totalSectionsLoaded={1} />);

    expect(screen.getByTestId('earn-section-asset-0-card')).toBeOnTheScreen();
    expect(getArrowIcons()).toHaveLength(0);
  });

  it('navigates with the selected CAIP-19 asset ID', () => {
    render(<EarnSection sectionIndex={0} totalSectionsLoaded={1} />);

    fireEvent.press(screen.getByTestId('earn-section-asset-0-card'));

    expect(navigate).toHaveBeenCalledWith(Routes.EARN.ROOT, {
      screen: Routes.EARN.STRATEGY_SELECTION,
      params: { assetId },
    });
  });

  it('navigates zero-balance assets to Asset Overview', () => {
    mockSectionResult({ assetSlots: [zeroBalanceAssetSlot] });

    render(<EarnSection sectionIndex={0} totalSectionsLoaded={1} />);

    fireEvent.press(screen.getByTestId('earn-section-asset-0-card'));

    expect(navigate).toHaveBeenCalledWith(
      'Asset',
      expect.objectContaining({
        address: zeroBalanceAssetSlot.asset.address,
        chainId: zeroBalanceAssetSlot.asset.chainId,
        symbol: zeroBalanceAssetSlot.asset.symbol,
        name: zeroBalanceAssetSlot.asset.name,
        decimals: zeroBalanceAssetSlot.asset.decimals,
        image: zeroBalanceAssetSlot.asset.image,
        balance: '0',
        isNative: zeroBalanceAssetSlot.asset.isNative,
        isETH: zeroBalanceAssetSlot.asset.isETH,
        source: TokenDetailsSource.HomeSection,
      }),
    );
    expect(navigate).not.toHaveBeenCalledWith(
      Routes.EARN.ROOT,
      expect.anything(),
    );
  });

  it('renders a visible unavailable card when catalogue sources fail', () => {
    mockSectionResult({
      assetSlots: [{ kind: 'unavailable', key: 'earn-section-error-card' }],
      hasError: true,
    });

    render(<EarnSection sectionIndex={0} totalSectionsLoaded={1} />);

    expect(screen.getByTestId('earn-section-error-card')).toBeOnTheScreen();
  });

  it('renders skeleton slots while catalogue data loads', () => {
    mockSectionResult({ isLoading: true });

    render(<EarnSection sectionIndex={0} totalSectionsLoaded={1} />);

    expect(screen.getByTestId(assetId)).toBeOnTheScreen();
    expect(
      screen.queryByTestId('earn-section-asset-0-card'),
    ).not.toBeOnTheScreen();
  });
});
