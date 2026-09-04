import React from 'react';
import type { Asset } from '@metamask/assets-controllers';
import { EthAccountType } from '@metamask/keyring-api';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { ButtonIcon, IconName } from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { EarnStrategySelectionModalTestIds } from './EarnStrategySelectionModal.testIds';
import EarnStrategySelectionModal, { requireEarnStrategyToken } from './index';
import useEarnOpportunityNavigation from '../../hooks/useEarnOpportunityNavigation';
import useEarnToasts, {
  type EarnToastOptions,
} from '../../hooks/useEarnToasts';
import { useEarnAnalytics } from '../../hooks/useEarnAnalytics';
import { EARN_EXPERIENCES } from '../../constants/experiences';
import {
  EARN_MODULE_BUTTON_INTENTS,
  EARN_MODULE_BOTTOM_SHEET_NAMES,
  EARN_MODULE_SCREEN_NAMES,
  EARN_MODULE_REDIRECT_TARGETS,
} from '../../constants/earnModuleEvents';
import type {
  EarnAsset,
  EarnAssetId,
  EarnExperience,
  EarnExperienceType,
} from '../../types/earnAssets';

let mockIsOnboardingRedirectNeeded = false;

jest.mock('@react-navigation/native');
jest.mock('@metamask/design-system-twrnc-preset');
jest.mock('../../hooks/useEarnOpportunityNavigation', () => ({
  __esModule: true,
  default: jest.fn(),
  getEarnExperienceRedirectTarget: jest.fn(() =>
    mockIsOnboardingRedirectNeeded ? 'money_onboarding' : 'money_deposit',
  ),
}));
jest.mock('../../hooks/useEarnToasts');
jest.mock('../../hooks/useEarnAnalytics', () => ({
  useEarnAnalytics: jest.fn(),
}));
jest.mock('../../../Money/hooks/useMoneyNavigation', () => ({
  useMoneyNavigation: jest.fn(() => ({
    isOnboardingRedirectNeeded: mockIsOnboardingRedirectNeeded,
  })),
}));

const mockUseNavigation = useNavigation as jest.MockedFunction<
  typeof useNavigation
>;
const mockUseRoute = useRoute as jest.MockedFunction<typeof useRoute>;
const mockUseTailwind = useTailwind as jest.MockedFunction<typeof useTailwind>;
const mockUseEarnOpportunityNavigation =
  useEarnOpportunityNavigation as jest.MockedFunction<
    typeof useEarnOpportunityNavigation
  >;
const mockUseEarnToasts = jest.mocked(useEarnToasts);
const mockUseEarnAnalytics = jest.mocked(useEarnAnalytics);
const mockTrackBottomSheetViewed = jest.fn();
const mockTrackButtonClicked = jest.fn();
const mockTrackSurfaceClicked = jest.fn();

const assetId =
  'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48' as EarnAssetId;
const assetAddress = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
const goBack = jest.fn();
const navigateToDepositForExperience = jest.fn();
const showToast = jest.fn<void, [EarnToastOptions]>();
const navigationToDepositToast = {} as EarnToastOptions;

const createExperience = (
  type: EarnExperienceType,
  id = `strategy:${type}`,
  overrides: Partial<EarnExperience> = {},
): EarnExperience => ({
  id,
  type,
  role: 'underlying',
  rate: { type: 'APY', percentage: 6.2, status: 'ready' },
  isFeeSubsidized: false,
  ...overrides,
});

const createEarnAsset = (
  experiences: readonly EarnExperience[] = [
    createExperience('MONEY_ACCOUNT_DEPOSIT', 'money:usdc'),
    createExperience(EARN_EXPERIENCES.STABLECOIN_LENDING, 'lending:usdc'),
  ],
): EarnAsset => ({
  kind: 'held',
  assetId,
  asset: {
    accountType: EthAccountType.Eoa,
    accountId: 'account-id',
    assetId: assetAddress,
    address: assetAddress,
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
  experiences,
});

const createDiscoveryEarnAsset = (
  experiences: readonly EarnExperience[],
): EarnAsset => ({
  kind: 'discovery',
  assetId,
  metadata: {
    address: assetAddress,
    chainId: '0x1',
    decimals: 6,
    image: 'usdc.png',
    name: 'USD Coin',
    symbol: 'USDC',
    logo: undefined,
    isETH: false,
  },
  experiences,
});

describe('EarnStrategySelectionModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsOnboardingRedirectNeeded = false;
    mockUseEarnAnalytics.mockReturnValue({
      trackScreenViewed: jest.fn(),
      trackComponentViewed: jest.fn(),
      trackBottomSheetViewed: mockTrackBottomSheetViewed,
      trackSurfaceClicked: mockTrackSurfaceClicked,
      trackButtonClicked: mockTrackButtonClicked,
    });
    mockUseNavigation.mockReturnValue({
      goBack,
    } as unknown as ReturnType<typeof useNavigation>);
    mockUseRoute.mockReturnValue({
      params: { earnAsset: createEarnAsset() },
    } as unknown as ReturnType<typeof useRoute>);
    mockUseTailwind.mockReturnValue({
      style: jest.fn(() => ({})),
    } as unknown as ReturnType<typeof useTailwind>);
    mockUseEarnOpportunityNavigation.mockReturnValue({
      navigateFromEarnAsset: jest.fn(),
      navigateToDepositForExperience,
    });
    mockUseEarnToasts.mockReturnValue({
      showToast,
      EarnToastOptions: {
        earnStrategySelection: {
          navigationToDeposit: navigationToDepositToast,
        },
      },
    } as unknown as ReturnType<typeof useEarnToasts>);
  });

  it('renders modal controls and every strategy returned for the asset', () => {
    render(<EarnStrategySelectionModal />);

    expect(
      screen.getByTestId(EarnStrategySelectionModalTestIds.MODAL),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(EarnStrategySelectionModalTestIds.MODAL_HEADER),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(
        EarnStrategySelectionModalTestIds.STRATEGY_CARD('money:usdc'),
      ),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(
        EarnStrategySelectionModalTestIds.STRATEGY_CARD('lending:usdc'),
      ),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(EarnStrategySelectionModalTestIds.GET_STARTED_BUTTON),
    ).toBeOnTheScreen();
  });

  it('tracks the strategy selection bottom sheet view on mount', () => {
    render(<EarnStrategySelectionModal />);

    expect(mockTrackBottomSheetViewed).toHaveBeenCalledTimes(1);
  });

  it('tracks closing the strategy selection bottom sheet', () => {
    render(<EarnStrategySelectionModal />);

    const closeButton = screen.UNSAFE_getByType(ButtonIcon);

    expect(closeButton.props.iconName).toBe(IconName.Close);

    fireEvent.press(closeButton);

    expect(mockTrackSurfaceClicked).toHaveBeenCalledWith({
      component_name: 'earn_strategy_selection_modal_close_icon',
    });
    expect(goBack).toHaveBeenCalledTimes(1);
  });

  it('renders fallback info copy for an unavailable money strategy', () => {
    mockUseRoute.mockReturnValue({
      params: {
        earnAsset: createEarnAsset([
          createExperience('MONEY_ACCOUNT_DEPOSIT', 'money:usdc', {
            rate: { type: 'APY', status: 'unavailable' },
          }),
        ]),
      },
    } as unknown as ReturnType<typeof useRoute>);

    render(<EarnStrategySelectionModal />);

    expect(
      screen.getByText(
        strings('earn.strategy_selection.strategies.rate_unavailable_subtitle'),
      ),
    ).toBeOnTheScreen();
  });

  it('does not render an unavailable non-money strategy', () => {
    mockUseRoute.mockReturnValue({
      params: {
        earnAsset: createEarnAsset([
          createExperience(
            EARN_EXPERIENCES.STABLECOIN_LENDING,
            'lending:usdc',
            { rate: { type: 'APY', status: 'unavailable' } },
          ),
        ]),
      },
    } as unknown as ReturnType<typeof useRoute>);

    const { queryByTestId } = render(<EarnStrategySelectionModal />);

    expect(
      queryByTestId(
        EarnStrategySelectionModalTestIds.STRATEGY_CARD('lending:usdc'),
      ),
    ).not.toBeOnTheScreen();
  });

  it('does not render a non-money strategy for a discovery asset', () => {
    mockUseRoute.mockReturnValue({
      params: {
        earnAsset: createDiscoveryEarnAsset([
          createExperience(EARN_EXPERIENCES.STABLECOIN_LENDING, 'lending:usdc'),
        ]),
      },
    } as unknown as ReturnType<typeof useRoute>);

    const { queryByTestId } = render(<EarnStrategySelectionModal />);

    expect(
      queryByTestId(
        EarnStrategySelectionModalTestIds.STRATEGY_CARD('lending:usdc'),
      ),
    ).not.toBeOnTheScreen();
  });

  it('selects the first strategy when the modal renders', async () => {
    render(<EarnStrategySelectionModal />);

    await waitFor(() => {
      expect(
        screen.getByTestId(
          EarnStrategySelectionModalTestIds.STRATEGY_CARD('money:usdc'),
        ).props.accessibilityState,
      ).toEqual({ selected: true });
    });
  });

  it('updates the selected strategy after a card press', async () => {
    render(<EarnStrategySelectionModal />);
    const moneyCard = screen.getByTestId(
      EarnStrategySelectionModalTestIds.STRATEGY_CARD('money:usdc'),
    );
    const lendingCard = screen.getByTestId(
      EarnStrategySelectionModalTestIds.STRATEGY_CARD('lending:usdc'),
    );

    fireEvent.press(lendingCard);

    await waitFor(() => {
      expect(moneyCard.props.accessibilityState).toEqual({ selected: false });
      expect(lendingCard.props.accessibilityState).toEqual({ selected: true });
    });
  });

  it('disables get started when the asset has no strategies', () => {
    mockUseRoute.mockReturnValue({
      params: { earnAsset: createEarnAsset([]) },
    } as unknown as ReturnType<typeof useRoute>);

    render(<EarnStrategySelectionModal />);

    expect(
      screen.getByTestId(EarnStrategySelectionModalTestIds.GET_STARTED_BUTTON)
        .props.accessibilityState?.disabled,
    ).toBe(true);
  });

  it('navigates to deposit with the selected asset and strategy', async () => {
    const earnAsset = createEarnAsset([
      createExperience('MONEY_ACCOUNT_DEPOSIT', 'money:usdc'),
    ]);
    mockUseRoute.mockReturnValue({
      params: { earnAsset },
    } as unknown as ReturnType<typeof useRoute>);

    render(<EarnStrategySelectionModal />);

    await waitFor(() => {
      expect(
        screen.getByTestId(
          EarnStrategySelectionModalTestIds.STRATEGY_CARD('money:usdc'),
        ).props.accessibilityState,
      ).toEqual({ selected: true });
    });

    fireEvent.press(
      screen.getByTestId(EarnStrategySelectionModalTestIds.GET_STARTED_BUTTON),
    );

    await waitFor(() => {
      expect(navigateToDepositForExperience).toHaveBeenCalledWith(
        earnAsset,
        expect.objectContaining({ id: 'money:usdc' }),
      );
    });
  });

  it.each([
    [false, EARN_MODULE_REDIRECT_TARGETS.MONEY_DEPOSIT],
    [true, EARN_MODULE_REDIRECT_TARGETS.MONEY_ONBOARDING],
  ])(
    'tracks final Money strategy and %s onboarding destination',
    async (isOnboardingNeeded, expectedRedirectTarget) => {
      mockIsOnboardingRedirectNeeded = isOnboardingNeeded;
      const earnAsset = createEarnAsset([
        createExperience('MONEY_ACCOUNT_DEPOSIT', 'money:usdc'),
        createExperience(EARN_EXPERIENCES.STABLECOIN_LENDING, 'lending:usdc'),
      ]);
      mockUseRoute.mockReturnValue({
        params: {
          earnAsset,
          analyticsContext: {
            entry_point: 'homepage',
            screen_name: EARN_MODULE_SCREEN_NAMES.WALLET_HOME,
            asset_position: 2,
            assets_in_list: 5,
          },
        },
      } as unknown as ReturnType<typeof useRoute>);

      render(<EarnStrategySelectionModal />);

      await waitFor(() => {
        expect(
          screen.getByTestId(
            EarnStrategySelectionModalTestIds.STRATEGY_CARD('money:usdc'),
          ).props.accessibilityState,
        ).toEqual({ selected: true });
      });

      await act(async () => {
        fireEvent.press(
          screen.getByTestId(
            EarnStrategySelectionModalTestIds.GET_STARTED_BUTTON,
          ),
        );
        await Promise.resolve();
      });

      expect(mockUseEarnAnalytics).toHaveBeenCalledWith(
        expect.objectContaining({
          bottom_sheet_name:
            EARN_MODULE_BOTTOM_SHEET_NAMES.STRATEGY_SELECTION_MODAL,
          entry_point: 'homepage',
          screen_name: EARN_MODULE_SCREEN_NAMES.WALLET_HOME,
        }),
      );
      expect(mockTrackButtonClicked).toHaveBeenCalledWith(
        expect.objectContaining({
          button_intent: EARN_MODULE_BUTTON_INTENTS.DEPOSIT,
          selected_strategy_type: 'money_account_deposit',
          selected_strategy_position: 1,
          asset_position: 2,
          assets_in_list: 5,
          rate_type: 'apy',
          selected_strategy_rate_percentage: 6.2,
          is_fee_subsidized: false,
          redirect_target: expectedRedirectTarget,
        }),
      );
    },
  );

  it('shows a toast when deposit navigation fails', async () => {
    const error = new Error('deposit navigation failed');
    navigateToDepositForExperience.mockImplementationOnce(() => {
      throw error;
    });

    render(<EarnStrategySelectionModal />);

    fireEvent.press(
      screen.getByTestId(EarnStrategySelectionModalTestIds.GET_STARTED_BUTTON),
    );

    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith(navigationToDepositToast);
    });
  });

  it('throws when staking strategy token metadata is unavailable', () => {
    expect(() => requireEarnStrategyToken()).toThrow(
      'Earn strategy asset metadata is unavailable',
    );
  });
});
