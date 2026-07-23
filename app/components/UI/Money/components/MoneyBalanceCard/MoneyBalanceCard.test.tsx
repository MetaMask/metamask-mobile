import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { ButtonVariant } from '@metamask/design-system-react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import MoneyBalanceCard from './MoneyBalanceCard';
import { MoneyBalanceCardTestIds } from './MoneyBalanceCard.testIds';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import useMoneyAccountBalance from '../../hooks/useMoneyAccountBalance';
import useMoneyAccountInfo from '../../hooks/useMoneyAccountInfo';
import { selectMoneyOnboardingSeen } from '../../../../../reducers/user/selectors';
import { selectHasWalletFundingPrimaryCta } from '../../selectors/homePrimaryCta';
import { selectMoneyOnboardingStepperAnimationEnabled } from '../../../../../selectors/featureFlagController/moneyAccount';
import { selectPrivacyMode } from '../../../../../selectors/preferencesController';
import { useMoneyNavigation } from '../../hooks/useMoneyNavigation';
import { useMoneyAccountDeposit } from '../../hooks/useMoneyAccount';
import { useMoneyAnalytics } from '../../hooks/useMoneyAnalytics';
import {
  COMPONENT_NAMES,
  MONEY_BUTTON_INTENTS,
  MONEY_BUTTON_TYPES,
  MONEY_TOOLTIP_NAMES,
  MONEY_TOOLTIP_TYPES,
  SCREEN_NAMES,
} from '../../constants/moneyEvents';
import { MoneyPostOnboardingRedirectType } from '../../types/navigation';

const mockTrackButtonClicked = jest.fn();
const mockTrackComponentViewed = jest.fn();
const mockTrackSurfaceClicked = jest.fn();
const mockTrackTooltipClicked = jest.fn();

jest.mock('../../hooks/useMoneyAnalytics', () => ({
  useMoneyAnalytics: jest.fn(),
}));

const mockNavigate = jest.fn();
const mockNavigateToMoneyHome = jest.fn();
const mockInitiateDeposit = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: mockNavigate,
    }),
  };
});

jest.mock('../../hooks/useMoneyAccountBalance', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('../../hooks/useMoneyAccountInfo', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('../../hooks/useMoneyNavigation', () => ({
  __esModule: true,
  useMoneyNavigation: jest.fn(),
}));

jest.mock('../../hooks/useMoneyAccount', () => ({
  __esModule: true,
  useMoneyAccountDeposit: jest.fn(),
}));

jest.mock('../../../../../reducers/user/selectors', () => ({
  __esModule: true,
  selectMoneyOnboardingSeen: jest.fn(),
}));

jest.mock('../../selectors/homePrimaryCta', () => ({
  __esModule: true,
  selectHasWalletFundingPrimaryCta: jest.fn(),
}));

jest.mock(
  '../../../../../selectors/featureFlagController/moneyAccount',
  () => ({
    __esModule: true,
    selectMoneyOnboardingStepperAnimationEnabled: jest.fn(),
  }),
);

jest.mock('../../../../../selectors/preferencesController', () => ({
  __esModule: true,
  selectPrivacyMode: jest.fn(),
}));

jest.mock('../../../../../util/Logger', () => ({
  __esModule: true,
  default: { error: jest.fn() },
}));

const mockUseMoneyAccountBalance = jest.mocked(useMoneyAccountBalance);
const mockUseMoneyAccountInfo = jest.mocked(useMoneyAccountInfo);
const mockSelectMoneyOnboardingSeen = jest.mocked(selectMoneyOnboardingSeen);
const mockSelectHasWalletFundingPrimaryCta = jest.mocked(
  selectHasWalletFundingPrimaryCta,
);
const mockSelectMoneyOnboardingStepperAnimationEnabled = jest.mocked(
  selectMoneyOnboardingStepperAnimationEnabled,
);
const mockSelectPrivacyMode = jest.mocked(selectPrivacyMode);
const mockUseMoneyNavigation = jest.mocked(useMoneyNavigation);
const mockUseMoneyAccountDeposit = jest.mocked(useMoneyAccountDeposit);

type BalanceMockOverrides = Partial<
  Omit<ReturnType<typeof useMoneyAccountBalance>, 'moneyBalanceQuery'>
> & {
  moneyBalanceQuery?: Partial<
    ReturnType<typeof useMoneyAccountBalance>['moneyBalanceQuery']
  >;
};

const createBalanceMock = (overrides: BalanceMockOverrides = {}) =>
  ({
    totalFiatFormatted: '$1,000.00',
    totalFiatRaw: '1000',
    tokenTotal: undefined,
    isBalanceLoading: false,
    isBalanceFetchError: false,
    refetchBalance: jest.fn(),
    apyDecimal: 0.04,
    apyPercent: 4,
    apyPercentFormatted: '4%',
    vaultApyQuery: {
      data: { apy: 0.04, timestamp: '2026-01-01T00:00:00Z' },
      isLoading: false,
    },
    ...overrides,
    moneyBalanceQuery: {
      data: {
        musdBalance: '1000000000',
        vmusdValueInMusd: '0',
        totalBalance: '1000000000',
      },
      isLoading: false,
      isFetching: false,
      ...overrides.moneyBalanceQuery,
    },
  }) as ReturnType<typeof useMoneyAccountBalance>;

const createInfoMock = (
  overrides: Partial<ReturnType<typeof useMoneyAccountInfo>> = {},
): ReturnType<typeof useMoneyAccountInfo> =>
  ({
    hasMoneyAccount: true,
    primaryMoneyAccount: {
      address: '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B',
    },
    ...overrides,
  }) as ReturnType<typeof useMoneyAccountInfo>;

describe('MoneyBalanceCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseMoneyAccountBalance.mockReturnValue(createBalanceMock());
    mockUseMoneyAccountInfo.mockReturnValue(createInfoMock());
    mockSelectMoneyOnboardingSeen.mockReturnValue(true);
    mockSelectHasWalletFundingPrimaryCta.mockReturnValue(false);
    mockSelectMoneyOnboardingStepperAnimationEnabled.mockReturnValue(true);
    mockSelectPrivacyMode.mockReturnValue(false);
    mockUseMoneyNavigation.mockReturnValue({
      navigateToMoneyHome: mockNavigateToMoneyHome,
    });
    mockInitiateDeposit.mockResolvedValue(undefined);
    mockUseMoneyAccountDeposit.mockReturnValue({
      initiateDeposit: mockInitiateDeposit,
    });
    (useMoneyAnalytics as jest.Mock).mockReturnValue({
      trackButtonClicked: mockTrackButtonClicked,
      trackComponentViewed: mockTrackComponentViewed,
      trackSurfaceClicked: mockTrackSurfaceClicked,
      trackTooltipClicked: mockTrackTooltipClicked,
    });
  });

  describe('when balance is unavailable (totalFiatRaw undefined, no fetch error)', () => {
    // Queries succeeded but a dependency (e.g. musdFiatRate) is missing
    beforeEach(() => {
      mockUseMoneyAccountBalance.mockReturnValue(
        createBalanceMock({
          totalFiatRaw: undefined,
          totalFiatFormatted: undefined,
        }),
      );
    });

    it('renders the unavailable container testID', () => {
      const { getByTestId } = renderWithProvider(<MoneyBalanceCard />);

      expect(
        getByTestId(MoneyBalanceCardTestIds.UNAVAILABLE_CONTAINER),
      ).toBeOnTheScreen();
    });

    it('renders the balance-unavailable message in its own slot (not the BALANCE slot)', () => {
      const { getByTestId, queryByTestId } = renderWithProvider(
        <MoneyBalanceCard />,
      );

      expect(
        getByTestId(MoneyBalanceCardTestIds.BALANCE_UNAVAILABLE),
      ).toHaveTextContent(strings('money.balance_unavailable'));
      expect(
        queryByTestId(MoneyBalanceCardTestIds.BALANCE),
      ).not.toBeOnTheScreen();
    });

    it('does not render $0.00 as the balance (would be misleading when unknown)', () => {
      const { queryByText } = renderWithProvider(<MoneyBalanceCard />);

      expect(queryByText('$0.00')).not.toBeOnTheScreen();
    });

    it('renders the Add button', () => {
      const { getByTestId } = renderWithProvider(<MoneyBalanceCard />);

      expect(getByTestId(MoneyBalanceCardTestIds.ADD_BUTTON)).toHaveTextContent(
        strings('money.balance_card.add'),
      );
    });

    it('does not render the empty container', () => {
      const { queryByTestId } = renderWithProvider(<MoneyBalanceCard />);

      expect(
        queryByTestId(MoneyBalanceCardTestIds.EMPTY_CONTAINER),
      ).not.toBeOnTheScreen();
    });

    it('does not render a retry button (distinct from error kind)', () => {
      const { queryByTestId } = renderWithProvider(<MoneyBalanceCard />);

      expect(
        queryByTestId(MoneyBalanceCardTestIds.BALANCE_RETRY),
      ).not.toBeOnTheScreen();
    });

    it('initiates a deposit when Add is pressed', () => {
      const { getByTestId } = renderWithProvider(<MoneyBalanceCard />);

      fireEvent.press(getByTestId(MoneyBalanceCardTestIds.ADD_BUTTON));

      expect(mockInitiateDeposit).toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalledWith(Routes.MONEY.MODALS.ROOT, {
        screen: Routes.MONEY.MODALS.ADD_MONEY_SHEET,
      });
    });

    it('logs an error when initiateDeposit rejects', async () => {
      mockInitiateDeposit.mockRejectedValueOnce(new Error('network failure'));
      const Logger = jest.requireMock('../../../../../util/Logger');

      const { getByTestId } = renderWithProvider(<MoneyBalanceCard />);

      fireEvent.press(getByTestId(MoneyBalanceCardTestIds.ADD_BUTTON));

      await Promise.resolve();

      expect(Logger.default.error).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          message: expect.stringContaining('MoneyBalanceCard'),
        }),
      );
    });

    it('tracks the Add click with the deposit redirect target', () => {
      const { getByTestId } = renderWithProvider(<MoneyBalanceCard />);

      fireEvent.press(getByTestId(MoneyBalanceCardTestIds.ADD_BUTTON));

      expect(mockTrackButtonClicked).toHaveBeenCalledWith({
        button_type: MONEY_BUTTON_TYPES.TEXT,
        button_intent: MONEY_BUTTON_INTENTS.ADD_MONEY,
        label_key: 'money.balance_card.add',
        redirect_target: SCREEN_NAMES.MONEY_DEPOSIT,
      });
    });

    it('renders the label', () => {
      const { getByTestId } = renderWithProvider(<MoneyBalanceCard />);

      expect(getByTestId(MoneyBalanceCardTestIds.LABEL)).toHaveTextContent(
        strings('money.balance_card.label'),
      );
    });
  });

  describe('when balance is genuinely zero (totalFiatRaw "0")', () => {
    beforeEach(() => {
      mockUseMoneyAccountBalance.mockReturnValue(
        createBalanceMock({ totalFiatRaw: '0', totalFiatFormatted: '$0.00' }),
      );
    });

    it('renders the empty container testID', () => {
      const { getByTestId } = renderWithProvider(<MoneyBalanceCard />);

      expect(
        getByTestId(MoneyBalanceCardTestIds.EMPTY_CONTAINER),
      ).toBeOnTheScreen();
    });

    it('renders $0.00 as the balance', () => {
      const { getByTestId } = renderWithProvider(<MoneyBalanceCard />);

      expect(getByTestId(MoneyBalanceCardTestIds.BALANCE)).toHaveTextContent(
        '$0.00',
      );
    });

    it('renders the Add button', () => {
      const { getByTestId } = renderWithProvider(<MoneyBalanceCard />);

      expect(getByTestId(MoneyBalanceCardTestIds.ADD_BUTTON)).toHaveTextContent(
        strings('money.balance_card.add'),
      );
    });

    it('routes add money when Add is pressed', () => {
      const { getByTestId } = renderWithProvider(<MoneyBalanceCard />);

      fireEvent.press(getByTestId(MoneyBalanceCardTestIds.ADD_BUTTON));

      expect(mockInitiateDeposit).toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalledWith(Routes.MONEY.MODALS.ROOT, {
        screen: Routes.MONEY.MODALS.ADD_MONEY_SHEET,
      });
    });

    it('tracks the Add click with the deposit redirect target', () => {
      const { getByTestId } = renderWithProvider(<MoneyBalanceCard />);

      fireEvent.press(getByTestId(MoneyBalanceCardTestIds.ADD_BUTTON));

      expect(mockTrackButtonClicked).toHaveBeenCalledWith({
        button_type: MONEY_BUTTON_TYPES.TEXT,
        button_intent: MONEY_BUTTON_INTENTS.ADD_MONEY,
        label_key: 'money.balance_card.add',
        redirect_target: SCREEN_NAMES.MONEY_DEPOSIT,
      });
    });
  });

  describe('when balance is empty and onboarding has not been seen', () => {
    beforeEach(() => {
      mockUseMoneyAccountBalance.mockReturnValue(
        createBalanceMock({
          totalFiatRaw: '0',
          totalFiatFormatted: '$0.00',
        }),
      );
      mockSelectMoneyOnboardingSeen.mockReturnValue(false);
    });

    it('renders the Add button', () => {
      const { getByTestId } = renderWithProvider(<MoneyBalanceCard />);

      expect(getByTestId(MoneyBalanceCardTestIds.ADD_BUTTON)).toBeOnTheScreen();
    });

    describe('when the wallet-home onboarding stepper is not displayed', () => {
      beforeEach(() => {
        mockSelectHasWalletFundingPrimaryCta.mockReturnValue(false);
      });

      it('renders the Add button with the add label', () => {
        const { getByTestId, queryByTestId } = renderWithProvider(
          <MoneyBalanceCard />,
        );

        expect(
          getByTestId(MoneyBalanceCardTestIds.ADD_BUTTON),
        ).toHaveTextContent(strings('money.balance_card.add'));
        expect(
          queryByTestId(MoneyBalanceCardTestIds.GET_STARTED_BUTTON),
        ).not.toBeOnTheScreen();
      });
    });

    describe('when the wallet-home onboarding stepper is displayed', () => {
      beforeEach(() => {
        mockSelectHasWalletFundingPrimaryCta.mockReturnValue(true);
      });

      it('renders the Add button (never Get started) when the stepper is visible', () => {
        const { getByTestId, queryByTestId } = renderWithProvider(
          <MoneyBalanceCard />,
        );

        expect(
          getByTestId(MoneyBalanceCardTestIds.ADD_BUTTON),
        ).toHaveTextContent(strings('money.balance_card.add'));
        expect(
          queryByTestId(MoneyBalanceCardTestIds.GET_STARTED_BUTTON),
        ).not.toBeOnTheScreen();
      });
    });
  });

  describe('when balance is funded', () => {
    it('renders the funded container testID', () => {
      const { getByTestId } = renderWithProvider(<MoneyBalanceCard />);

      expect(
        getByTestId(MoneyBalanceCardTestIds.FUNDED_CONTAINER),
      ).toBeOnTheScreen();
    });

    it('renders the balance from useMoneyAccountBalance', () => {
      const { getByTestId } = renderWithProvider(<MoneyBalanceCard />);

      expect(getByTestId(MoneyBalanceCardTestIds.BALANCE)).toHaveTextContent(
        '$1,000.00',
      );
    });

    it('renders the Add button with the add label', () => {
      const { getByTestId } = renderWithProvider(<MoneyBalanceCard />);

      expect(getByTestId(MoneyBalanceCardTestIds.ADD_BUTTON)).toHaveTextContent(
        strings('money.balance_card.add'),
      );
    });

    it('renders the APY tag', () => {
      const { getByTestId } = renderWithProvider(<MoneyBalanceCard />);

      expect(getByTestId(MoneyBalanceCardTestIds.APY_TAG)).toHaveTextContent(
        /4% APY/,
      );
    });

    it('renders the mUSD currency suffix next to the balance label', () => {
      const { getByTestId } = renderWithProvider(<MoneyBalanceCard />);

      expect(
        getByTestId(MoneyBalanceCardTestIds.CURRENCY_SUFFIX),
      ).toHaveTextContent(/• mUSD/);
    });

    it('does not render the mUSD currency suffix inside the APY tag', () => {
      const { getByTestId } = renderWithProvider(<MoneyBalanceCard />);

      expect(
        getByTestId(MoneyBalanceCardTestIds.APY_TAG),
      ).not.toHaveTextContent(/• mUSD/);
    });
  });

  describe('privacy mode', () => {
    it('shows the real balance when privacy mode is disabled', () => {
      mockSelectPrivacyMode.mockReturnValue(false);
      const { getByTestId } = renderWithProvider(<MoneyBalanceCard />);

      expect(getByTestId(MoneyBalanceCardTestIds.BALANCE)).toHaveTextContent(
        '$1,000.00',
      );
    });

    it('masks the balance when privacy mode is enabled', () => {
      mockSelectPrivacyMode.mockReturnValue(true);
      const { getByTestId } = renderWithProvider(<MoneyBalanceCard />);

      expect(getByTestId(MoneyBalanceCardTestIds.BALANCE)).toHaveTextContent(
        '•••••••••',
      );
    });

    it('does not mask the APY tag when privacy mode is enabled', () => {
      mockSelectPrivacyMode.mockReturnValue(true);
      const { getByTestId } = renderWithProvider(<MoneyBalanceCard />);

      expect(getByTestId(MoneyBalanceCardTestIds.APY_TAG)).toHaveTextContent(
        /4% APY/,
      );
    });
  });

  describe('Add button onboarding redirect', () => {
    describe('when onboarding has not been seen', () => {
      beforeEach(() => {
        mockSelectMoneyOnboardingSeen.mockReturnValue(false);
      });

      it('navigates to Money onboarding when Add is pressed', () => {
        const { getByTestId } = renderWithProvider(<MoneyBalanceCard />);

        fireEvent.press(getByTestId(MoneyBalanceCardTestIds.ADD_BUTTON));

        expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.ONBOARDING, {
          postOnboardingRedirect: {
            type: MoneyPostOnboardingRedirectType.DEPOSIT,
          },
        });
        expect(mockInitiateDeposit).not.toHaveBeenCalled();
      });
    });

    describe('when onboarding has been seen and onboarding flag is enabled', () => {
      it('initiates deposit when Add is pressed', () => {
        const { getByTestId } = renderWithProvider(<MoneyBalanceCard />);

        fireEvent.press(getByTestId(MoneyBalanceCardTestIds.ADD_BUTTON));

        expect(mockInitiateDeposit).toHaveBeenCalled();
        expect(mockNavigate).not.toHaveBeenCalledWith(Routes.MONEY.ONBOARDING);
      });
    });

    describe('when onboarding flag is disabled', () => {
      beforeEach(() => {
        mockSelectMoneyOnboardingStepperAnimationEnabled.mockReturnValue(false);
        mockSelectMoneyOnboardingSeen.mockReturnValue(false);
      });

      it('initiates deposit when Add is pressed even if onboarding not seen', () => {
        const { getByTestId } = renderWithProvider(<MoneyBalanceCard />);

        fireEvent.press(getByTestId(MoneyBalanceCardTestIds.ADD_BUTTON));

        expect(mockInitiateDeposit).toHaveBeenCalled();
        expect(mockNavigate).not.toHaveBeenCalledWith(Routes.MONEY.ONBOARDING);
      });
    });
  });

  describe('navigation', () => {
    it('calls navigateToMoneyHome when the card body is pressed', () => {
      const { getByTestId } = renderWithProvider(<MoneyBalanceCard />);

      fireEvent.press(getByTestId(MoneyBalanceCardTestIds.FUNDED_CONTAINER));

      expect(mockNavigateToMoneyHome).toHaveBeenCalledTimes(1);
    });

    it('routes add money when Add is pressed', () => {
      const { getByTestId } = renderWithProvider(<MoneyBalanceCard />);

      fireEvent.press(getByTestId(MoneyBalanceCardTestIds.ADD_BUTTON));

      expect(mockInitiateDeposit).toHaveBeenCalled();
    });

    it('opens the Money balance info sheet when the info icon is pressed', () => {
      const { getByTestId } = renderWithProvider(<MoneyBalanceCard />);

      fireEvent.press(getByTestId(MoneyBalanceCardTestIds.INFO_BUTTON));

      expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.MODALS.ROOT, {
        screen: Routes.MONEY.MODALS.MONEY_BALANCE_INFO_SHEET,
      });
    });

    it('routes add money (and not the Money home) when Add is pressed in empty state', () => {
      mockUseMoneyAccountBalance.mockReturnValue(
        createBalanceMock({
          totalFiatRaw: '0',
          totalFiatFormatted: '$0.00',
        }),
      );

      const { getByTestId } = renderWithProvider(<MoneyBalanceCard />);

      fireEvent.press(getByTestId(MoneyBalanceCardTestIds.ADD_BUTTON));

      expect(mockInitiateDeposit).toHaveBeenCalled();
      expect(mockNavigateToMoneyHome).not.toHaveBeenCalled();
    });
  });

  describe('loading states', () => {
    it('renders balance skeleton when balance is loading', () => {
      mockUseMoneyAccountBalance.mockReturnValue(
        createBalanceMock({ isBalanceLoading: true }),
      );

      const { getByTestId, queryByTestId } = renderWithProvider(
        <MoneyBalanceCard />,
      );

      expect(
        getByTestId(MoneyBalanceCardTestIds.BALANCE_SKELETON),
      ).toBeOnTheScreen();
      expect(
        queryByTestId(MoneyBalanceCardTestIds.BALANCE),
      ).not.toBeOnTheScreen();
    });

    it('renders APY skeleton when APY is loading', () => {
      mockUseMoneyAccountBalance.mockReturnValue(
        createBalanceMock({
          vaultApyQuery: {
            data: undefined,
            isLoading: true,
          } as ReturnType<typeof useMoneyAccountBalance>['vaultApyQuery'],
        }),
      );

      const { getByTestId, queryByTestId } = renderWithProvider(
        <MoneyBalanceCard />,
      );

      expect(
        getByTestId(MoneyBalanceCardTestIds.APY_TAG_SKELETON),
      ).toBeOnTheScreen();
      expect(
        queryByTestId(MoneyBalanceCardTestIds.APY_TAG),
      ).not.toBeOnTheScreen();
    });

    it('renders balance and APY values when data has loaded', () => {
      const { getByTestId, queryByTestId } = renderWithProvider(
        <MoneyBalanceCard />,
      );

      expect(getByTestId(MoneyBalanceCardTestIds.BALANCE)).toBeOnTheScreen();
      expect(getByTestId(MoneyBalanceCardTestIds.APY_TAG)).toBeOnTheScreen();
      expect(
        queryByTestId(MoneyBalanceCardTestIds.BALANCE_SKELETON),
      ).not.toBeOnTheScreen();
      expect(
        queryByTestId(MoneyBalanceCardTestIds.APY_TAG_SKELETON),
      ).not.toBeOnTheScreen();
    });

    it('renders the APY tag with 0 when apyPercent is undefined', () => {
      mockUseMoneyAccountBalance.mockReturnValue(
        createBalanceMock({ apyPercent: undefined }),
      );

      const { getByTestId } = renderWithProvider(<MoneyBalanceCard />);

      expect(getByTestId(MoneyBalanceCardTestIds.APY_TAG)).toHaveTextContent(
        /0% APY/,
      );
    });
  });

  describe('layout resilience', () => {
    it('keeps the APY tag and Add button on screen when the balance is very long', () => {
      mockUseMoneyAccountBalance.mockReturnValue(
        createBalanceMock({
          totalFiatRaw: '999999999990',
          totalFiatFormatted: '$999,999,999,999.99',
        }),
      );

      const { getByTestId } = renderWithProvider(<MoneyBalanceCard />);

      expect(getByTestId(MoneyBalanceCardTestIds.BALANCE)).toHaveTextContent(
        '$999,999,999,999.99',
      );
      expect(getByTestId(MoneyBalanceCardTestIds.APY_TAG)).toBeOnTheScreen();
      expect(getByTestId(MoneyBalanceCardTestIds.ADD_BUTTON)).toBeOnTheScreen();
    });
  });

  describe('CTA variant follows the presence of another primary CTA on Home', () => {
    const getVariant = (
      UNSAFE_getByProps: ReturnType<
        typeof renderWithProvider
      >['UNSAFE_getByProps'],
      testID: string,
    ) => UNSAFE_getByProps({ testID }).props.variant;

    describe('empty balance, onboarding seen', () => {
      beforeEach(() => {
        mockUseMoneyAccountBalance.mockReturnValue(
          createBalanceMock({
            totalFiatRaw: '0',
            totalFiatFormatted: '$0.00',
          }),
        );
        mockSelectMoneyOnboardingSeen.mockReturnValue(true);
      });

      it('renders Add as Secondary when another primary CTA is present on Home', () => {
        mockSelectHasWalletFundingPrimaryCta.mockReturnValue(true);

        const { UNSAFE_getByProps } = renderWithProvider(<MoneyBalanceCard />);

        expect(
          getVariant(UNSAFE_getByProps, MoneyBalanceCardTestIds.ADD_BUTTON),
        ).toBe(ButtonVariant.Secondary);
      });

      it('renders Add as Primary when no other primary CTA is on Home', () => {
        mockSelectHasWalletFundingPrimaryCta.mockReturnValue(false);

        const { UNSAFE_getByProps } = renderWithProvider(<MoneyBalanceCard />);

        expect(
          getVariant(UNSAFE_getByProps, MoneyBalanceCardTestIds.ADD_BUTTON),
        ).toBe(ButtonVariant.Primary);
      });
    });

    describe('funded balance', () => {
      it('renders Add as Primary when no other primary CTA is on Home', () => {
        mockSelectHasWalletFundingPrimaryCta.mockReturnValue(false);

        const { UNSAFE_getByProps } = renderWithProvider(<MoneyBalanceCard />);

        expect(
          getVariant(UNSAFE_getByProps, MoneyBalanceCardTestIds.ADD_BUTTON),
        ).toBe(ButtonVariant.Primary);
      });

      it('renders Add as Secondary when another primary CTA is present on Home', () => {
        mockSelectHasWalletFundingPrimaryCta.mockReturnValue(true);

        const { UNSAFE_getByProps } = renderWithProvider(<MoneyBalanceCard />);

        expect(
          getVariant(UNSAFE_getByProps, MoneyBalanceCardTestIds.ADD_BUTTON),
        ).toBe(ButtonVariant.Secondary);
      });
    });

    describe('new user (onboarding not seen)', () => {
      beforeEach(() => {
        mockUseMoneyAccountBalance.mockReturnValue(
          createBalanceMock({
            totalFiatRaw: '0',
            totalFiatFormatted: '$0.00',
          }),
        );
        mockSelectMoneyOnboardingSeen.mockReturnValue(false);
      });

      it('renders Add as Primary when no other primary CTA is on Home', () => {
        mockSelectHasWalletFundingPrimaryCta.mockReturnValue(false);

        const { UNSAFE_getByProps } = renderWithProvider(<MoneyBalanceCard />);

        expect(
          getVariant(UNSAFE_getByProps, MoneyBalanceCardTestIds.ADD_BUTTON),
        ).toBe(ButtonVariant.Primary);
      });

      it('renders Add as Secondary when another primary CTA is present on Home', () => {
        mockSelectHasWalletFundingPrimaryCta.mockReturnValue(true);

        const { UNSAFE_getByProps } = renderWithProvider(<MoneyBalanceCard />);

        expect(
          getVariant(UNSAFE_getByProps, MoneyBalanceCardTestIds.ADD_BUTTON),
        ).toBe(ButtonVariant.Secondary);
      });
    });
  });

  describe('error state', () => {
    beforeEach(() => {
      mockUseMoneyAccountBalance.mockReturnValue(
        createBalanceMock({
          isBalanceFetchError: true,
          moneyBalanceQuery: { isFetching: false },
          totalFiatFormatted: undefined,
          totalFiatRaw: undefined,
        }),
      );
    });

    it('renders the error container testID', () => {
      const { getByTestId } = renderWithProvider(<MoneyBalanceCard />);

      expect(
        getByTestId(MoneyBalanceCardTestIds.ERROR_CONTAINER),
      ).toBeOnTheScreen();
    });

    it('renders the balance-unavailable message', () => {
      const { getByTestId } = renderWithProvider(<MoneyBalanceCard />);

      expect(
        getByTestId(MoneyBalanceCardTestIds.BALANCE_ERROR),
      ).toBeOnTheScreen();
    });

    it('renders the retry button', () => {
      const { getByTestId } = renderWithProvider(<MoneyBalanceCard />);

      expect(
        getByTestId(MoneyBalanceCardTestIds.BALANCE_RETRY),
      ).toBeOnTheScreen();
    });

    it('does not render the balance text', () => {
      const { queryByTestId } = renderWithProvider(<MoneyBalanceCard />);

      expect(
        queryByTestId(MoneyBalanceCardTestIds.BALANCE),
      ).not.toBeOnTheScreen();
    });

    it('does not render $0.00 as the balance', () => {
      const { queryByText } = renderWithProvider(<MoneyBalanceCard />);

      expect(queryByText('$0.00')).not.toBeOnTheScreen();
    });

    it('calls refetchBalance when the retry button is pressed', () => {
      const mockRefetch = jest.fn();
      mockUseMoneyAccountBalance.mockReturnValue(
        createBalanceMock({
          isBalanceFetchError: true,
          moneyBalanceQuery: { isFetching: false },
          totalFiatFormatted: undefined,
          totalFiatRaw: undefined,
          refetchBalance: mockRefetch,
        }),
      );

      const { getByTestId } = renderWithProvider(<MoneyBalanceCard />);

      fireEvent.press(getByTestId(MoneyBalanceCardTestIds.BALANCE_RETRY));

      expect(mockRefetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('retrying state (error + fetching)', () => {
    it('renders the balance skeleton', () => {
      mockUseMoneyAccountBalance.mockReturnValue(
        createBalanceMock({
          isBalanceFetchError: true,
          moneyBalanceQuery: { isFetching: true },
          totalFiatFormatted: undefined,
          totalFiatRaw: undefined,
        }),
      );

      const { getByTestId, queryByTestId } = renderWithProvider(
        <MoneyBalanceCard />,
      );

      expect(
        getByTestId(MoneyBalanceCardTestIds.BALANCE_SKELETON),
      ).toBeOnTheScreen();
      expect(
        queryByTestId(MoneyBalanceCardTestIds.BALANCE_ERROR),
      ).not.toBeOnTheScreen();
    });
  });

  describe('noAccount state', () => {
    beforeEach(() => {
      mockUseMoneyAccountInfo.mockReturnValue(
        createInfoMock({
          hasMoneyAccount: false,
          primaryMoneyAccount: undefined,
        }),
      );
    });

    it('renders the no-account message in the balance slot', () => {
      const { getByTestId } = renderWithProvider(<MoneyBalanceCard />);

      expect(
        getByTestId(MoneyBalanceCardTestIds.BALANCE_NO_ACCOUNT),
      ).toHaveTextContent(strings('money.balance_no_account'));
    });

    it('does not render the balance text', () => {
      const { queryByTestId } = renderWithProvider(<MoneyBalanceCard />);

      expect(
        queryByTestId(MoneyBalanceCardTestIds.BALANCE),
      ).not.toBeOnTheScreen();
    });

    it('does not render the balance error message', () => {
      const { queryByTestId } = renderWithProvider(<MoneyBalanceCard />);

      expect(
        queryByTestId(MoneyBalanceCardTestIds.BALANCE_ERROR),
      ).not.toBeOnTheScreen();
    });
  });

  describe('analytics', () => {
    it('initialises useMoneyAnalytics with WALLET_HOME screen_name and MONEY_BALANCE_CARD component_name', () => {
      renderWithProvider(<MoneyBalanceCard />);

      expect(useMoneyAnalytics).toHaveBeenCalledWith({
        screen_name: SCREEN_NAMES.WALLET_HOME,
        component_name: COMPONENT_NAMES.MONEY_BALANCE_CARD,
      });
    });

    it('calls trackComponentViewed on mount', () => {
      renderWithProvider(<MoneyBalanceCard />);

      expect(mockTrackComponentViewed).toHaveBeenCalledTimes(1);
    });

    it('does not call trackComponentViewed again on re-render', () => {
      const { rerender } = renderWithProvider(<MoneyBalanceCard />);

      rerender(<MoneyBalanceCard />);

      expect(mockTrackComponentViewed).toHaveBeenCalledTimes(1);
    });

    it('calls trackSurfaceClicked with MONEY_HOME redirect when the funded card body is pressed and onboarding has been seen', () => {
      const { getByTestId } = renderWithProvider(<MoneyBalanceCard />);

      fireEvent.press(getByTestId(MoneyBalanceCardTestIds.FUNDED_CONTAINER));

      expect(mockTrackSurfaceClicked).toHaveBeenCalledWith({
        redirect_target: SCREEN_NAMES.MONEY_HOME,
      });
    });

    it('tracks Add click with GO_TO_MONEY_ONBOARDING intent when onboarding has not been seen', () => {
      mockSelectMoneyOnboardingSeen.mockReturnValue(false);
      const { getByTestId } = renderWithProvider(<MoneyBalanceCard />);

      fireEvent.press(getByTestId(MoneyBalanceCardTestIds.ADD_BUTTON));

      expect(mockTrackButtonClicked).toHaveBeenCalledWith({
        button_type: MONEY_BUTTON_TYPES.TEXT,
        button_intent: MONEY_BUTTON_INTENTS.GO_TO_MONEY_ONBOARDING,
        label_key: 'money.balance_card.add',
        redirect_target: SCREEN_NAMES.MONEY_ONBOARDING,
      });
    });

    it('tracks Add click with ADD_MONEY intent when onboarding has been seen', () => {
      const { getByTestId } = renderWithProvider(<MoneyBalanceCard />);

      fireEvent.press(getByTestId(MoneyBalanceCardTestIds.ADD_BUTTON));

      expect(mockTrackButtonClicked).toHaveBeenCalledWith({
        button_type: MONEY_BUTTON_TYPES.TEXT,
        button_intent: MONEY_BUTTON_INTENTS.ADD_MONEY,
        label_key: 'money.balance_card.add',
        redirect_target: SCREEN_NAMES.MONEY_DEPOSIT,
      });
    });

    it('calls trackSurfaceClicked with MONEY_ONBOARDING redirect when card is pressed and onboarding has not been seen', () => {
      mockSelectMoneyOnboardingSeen.mockReturnValue(false);
      const { getByTestId } = renderWithProvider(<MoneyBalanceCard />);

      fireEvent.press(getByTestId(MoneyBalanceCardTestIds.FUNDED_CONTAINER));

      expect(mockTrackSurfaceClicked).toHaveBeenCalledWith({
        redirect_target: SCREEN_NAMES.MONEY_ONBOARDING,
      });
    });

    it('calls trackSurfaceClicked with MONEY_HOME redirect when card is pressed, onboarding not seen, and onboarding flag is disabled', () => {
      mockSelectMoneyOnboardingSeen.mockReturnValue(false);
      mockSelectMoneyOnboardingStepperAnimationEnabled.mockReturnValue(false);
      const { getByTestId } = renderWithProvider(<MoneyBalanceCard />);

      fireEvent.press(getByTestId(MoneyBalanceCardTestIds.FUNDED_CONTAINER));

      expect(mockTrackSurfaceClicked).toHaveBeenCalledWith({
        redirect_target: SCREEN_NAMES.MONEY_HOME,
      });
    });

    it('tracks Add click with ADD_MONEY intent when onboarding not seen but onboarding flag is disabled', () => {
      mockSelectMoneyOnboardingSeen.mockReturnValue(false);
      mockSelectMoneyOnboardingStepperAnimationEnabled.mockReturnValue(false);
      const { getByTestId } = renderWithProvider(<MoneyBalanceCard />);

      fireEvent.press(getByTestId(MoneyBalanceCardTestIds.ADD_BUTTON));

      expect(mockTrackButtonClicked).toHaveBeenCalledWith({
        button_type: MONEY_BUTTON_TYPES.TEXT,
        button_intent: MONEY_BUTTON_INTENTS.ADD_MONEY,
        label_key: 'money.balance_card.add',
        redirect_target: SCREEN_NAMES.MONEY_DEPOSIT,
      });
    });

    it('calls trackTooltipClicked with MONEY_BALANCE name and INFO type when the info button is pressed', () => {
      const { getByTestId } = renderWithProvider(<MoneyBalanceCard />);

      fireEvent.press(getByTestId(MoneyBalanceCardTestIds.INFO_BUTTON));

      expect(mockTrackTooltipClicked).toHaveBeenCalledWith({
        tooltip_name: MONEY_TOOLTIP_NAMES.MONEY_BALANCE,
        tooltip_type: MONEY_TOOLTIP_TYPES.INFO,
      });
    });
  });
});
