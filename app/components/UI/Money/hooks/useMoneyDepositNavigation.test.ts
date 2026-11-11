import { renderHook, act } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import {
  useMoneyCtaDepositNavigation,
  useMoneyDepositNavigation,
} from './useMoneyDepositNavigation';
import { useMoneyAccountDeposit } from './useMoneyAccount';
import Routes from '../../../../constants/navigation/Routes';
import { MoneyPostOnboardingRedirectType } from '../types/navigation';
import { MONEY_BUTTON_INTENTS, SCREEN_NAMES } from '../constants/moneyEvents';
import {
  selectMoneyCtaEntryContext,
  selectMoneyEntryContext,
} from '../selectors/entry';

const mockNavigate = jest.fn();
const mockInitiateDeposit = jest.fn();

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

jest.mock('../selectors/entry', () => ({
  selectMoneyCtaEntryContext: jest.fn(),
  selectMoneyEntryContext: jest.fn(),
}));

jest.mock('./useMoneyAccount', () => ({
  useMoneyAccountDeposit: jest.fn(),
}));

const mockUseSelector = jest.mocked(useSelector);
const mockSelectMoneyEntryContext = jest.mocked(selectMoneyEntryContext);
const mockUseMoneyAccountDeposit = jest.mocked(useMoneyAccountDeposit);

const setupSelectorMocks = ({
  hasSeenOnboarding = false,
  isOnboardingEnabled = true,
  accessBlockReason,
  isSplashRedirectNeeded = false,
}: {
  hasSeenOnboarding?: boolean;
  isOnboardingEnabled?: boolean;
  accessBlockReason?: 'feature_disabled' | 'geo_blocked';
  isSplashRedirectNeeded?: boolean;
} = {}) => {
  const entryContext = {
    accessBlockReason,
    isOnboardingRedirectNeeded: !hasSeenOnboarding && isOnboardingEnabled,
    isSplashRedirectNeeded,
  };
  mockUseSelector.mockImplementation((selector: unknown) => {
    if (
      selector === selectMoneyEntryContext ||
      selector === selectMoneyCtaEntryContext
    ) {
      return mockSelectMoneyEntryContext({} as never);
    }
    return undefined;
  });
  mockSelectMoneyEntryContext.mockReturnValue(entryContext);
};

describe('useMoneyDepositNavigation', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    setupSelectorMocks({ hasSeenOnboarding: true });
    mockUseMoneyAccountDeposit.mockReturnValue({
      initiateDeposit: mockInitiateDeposit,
    });
  });

  it('tracks before initiating an accessible deposit', async () => {
    const callOrder: string[] = [];
    mockInitiateDeposit.mockImplementation(async () => {
      callOrder.push('deposit');
    });
    const track = jest.fn(() => callOrder.push('track'));
    const { result } = renderHook(() => useMoneyDepositNavigation());

    await act(async () => {
      await result.current.navigateToMoneyDeposit({
        preferredPaymentToken: {
          address: '0xabc',
          chainId: '0x1',
        },
        track,
      });
    });

    expect(callOrder).toStrictEqual(['track', 'deposit']);
    expect(mockInitiateDeposit).toHaveBeenCalledWith({
      preferredPaymentToken: {
        address: '0xabc',
        chainId: '0x1',
      },
    });
  });

  it('continues to deposit after onboarding state remains stale', async () => {
    setupSelectorMocks({ isOnboardingEnabled: true });
    const { result } = renderHook(() => useMoneyDepositNavigation());

    await act(async () => {
      await result.current.navigateToMoneyDeposit({
        isPostOnboardingContinuation: true,
      });
    });

    expect(mockInitiateDeposit).toHaveBeenCalledWith({});
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('routes an unseen deposit to onboarding without initiating it', async () => {
    setupSelectorMocks({ isOnboardingEnabled: true });
    const { result } = renderHook(() => useMoneyDepositNavigation());

    await act(async () => {
      await result.current.navigateToMoneyDeposit();
    });

    expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.ONBOARDING, {
      postOnboardingRedirect: {
        type: MoneyPostOnboardingRedirectType.DEPOSIT,
      },
    });
    expect(mockInitiateDeposit).not.toHaveBeenCalled();
  });

  it('routes an unseen CTA deposit to the splash with the payment token', async () => {
    setupSelectorMocks({
      hasSeenOnboarding: true,
      isSplashRedirectNeeded: true,
    });
    const track = jest.fn();
    const preferredPaymentToken = {
      address: '0xabc' as const,
      chainId: '0x1' as const,
    };
    const { result } = renderHook(() => useMoneyCtaDepositNavigation());

    await act(async () => {
      await result.current.navigateToMoneyDeposit({
        preferredPaymentToken,
        track,
      });
    });

    expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.SPLASH, {
      postOnboardingRedirect: {
        type: MoneyPostOnboardingRedirectType.DEPOSIT,
        preferredPaymentToken,
      },
    });
    expect(track).toHaveBeenCalledWith({
      redirect_target: SCREEN_NAMES.MONEY_SPLASH,
      button_intent: MONEY_BUTTON_INTENTS.GO_TO_MONEY_SPLASH,
    });
    expect(mockInitiateDeposit).not.toHaveBeenCalled();
  });

  it('routes a blocked deposit to an access notice without initiating it', async () => {
    setupSelectorMocks({
      hasSeenOnboarding: true,
      accessBlockReason: 'geo_blocked',
    });
    const { result } = renderHook(() => useMoneyDepositNavigation());

    await act(async () => {
      await result.current.navigateToMoneyDeposit();
    });

    expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.MODALS.ROOT, {
      screen: Routes.MONEY.MODALS.GEO_BLOCK_SHEET,
    });
    expect(mockInitiateDeposit).not.toHaveBeenCalled();
  });

  it('keeps feature restrictions for a post-onboarding continuation', async () => {
    setupSelectorMocks({
      accessBlockReason: 'feature_disabled',
    });
    const { result } = renderHook(() => useMoneyDepositNavigation());

    await act(async () => {
      await result.current.navigateToMoneyDeposit({
        isPostOnboardingContinuation: true,
      });
    });

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.MONEY.MODALS.DEEPLINK_MODAL,
      expect.objectContaining({
        title: expect.any(String),
        description: expect.any(String),
      }),
    );
    expect(mockInitiateDeposit).not.toHaveBeenCalled();
  });
});
