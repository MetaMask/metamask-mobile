import React from 'react';
import type { Asset } from '@metamask/assets-controllers';
import { EthAccountType } from '@metamask/keyring-api';
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { EarnStrategySelectionViewTestIds } from './EarnStrategySelectionView.testIds';
import EarnStrategySelectionView, { requireEarnStrategyToken } from './index';
import useEarnOpportunityNavigation from '../../hooks/useEarnOpportunityNavigation';
import useEarnToasts, {
  type EarnToastOptions,
} from '../../hooks/useEarnToasts';
import { EARN_EXPERIENCES } from '../../constants/experiences';
import type {
  EarnAsset,
  EarnAssetId,
  EarnExperience,
  EarnExperienceType,
} from '../../types/earnAssets';

jest.mock('@react-navigation/native');
jest.mock('@metamask/design-system-twrnc-preset');
jest.mock('../../hooks/useEarnOpportunityNavigation');
jest.mock('../../hooks/useEarnToasts');

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
): EarnExperience => ({
  id,
  type,
  role: 'underlying',
  rate: { type: 'APY', percentage: 6.2, status: 'ready' },
  isFeeSubsidized: false,
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

describe('EarnStrategySelectionView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
    render(<EarnStrategySelectionView />);

    expect(
      screen.getByTestId(EarnStrategySelectionViewTestIds.MODAL),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(EarnStrategySelectionViewTestIds.MODAL_HEADER),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(
        EarnStrategySelectionViewTestIds.STRATEGY_CARD('money:usdc'),
      ),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(
        EarnStrategySelectionViewTestIds.STRATEGY_CARD('lending:usdc'),
      ),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(EarnStrategySelectionViewTestIds.GET_STARTED_BUTTON),
    ).toBeOnTheScreen();
  });

  it('selects the first strategy when the view renders', async () => {
    render(<EarnStrategySelectionView />);

    await waitFor(() => {
      expect(
        screen.getByTestId(
          EarnStrategySelectionViewTestIds.STRATEGY_CARD('money:usdc'),
        ).props.accessibilityState,
      ).toEqual({ selected: true });
    });
  });

  it('updates the selected strategy after a card press', async () => {
    render(<EarnStrategySelectionView />);
    const lendingCard = screen.getByTestId(
      EarnStrategySelectionViewTestIds.STRATEGY_CARD('lending:usdc'),
    );

    fireEvent.press(lendingCard);

    await waitFor(() => {
      expect(lendingCard.props.accessibilityState).toEqual({ selected: true });
    });
  });

  it('disables get started when the asset has no strategies', () => {
    mockUseRoute.mockReturnValue({
      params: { earnAsset: createEarnAsset([]) },
    } as unknown as ReturnType<typeof useRoute>);

    render(<EarnStrategySelectionView />);

    expect(
      screen.getByTestId(EarnStrategySelectionViewTestIds.GET_STARTED_BUTTON)
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

    render(<EarnStrategySelectionView />);

    await waitFor(() => {
      expect(
        screen.getByTestId(
          EarnStrategySelectionViewTestIds.STRATEGY_CARD('money:usdc'),
        ).props.accessibilityState,
      ).toEqual({ selected: true });
    });

    fireEvent.press(
      screen.getByTestId(EarnStrategySelectionViewTestIds.GET_STARTED_BUTTON),
    );

    await waitFor(() => {
      expect(navigateToDepositForExperience).toHaveBeenCalledWith(
        earnAsset,
        expect.objectContaining({ id: 'money:usdc' }),
      );
    });
  });

  it('shows a toast when deposit navigation fails', async () => {
    const error = new Error('deposit navigation failed');
    navigateToDepositForExperience.mockImplementationOnce(() => {
      throw error;
    });

    render(<EarnStrategySelectionView />);

    fireEvent.press(
      screen.getByTestId(EarnStrategySelectionViewTestIds.GET_STARTED_BUTTON),
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
