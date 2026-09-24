import React from 'react';
import BigNumber from 'bignumber.js';
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
import { strings } from '../../../../../../locales/i18n';
import { EarnStrategySelectionModalTestIds } from './EarnStrategySelectionModal.testIds';
import EarnStrategySelectionModal, { requireEarnStrategyToken } from './index';
import useEarnOpportunityNavigation, {
  type EarnDepositNavigationRoute,
} from '../../hooks/useEarnOpportunityNavigation';
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
import Logger from '../../../../../util/Logger';

let mockIsOnboardingRedirectNeeded = false;
const mockEarnRedirectTargets = {
  TOKEN_DETAILS: 'token_details',
  MONEY_ONBOARDING: 'money_onboarding',
  MONEY_DEPOSIT: 'money_deposit',
  POOLED_STAKING_DEPOSIT: 'pooled_staking_deposit',
  STABLECOIN_LENDING_DEPOSIT: 'stablecoin_lending_deposit',
  TRX_STAKING_DEPOSIT: 'trx_staking_deposit',
} as const;
const mockGetEarnExperienceDepositRedirectTarget = jest.fn(
  (
    experience: EarnExperience,
    isOnboardingRedirectNeeded: boolean,
  ): string | undefined => {
    try {
      if (experience.type === 'MONEY_ACCOUNT_DEPOSIT') {
        return isOnboardingRedirectNeeded
          ? mockEarnRedirectTargets.MONEY_ONBOARDING
          : mockEarnRedirectTargets.MONEY_DEPOSIT;
      }

      if (experience.type === 'POOLED_STAKING') {
        return mockEarnRedirectTargets.POOLED_STAKING_DEPOSIT;
      }

      if (experience.type === 'STABLECOIN_LENDING') {
        return mockEarnRedirectTargets.STABLECOIN_LENDING_DEPOSIT;
      }

      if (experience.type === 'TRX_STAKING') {
        return mockEarnRedirectTargets.TRX_STAKING_DEPOSIT;
      }

      throw new Error(
        `[useEarnOpportunityNavigation] Unsupported Earn experience: ${experience.type}`,
      );
    } catch (error) {
      Logger.error(
        error as Error,
        '[useEarnOpportunityNavigation] Failed to resolve Earn experience redirect target',
      );
      return undefined;
    }
  },
);

jest.mock('@react-navigation/native');
jest.mock('@metamask/design-system-twrnc-preset');
jest.mock('../../../../../util/Logger', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
  },
}));
jest.mock('../../hooks/useEarnOpportunityNavigation', () => ({
  __esModule: true,
  default: jest.fn(),
  getEarnExperienceDepositRedirectTarget:
    mockGetEarnExperienceDepositRedirectTarget,
  getSelectedEarnStrategyRedirectTarget: jest.fn(
    (
      experience: EarnExperience,
      isOnboardingRedirectNeeded: boolean,
      depositNavigationRoute?: EarnDepositNavigationRoute,
    ) => {
      if (depositNavigationRoute) {
        return depositNavigationRoute.redirectTarget;
      }

      if (experience.depositReadiness.status === 'not_ready') {
        return mockEarnRedirectTargets.TOKEN_DETAILS;
      }

      return mockGetEarnExperienceDepositRedirectTarget(
        experience,
        isOnboardingRedirectNeeded,
      );
    },
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

const assetAddress = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
const usdtAddress = '0xdac17f958d2ee523a2206206994597c13d831ec7';
const usdcAssetId = `eip155:1/erc20:${assetAddress}` as EarnAssetId;
const usdtAssetId = `eip155:1/erc20:${usdtAddress}` as EarnAssetId;
const goBack = jest.fn();
const navigateToDepositForExperience = jest.fn();
const resolveEarnDepositNavigationRoute = jest.fn();
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
  depositReadiness: { status: 'ready' },
  rate: { type: 'APY', percentage: 6.2, status: 'ready' },
  isFeeSubsidized: false,
  ...overrides,
});

const createEarnAsset = (
  experiences: readonly EarnExperience[] = [
    createExperience('MONEY_ACCOUNT_DEPOSIT', 'money:usdc'),
    createExperience(EARN_EXPERIENCES.STABLECOIN_LENDING, 'lending:usdc'),
  ],
  fiatBalance = 10,
): EarnAsset => ({
  assetId: usdcAssetId,
  metadata: {
    address: assetAddress,
    chainId: '0x1',
    decimals: 6,
    image: 'usdc.png',
    name: 'USD Coin',
    symbol: 'USDC',
    ticker: 'USDC',
    logo: 'usdc.png',
    isETH: false,
    isNative: false,
  },
  wallet: {
    status: 'tracked',
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
      balance: String(fiatBalance),
      rawBalance: `0x${new BigNumber(fiatBalance).shiftedBy(6).toString(16)}`,
      fiat: { balance: fiatBalance, currency: 'USD', conversionRate: 1 },
      isNative: false,
    } as Asset,
  },
  experiences,
});

const createUntrackedEarnAsset = (
  experiences: readonly EarnExperience[],
): EarnAsset => ({
  assetId: usdtAssetId,
  metadata: {
    address: usdtAddress,
    chainId: '0x1',
    decimals: 6,
    image: 'usdt.png',
    name: 'Tether USD',
    symbol: 'USDT',
    ticker: 'USDT',
    logo: 'usdt.png',
    isETH: false,
  },
  wallet: { status: 'untracked' },
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
      resolveEarnDepositNavigationRoute,
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

    const closeButton = screen.getByTestId(
      EarnStrategySelectionModalTestIds.CLOSE_BUTTON,
    );

    fireEvent.press(closeButton);

    expect(mockTrackSurfaceClicked).toHaveBeenCalledWith({
      component_name: 'earn_strategy_selection_modal_close_icon',
    });
    expect(goBack).toHaveBeenCalledTimes(1);
  });

  it('does not track a close when Get Started dismisses the sheet for deposit navigation', async () => {
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

    await act(async () => {
      fireEvent.press(
        screen.getByTestId(
          EarnStrategySelectionModalTestIds.GET_STARTED_BUTTON,
        ),
      );
    });

    await waitFor(() => {
      expect(navigateToDepositForExperience).toHaveBeenCalledWith(
        earnAsset,
        expect.objectContaining({ id: 'money:usdc' }),
        undefined,
        undefined,
      );
    });
    expect(mockTrackSurfaceClicked).not.toHaveBeenCalled();
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

  it('renders an unavailable non-money strategy without a rate tag', () => {
    mockUseRoute.mockReturnValue({
      params: {
        earnAsset: createEarnAsset(
          [
            createExperience(
              EARN_EXPERIENCES.STABLECOIN_LENDING,
              'lending:usdc',
              {
                depositReadiness: {
                  status: 'not_ready',
                  reason: 'insufficient_balance',
                },
                rate: { type: 'APY', status: 'unavailable' },
              },
            ),
          ],
          0.009,
        ),
      },
    } as unknown as ReturnType<typeof useRoute>);

    const { queryByTestId } = render(<EarnStrategySelectionModal />);

    expect(
      screen.getByTestId(
        EarnStrategySelectionModalTestIds.STRATEGY_CARD('lending:usdc'),
      ),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(
        `${EarnStrategySelectionModalTestIds.STRATEGY_CARD('lending:usdc')}-earn-strategy-rate-tag`,
      ),
    ).not.toBeOnTheScreen();
  });

  it('renders a non-money strategy for an untracked asset', () => {
    mockUseRoute.mockReturnValue({
      params: {
        earnAsset: createUntrackedEarnAsset([
          createExperience(EARN_EXPERIENCES.STABLECOIN_LENDING, 'lending:usdt'),
        ]),
      },
    } as unknown as ReturnType<typeof useRoute>);

    render(<EarnStrategySelectionModal />);

    expect(
      screen.getByTestId(
        EarnStrategySelectionModalTestIds.STRATEGY_CARD('lending:usdt'),
      ),
    ).toBeOnTheScreen();
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

    await act(async () => {
      fireEvent.press(
        screen.getByTestId(
          EarnStrategySelectionModalTestIds.GET_STARTED_BUTTON,
        ),
      );
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(navigateToDepositForExperience).toHaveBeenCalledWith(
        earnAsset,
        expect.objectContaining({ id: 'money:usdc' }),
        undefined,
        undefined,
      );
    });
  });

  it('uses the fiat Money deposit route for an unheld Money strategy', async () => {
    const earnAsset = createUntrackedEarnAsset([
      createExperience('MONEY_ACCOUNT_DEPOSIT', 'money:usdc', {
        depositReadiness: {
          status: 'not_ready',
          reason: 'asset_not_tracked',
        },
      }),
    ]);
    const moneyFiatRoute = {
      type: 'money-fiat' as const,
      redirectTarget: EARN_MODULE_REDIRECT_TARGETS.MONEY_DEPOSIT,
    };
    resolveEarnDepositNavigationRoute.mockReturnValueOnce(moneyFiatRoute);
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

    await act(async () => {
      fireEvent.press(
        screen.getByTestId(
          EarnStrategySelectionModalTestIds.GET_STARTED_BUTTON,
        ),
      );
    });

    await waitFor(() =>
      expect(navigateToDepositForExperience).toHaveBeenCalled(),
    );

    expect(navigateToDepositForExperience).toHaveBeenCalledWith(
      earnAsset,
      expect.objectContaining({ id: 'money:usdc' }),
      undefined,
      moneyFiatRoute,
    );
    expect(mockTrackButtonClicked).toHaveBeenCalledWith(
      expect.objectContaining({
        redirect_target: EARN_MODULE_REDIRECT_TARGETS.MONEY_DEPOSIT,
      }),
    );
  });

  it('preserves the acquisition route for an unheld non-Money strategy', async () => {
    const earnAsset = createUntrackedEarnAsset([
      createExperience(EARN_EXPERIENCES.STABLECOIN_LENDING, 'lending:usdt', {
        depositReadiness: {
          status: 'not_ready',
          reason: 'asset_not_tracked',
        },
      }),
    ]);
    const buyRoute = {
      type: 'buy' as const,
      assetId: usdtAssetId,
      redirectTarget: EARN_MODULE_REDIRECT_TARGETS.BUY,
    };
    resolveEarnDepositNavigationRoute.mockReturnValueOnce(buyRoute);
    mockUseRoute.mockReturnValue({
      params: { earnAsset },
    } as unknown as ReturnType<typeof useRoute>);

    render(<EarnStrategySelectionModal />);

    await waitFor(() => {
      expect(
        screen.getByTestId(
          EarnStrategySelectionModalTestIds.STRATEGY_CARD('lending:usdt'),
        ).props.accessibilityState,
      ).toEqual({ selected: true });
    });

    await act(async () => {
      fireEvent.press(
        screen.getByTestId(
          EarnStrategySelectionModalTestIds.GET_STARTED_BUTTON,
        ),
      );
    });

    await waitFor(() =>
      expect(navigateToDepositForExperience).toHaveBeenCalled(),
    );

    expect(navigateToDepositForExperience).toHaveBeenCalledWith(
      earnAsset,
      expect.objectContaining({ id: 'lending:usdt' }),
      undefined,
      buyRoute,
    );
    expect(mockTrackButtonClicked).toHaveBeenCalledWith(
      expect.objectContaining({
        redirect_target: EARN_MODULE_REDIRECT_TARGETS.BUY,
      }),
    );
  });

  it('tracks Token Details when no acquisition route exists', async () => {
    const earnAsset = createEarnAsset(
      [
        createExperience(EARN_EXPERIENCES.STABLECOIN_LENDING, 'lending:usdc', {
          depositReadiness: {
            status: 'not_ready',
            reason: 'insufficient_balance',
          },
        }),
      ],
      0.009,
    );
    mockUseRoute.mockReturnValue({
      params: { earnAsset },
    } as unknown as ReturnType<typeof useRoute>);

    render(<EarnStrategySelectionModal />);

    await waitFor(() =>
      expect(
        screen.getByTestId(
          EarnStrategySelectionModalTestIds.STRATEGY_CARD('lending:usdc'),
        ).props.accessibilityState,
      ).toEqual({ selected: true }),
    );

    await act(async () => {
      fireEvent.press(
        screen.getByTestId(
          EarnStrategySelectionModalTestIds.GET_STARTED_BUTTON,
        ),
      );
    });

    await waitFor(() =>
      expect(navigateToDepositForExperience).toHaveBeenCalled(),
    );
    expect(resolveEarnDepositNavigationRoute).toHaveBeenCalledWith(
      earnAsset,
      expect.objectContaining({ id: 'lending:usdc' }),
    );
    expect(navigateToDepositForExperience).toHaveBeenCalledWith(
      earnAsset,
      expect.objectContaining({ id: 'lending:usdc' }),
      undefined,
      undefined,
    );
    expect(mockTrackButtonClicked).toHaveBeenCalledWith(
      expect.objectContaining({
        redirect_target: EARN_MODULE_REDIRECT_TARGETS.TOKEN_DETAILS,
      }),
    );
  });

  it('shows a toast when deposit route resolution fails', async () => {
    const error = new Error('acquisition resolver failed');
    resolveEarnDepositNavigationRoute.mockImplementationOnce(() => {
      throw error;
    });

    render(<EarnStrategySelectionModal />);

    await waitFor(() =>
      expect(
        screen.getByTestId(
          EarnStrategySelectionModalTestIds.STRATEGY_CARD('money:usdc'),
        ).props.accessibilityState,
      ).toEqual({ selected: true }),
    );

    await act(async () => {
      fireEvent.press(
        screen.getByTestId(
          EarnStrategySelectionModalTestIds.GET_STARTED_BUTTON,
        ),
      );
    });

    await waitFor(() =>
      expect(showToast).toHaveBeenCalledWith(navigationToDepositToast),
    );
    expect(navigateToDepositForExperience).not.toHaveBeenCalled();
    expect(mockTrackButtonClicked).not.toHaveBeenCalled();
  });

  it('tracks the non-Money deposit destination for a ready lending strategy', async () => {
    const earnAsset = createEarnAsset([
      createExperience(EARN_EXPERIENCES.STABLECOIN_LENDING, 'lending:usdc'),
    ]);
    mockUseRoute.mockReturnValue({
      params: { earnAsset },
    } as unknown as ReturnType<typeof useRoute>);

    render(<EarnStrategySelectionModal />);

    await waitFor(() =>
      expect(
        screen.getByTestId(
          EarnStrategySelectionModalTestIds.STRATEGY_CARD('lending:usdc'),
        ).props.accessibilityState,
      ).toEqual({ selected: true }),
    );

    await act(async () => {
      fireEvent.press(
        screen.getByTestId(
          EarnStrategySelectionModalTestIds.GET_STARTED_BUTTON,
        ),
      );
    });

    await waitFor(() =>
      expect(navigateToDepositForExperience).toHaveBeenCalled(),
    );
    expect(mockTrackButtonClicked).toHaveBeenCalledWith(
      expect.objectContaining({
        selected_strategy_type: 'stablecoin_lending',
        redirect_target:
          EARN_MODULE_REDIRECT_TARGETS.STABLECOIN_LENDING_DEPOSIT,
      }),
    );
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
      });

      await waitFor(() =>
        expect(navigateToDepositForExperience).toHaveBeenCalled(),
      );

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

    await act(async () => {
      fireEvent.press(
        screen.getByTestId(
          EarnStrategySelectionModalTestIds.GET_STARTED_BUTTON,
        ),
      );
      await Promise.resolve();
    });

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
