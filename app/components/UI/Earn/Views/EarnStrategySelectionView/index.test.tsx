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
import { IconName } from '@metamask/design-system-react-native';
import { EarnStrategyRiskLevel } from '../../components/EarnStrategyCard';
import { EARN_EXPERIENCES } from '../../constants/experiences';
import useEarnAssetStrategies, {
  type EarnAssetStrategy,
} from '../../hooks/useEarnAssetStrategies';
import { useStablecoinLendingRedirect } from '../../hooks/useStablecoinLendingRedirect';
import useStakingChain from '../../../Stake/hooks/useStakingChain';
import { useMoneyAccountDeposit } from '../../../Money/hooks/useMoneyAccount';
import { useMoneyOnboardingNavigation } from '../../../Money/hooks/useMoneyNavigation';
import type {
  EarnAsset,
  EarnAssetId,
  EarnExperienceType,
} from '../../types/earnAssets';
import Routes from '../../../../../constants/navigation/Routes';
import Engine from '../../../../../core/Engine';
import { MoneyPostOnboardingRedirectType } from '../../../Money/types/navigation';
import {
  LENDING_FAQ_URL,
  MONEY_LANDING_URL,
  POOLED_STAKING_FAQ_URL,
  TRON_STAKING_FAQ_URL,
} from '../../../../../constants/urls';
import useEarnToasts, {
  type EarnToastOptions,
} from '../../hooks/useEarnToasts';
import EarnStrategySelectionView, {
  getMoneyDepositPaymentToken,
  requireEarnStrategyToken,
} from './index';

jest.mock('@react-navigation/native');
jest.mock('@metamask/design-system-twrnc-preset');
jest.mock('../../hooks/useEarnAssetStrategies');
jest.mock('../../hooks/useStablecoinLendingRedirect');
jest.mock('../../../Stake/hooks/useStakingChain');
jest.mock('../../../Money/hooks/useMoneyAccount');
jest.mock('../../../Money/hooks/useMoneyNavigation');
jest.mock('../../hooks/useEarnToasts');
jest.mock('../../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      MultichainNetworkController: {
        setActiveNetwork: jest.fn(),
      },
    },
  },
}));
jest.mock('../../../../../util/Logger', () => ({
  __esModule: true,
  default: { error: jest.fn() },
}));

const mockUseNavigation = useNavigation as jest.MockedFunction<
  typeof useNavigation
>;
const mockUseRoute = useRoute as jest.MockedFunction<typeof useRoute>;
const mockUseTailwind = useTailwind as jest.MockedFunction<typeof useTailwind>;
const mockUseEarnAssetStrategies =
  useEarnAssetStrategies as jest.MockedFunction<typeof useEarnAssetStrategies>;
const mockUseStablecoinLendingRedirect =
  useStablecoinLendingRedirect as jest.MockedFunction<
    typeof useStablecoinLendingRedirect
  >;
const mockUseStakingChain = useStakingChain as jest.MockedFunction<
  typeof useStakingChain
>;
const mockUseMoneyAccountDeposit =
  useMoneyAccountDeposit as jest.MockedFunction<typeof useMoneyAccountDeposit>;
const mockUseMoneyOnboardingNavigation = jest.mocked(
  useMoneyOnboardingNavigation,
);
const mockUseEarnToasts = jest.mocked(useEarnToasts);

const assetId =
  'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48' as EarnAssetId;
const goBack = jest.fn();
const navigate = jest.fn();
const initiateDeposit = jest.fn();
const lendingRedirect = jest.fn();
const redirectToOnboardingIfNeeded = jest.fn();
const showToast = jest.fn<void, [EarnToastOptions]>();
const navigationToDepositToast = {} as EarnToastOptions;
const setActiveNetwork =
  Engine.context.MultichainNetworkController.setActiveNetwork;

const createStrategy = (
  type: EarnExperienceType,
  id = `strategy:${type}`,
): EarnAssetStrategy => ({
  id,
  experience: {
    id,
    type,
    role: 'underlying',
    rate: { type: 'APY', percentage: 6.2, status: 'ready' },
    isFeeSubsidized: false,
  },
  risk: EarnStrategyRiskLevel.Recommended,
  title: '6.2% APY',
  subtitle: 'Strategy',
  tertiaryText: 'Highest yield',
  infoRows: [
    {
      id: `${id}:1`,
      icon: IconName.Chart,
      text: 'Strategy information',
    },
  ],
});

const createHookResult = (): ReturnType<typeof useEarnAssetStrategies> => ({
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
    experiences: [],
  },
  strategies: [
    createStrategy('MONEY_ACCOUNT_DEPOSIT', 'money:usdc'),
    {
      id: 'lending:usdc',
      experience: {
        id: 'lending:usdc',
        type: EARN_EXPERIENCES.STABLECOIN_LENDING,
        role: 'underlying',
        rate: { type: 'APR', percentage: 4.2, status: 'ready' },
        isFeeSubsidized: false,
      },
      risk: EarnStrategyRiskLevel.Medium,
      title: '4.2% APR',
      subtitle: 'Lend USDC',
      tertiaryText: 'Lower yield',
      infoRows: [
        {
          id: 'lending:usdc:1',
          icon: IconName.Chart,
          text: 'Lending strategy information',
        },
      ],
    },
  ],
  isLoading: false,
  hasError: false,
  errors: [],
  refresh: jest.fn(),
});

describe('EarnStrategySelectionView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    initiateDeposit.mockResolvedValue(undefined);
    lendingRedirect.mockResolvedValue(undefined);
    redirectToOnboardingIfNeeded.mockReturnValue(false);
    mockUseNavigation.mockReturnValue({
      goBack,
      navigate,
    } as unknown as ReturnType<typeof useNavigation>);
    mockUseRoute.mockReturnValue({
      params: { assetId },
    } as unknown as ReturnType<typeof useRoute>);
    mockUseTailwind.mockReturnValue({
      style: jest.fn(() => ({})),
    } as unknown as ReturnType<typeof useTailwind>);
    mockUseEarnAssetStrategies.mockReturnValue(createHookResult());
    mockUseStablecoinLendingRedirect.mockReturnValue(lendingRedirect);
    mockUseStakingChain.mockReturnValue({
      isStakingSupportedChain: true,
    });
    mockUseMoneyAccountDeposit.mockReturnValue({
      initiateDeposit,
    });
    mockUseMoneyOnboardingNavigation.mockReturnValue({
      isOnboardingRedirectNeeded: false,
      redirectToOnboardingIfNeeded,
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

  it('renders every strategy returned for the selected asset', () => {
    render(<EarnStrategySelectionView />);

    expect(
      screen.getByTestId('earn-strategy-card-money:usdc'),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId('earn-strategy-card-lending:usdc'),
    ).toBeOnTheScreen();
  });

  it('renders No fee for a subsidized Money strategy', () => {
    const hookResult = createHookResult();
    hookResult.strategies[0].experience.isFeeSubsidized = true;
    mockUseEarnAssetStrategies.mockReturnValue(hookResult);

    render(<EarnStrategySelectionView />);

    expect(
      screen.getByTestId('earn-strategy-card-money:usdc-no-fee-tag'),
    ).toBeOnTheScreen();
  });

  it('hides No fee for a non-subsidized Money strategy', () => {
    render(<EarnStrategySelectionView />);

    expect(
      screen.queryByTestId('earn-strategy-card-money:usdc-no-fee-tag'),
    ).not.toBeOnTheScreen();
  });

  it('selects the first strategy when catalogue data resolves', async () => {
    render(<EarnStrategySelectionView />);

    await waitFor(() => {
      expect(
        screen.getByTestId('earn-strategy-card-money:usdc').props
          .accessibilityState,
      ).toEqual({ selected: true });
    });
  });

  it('updates the selected strategy after a card press', async () => {
    render(<EarnStrategySelectionView />);
    const lendingCard = screen.getByTestId('earn-strategy-card-lending:usdc');

    fireEvent.press(lendingCard);

    await waitFor(() => {
      expect(lendingCard.props.accessibilityState).toEqual({ selected: true });
    });
  });

  it('renders an explicit error when the asset cannot be resolved', () => {
    mockUseEarnAssetStrategies.mockReturnValue({
      ...createHookResult(),
      asset: undefined,
      strategies: [],
    });

    render(<EarnStrategySelectionView />);

    expect(
      screen.getByTestId('earn-strategy-selection-error'),
    ).toBeOnTheScreen();
  });

  it('shows the navigation toast when the selected strategy or asset is unavailable', async () => {
    mockUseEarnAssetStrategies.mockReturnValue({
      ...createHookResult(),
      asset: undefined,
      strategies: [createStrategy('MONEY_ACCOUNT_DEPOSIT')],
    });

    render(<EarnStrategySelectionView />);

    await waitFor(() => {
      expect(
        screen.getByTestId('earn-strategy-selection-get-started-button').props
          .accessibilityState?.disabled,
      ).not.toBe(true);
    });

    await act(async () => {
      fireEvent.press(
        screen.getByTestId('earn-strategy-selection-get-started-button'),
      );
    });

    expect(showToast).toHaveBeenCalledWith(navigationToDepositToast);
  });

  it('renders degraded state when strategy rates are unavailable', () => {
    mockUseEarnAssetStrategies.mockReturnValue({
      ...createHookResult(),
      hasError: true,
    });

    render(<EarnStrategySelectionView />);

    expect(
      screen.getByTestId('earn-strategy-selection-degraded'),
    ).toBeOnTheScreen();
  });

  it('renders loading state while catalogue data resolves', () => {
    mockUseEarnAssetStrategies.mockReturnValue({
      ...createHookResult(),
      asset: undefined,
      strategies: [],
      isLoading: true,
    });

    render(<EarnStrategySelectionView />);

    expect(
      screen.getByTestId('earn-strategy-selection-loading'),
    ).toBeOnTheScreen();
  });

  it('disables get started while catalogue data resolves', () => {
    mockUseEarnAssetStrategies.mockReturnValue({
      ...createHookResult(),
      isLoading: true,
    });

    render(<EarnStrategySelectionView />);

    expect(
      screen.getByTestId('earn-strategy-selection-get-started-button').props
        .accessibilityState?.disabled,
    ).toBe(true);
  });

  it('shows loading state and disables get started while deposit navigation is pending', async () => {
    const hookResult = createHookResult();
    let resolveDeposit: () => void = () => undefined;
    const depositPromise = new Promise<void>((resolve) => {
      resolveDeposit = resolve;
    });
    initiateDeposit.mockReturnValue(depositPromise);
    mockUseEarnAssetStrategies.mockReturnValue({
      ...hookResult,
      strategies: [createStrategy('MONEY_ACCOUNT_DEPOSIT')],
    });

    render(<EarnStrategySelectionView />);

    await waitFor(() => {
      expect(
        screen.getByTestId('earn-strategy-card-strategy:MONEY_ACCOUNT_DEPOSIT')
          .props.accessibilityState,
      ).toEqual({ selected: true });
    });

    await act(async () => {
      fireEvent.press(
        screen.getByTestId('earn-strategy-selection-get-started-button'),
      );
      await Promise.resolve();
    });

    const button = screen.getByTestId(
      'earn-strategy-selection-get-started-button',
    );
    expect(button.props.accessibilityState?.disabled).toBe(true);
    expect(button.props.accessibilityState?.busy).toBe(true);

    resolveDeposit();
    await act(async () => {
      await depositPromise;
    });

    await waitFor(() => {
      expect(
        screen.getByTestId('earn-strategy-selection-get-started-button').props
          .accessibilityState?.busy,
      ).not.toBe(true);
    });
  });

  it('returns to the previous screen from the back button', () => {
    render(<EarnStrategySelectionView />);

    fireEvent.press(screen.getByTestId('earn-strategy-selection-back-button'));

    expect(goBack).toHaveBeenCalledTimes(1);
  });

  it('throws when Money strategy asset is not held', () => {
    const discoveryAsset: EarnAsset = {
      kind: 'discovery',
      assetId,
      metadata: {
        address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        chainId: '0x1',
        decimals: 6,
        image: '',
        name: 'USD Coin',
        symbol: 'USDC',
        logo: undefined,
        isETH: false,
      },
      experiences: [],
    };

    expect(() => getMoneyDepositPaymentToken(discoveryAsset)).toThrow(
      'Money deposit requires a held asset with address property',
    );
  });

  it('throws when staking strategy token metadata is unavailable', () => {
    expect(() => requireEarnStrategyToken()).toThrow(
      'Earn strategy asset metadata is unavailable',
    );
  });

  it.each([
    ['MONEY_ACCOUNT_DEPOSIT', MONEY_LANDING_URL],
    [EARN_EXPERIENCES.STABLECOIN_LENDING, LENDING_FAQ_URL],
    [EARN_EXPERIENCES.POOLED_STAKING, POOLED_STAKING_FAQ_URL],
    [EARN_EXPERIENCES.TRX_STAKING, TRON_STAKING_FAQ_URL],
  ] as const)('opens %s FAQ in the in-app browser', async (type, url) => {
    mockUseEarnAssetStrategies.mockReturnValue({
      ...createHookResult(),
      strategies: [createStrategy(type)],
    });

    render(<EarnStrategySelectionView />);

    await waitFor(() => {
      expect(
        screen.getByTestId(`earn-strategy-card-strategy:${type}`).props
          .accessibilityState,
      ).toEqual({ selected: true });
    });

    fireEvent.press(
      screen.getByTestId('earn-strategy-selection-learn-more-button'),
    );

    expect(navigate).toHaveBeenCalledWith(Routes.BROWSER.HOME, {
      screen: Routes.BROWSER.VIEW,
      params: {
        newTabUrl: url,
        timestamp: expect.any(Number),
        fromEarnStrategySelection: true,
      },
    });
  });

  it('starts Money deposit with the selected asset and convert intent', async () => {
    const hookResult = createHookResult();
    mockUseEarnAssetStrategies.mockReturnValue({
      ...hookResult,
      strategies: [createStrategy('MONEY_ACCOUNT_DEPOSIT')],
    });

    render(<EarnStrategySelectionView />);

    await waitFor(() => {
      expect(
        screen.getByTestId('earn-strategy-card-strategy:MONEY_ACCOUNT_DEPOSIT')
          .props.accessibilityState,
      ).toEqual({ selected: true });
    });

    await act(async () => {
      fireEvent.press(
        screen.getByTestId('earn-strategy-selection-get-started-button'),
      );
    });

    expect(initiateDeposit).toHaveBeenCalledWith({
      preferredPaymentToken: {
        address:
          hookResult.asset?.kind === 'held' &&
          'address' in hookResult.asset.asset
            ? hookResult.asset.asset.address
            : undefined,
        chainId:
          hookResult.asset?.kind === 'held'
            ? hookResult.asset.asset.chainId
            : undefined,
      },
      intent: 'convert',
    });
  });

  it('does not show an Earn toast when the user cancels a Money deposit', async () => {
    mockUseEarnAssetStrategies.mockReturnValue({
      ...createHookResult(),
      strategies: [createStrategy('MONEY_ACCOUNT_DEPOSIT')],
    });
    initiateDeposit.mockRejectedValueOnce(
      new Error('User rejected the request'),
    );

    render(<EarnStrategySelectionView />);

    await waitFor(() => {
      expect(
        screen.getByTestId('earn-strategy-card-strategy:MONEY_ACCOUNT_DEPOSIT')
          .props.accessibilityState,
      ).toEqual({ selected: true });
    });

    await act(async () => {
      fireEvent.press(
        screen.getByTestId('earn-strategy-selection-get-started-button'),
      );
    });

    expect(showToast).not.toHaveBeenCalled();
  });

  it('does not duplicate Money failure toast in the Earn view', async () => {
    mockUseEarnAssetStrategies.mockReturnValue({
      ...createHookResult(),
      strategies: [createStrategy('MONEY_ACCOUNT_DEPOSIT')],
    });
    initiateDeposit.mockRejectedValueOnce(new Error('deposit failed'));

    render(<EarnStrategySelectionView />);

    await waitFor(() => {
      expect(
        screen.getByTestId('earn-strategy-card-strategy:MONEY_ACCOUNT_DEPOSIT')
          .props.accessibilityState,
      ).toEqual({ selected: true });
    });

    await act(async () => {
      fireEvent.press(
        screen.getByTestId('earn-strategy-selection-get-started-button'),
      );
    });

    expect(showToast).not.toHaveBeenCalled();
  });

  it('shows an Earn toast when a Money prerequisite fails', async () => {
    const prerequisiteError = new Error('Money onboarding check failed');
    redirectToOnboardingIfNeeded.mockImplementationOnce(() => {
      throw prerequisiteError;
    });
    mockUseEarnAssetStrategies.mockReturnValue({
      ...createHookResult(),
      strategies: [createStrategy('MONEY_ACCOUNT_DEPOSIT')],
    });

    render(<EarnStrategySelectionView />);

    await waitFor(() => {
      expect(
        screen.getByTestId('earn-strategy-card-strategy:MONEY_ACCOUNT_DEPOSIT')
          .props.accessibilityState,
      ).toEqual({ selected: true });
    });

    await act(async () => {
      fireEvent.press(
        screen.getByTestId('earn-strategy-selection-get-started-button'),
      );
    });

    expect(showToast).toHaveBeenCalledWith(navigationToDepositToast);
    expect(initiateDeposit).not.toHaveBeenCalled();
  });

  it('redirects first-time Money users to onboarding instead of initiating deposit', async () => {
    const hookResult = createHookResult();
    mockUseEarnAssetStrategies.mockReturnValue({
      ...hookResult,
      strategies: [createStrategy('MONEY_ACCOUNT_DEPOSIT')],
    });
    redirectToOnboardingIfNeeded.mockReturnValue(true);

    render(<EarnStrategySelectionView />);

    await waitFor(() => {
      expect(
        screen.getByTestId('earn-strategy-card-strategy:MONEY_ACCOUNT_DEPOSIT')
          .props.accessibilityState,
      ).toEqual({ selected: true });
    });

    await act(async () => {
      fireEvent.press(
        screen.getByTestId('earn-strategy-selection-get-started-button'),
      );
    });

    expect(redirectToOnboardingIfNeeded).toHaveBeenCalledWith({
      postOnboardingRedirect: {
        type: MoneyPostOnboardingRedirectType.DEPOSIT,
        preferredPaymentToken: {
          address:
            hookResult.asset?.kind === 'held' &&
            'address' in hookResult.asset.asset
              ? hookResult.asset.asset.address
              : undefined,
          chainId:
            hookResult.asset?.kind === 'held'
              ? hookResult.asset.asset.chainId
              : undefined,
        },
      },
    });
    expect(initiateDeposit).not.toHaveBeenCalled();
  });

  it('starts lending deposit with the selected asset', async () => {
    mockUseEarnAssetStrategies.mockReturnValue({
      ...createHookResult(),
      strategies: [
        createStrategy(EARN_EXPERIENCES.STABLECOIN_LENDING, 'lending:usdc'),
      ],
    });

    render(<EarnStrategySelectionView />);

    await waitFor(() => {
      expect(
        screen.getByTestId('earn-strategy-card-lending:usdc').props
          .accessibilityState,
      ).toEqual({ selected: true });
    });

    await act(async () => {
      fireEvent.press(
        screen.getByTestId('earn-strategy-selection-get-started-button'),
      );
    });

    expect(lendingRedirect).toHaveBeenCalledTimes(1);
  });

  it('shows a toast when deposit navigation fails', async () => {
    const error = new Error('lending redirect failed');
    lendingRedirect.mockRejectedValueOnce(error);
    mockUseEarnAssetStrategies.mockReturnValue({
      ...createHookResult(),
      strategies: [
        createStrategy(EARN_EXPERIENCES.STABLECOIN_LENDING, 'lending:usdc'),
      ],
    });

    render(<EarnStrategySelectionView />);

    await waitFor(() => {
      expect(
        screen.getByTestId('earn-strategy-card-lending:usdc').props
          .accessibilityState,
      ).toEqual({ selected: true });
    });

    await act(async () => {
      fireEvent.press(
        screen.getByTestId('earn-strategy-selection-get-started-button'),
      );
    });

    expect(showToast).toHaveBeenCalledWith(navigationToDepositToast);
  });

  it('switches pooled staking to mainnet when current chain is unsupported', async () => {
    mockUseStakingChain.mockReturnValue({
      isStakingSupportedChain: false,
    });
    mockUseEarnAssetStrategies.mockReturnValue({
      ...createHookResult(),
      strategies: [createStrategy(EARN_EXPERIENCES.POOLED_STAKING)],
    });

    render(<EarnStrategySelectionView />);

    await waitFor(() => {
      expect(
        screen.getByTestId(
          `earn-strategy-card-strategy:${EARN_EXPERIENCES.POOLED_STAKING}`,
        ).props.accessibilityState,
      ).toEqual({ selected: true });
    });

    await act(async () => {
      fireEvent.press(
        screen.getByTestId('earn-strategy-selection-get-started-button'),
      );
    });

    expect(setActiveNetwork).toHaveBeenCalledWith('mainnet');
  });

  it.each([EARN_EXPERIENCES.POOLED_STAKING, EARN_EXPERIENCES.TRX_STAKING])(
    'starts %s deposit in the staking flow',
    async (type) => {
      const hookResult = createHookResult();
      mockUseEarnAssetStrategies.mockReturnValue({
        ...hookResult,
        strategies: [createStrategy(type)],
      });

      render(<EarnStrategySelectionView />);

      await waitFor(() => {
        expect(
          screen.getByTestId(`earn-strategy-card-strategy:${type}`).props
            .accessibilityState,
        ).toEqual({ selected: true });
      });

      await act(async () => {
        fireEvent.press(
          screen.getByTestId('earn-strategy-selection-get-started-button'),
        );
      });

      expect(navigate).toHaveBeenCalledWith('StakeScreens', {
        screen: Routes.STAKING.STAKE,
        params: {
          token: expect.objectContaining({
            address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
            chainId: '0x1',
            symbol: 'USDC',
          }),
        },
      });
    },
  );
});
