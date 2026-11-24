import React from 'react';
import { act, render, waitFor } from '@testing-library/react-native';
import {
  StackActions,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { useMoneyAccountDeposit } from '../../hooks/useMoneyAccount';
import useMoneyToasts from '../../hooks/useMoneyToasts';
import { selectPrimaryMoneyAccount } from '../../../../../selectors/moneyAccountController';
import { selectMoneyEntryContext } from '../../selectors/entry';
import { selectHighestBalanceAaveTokenMeetingDepositMinimum } from '../../selectors/aaveOutputTokenEligibility';
import { selectMoneyEnableMoneyAccountFlag } from '../../selectors/featureFlags';
import { selectGeolocationStatus } from '../../../../../selectors/geolocationController';
import { MoneyPostOnboardingRedirectType } from '../../types/navigation';
import Routes from '../../../../../constants/navigation/Routes';
import Logger from '../../../../../util/Logger';
import { isUserRejectedError } from '../../../../../util/errorHandling/isUserRejectedError';
import MoneyDepositDeeplinkBridge, {
  MONEY_DEPOSIT_DEEPLINK_READINESS_TIMEOUT_MS,
} from './MoneyDepositDeeplinkBridge';

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: jest.fn(),
  useRoute: jest.fn(),
}));
jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));
jest.mock('../../hooks/useMoneyAccount');
jest.mock('../../hooks/useMoneyToasts');
jest.mock('../../../../../util/Logger');
jest.mock('../../../../../util/errorHandling/isUserRejectedError');
jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => key),
}));

const mockUseNavigation = jest.mocked(useNavigation);
const mockUseRoute = jest.mocked(useRoute);
const mockUseSelector = jest.mocked(useSelector);
const mockUseMoneyAccountDeposit = jest.mocked(useMoneyAccountDeposit);
const mockNavigate = jest.fn();
const mockDispatch = jest.fn();
const mockInitiateDeposit = jest.fn();
const mockGetState = jest.fn();
const mockShowToast = jest.fn();
const mockDepositFailedToast = { id: 'deposit-failed' };
const mockDepositFailed = jest.fn();
const BRIDGE_ROUTE_KEY = 'bridge-route';
const STACK_KEY = 'main-stack';
const bridgeFailureAction = {
  ...StackActions.pop(),
  source: BRIDGE_ROUTE_KEY,
  target: STACK_KEY,
};
const mockIsUserRejectedError = jest.mocked(isUserRejectedError);
const mockHighestBalanceAaveOutputToken = {
  address: '0xaca92e438df0b2401ff60da7e4337b687a2435da',
  chainId: '0x1',
};

const arrangeEligibility = ({
  isMoneyAccountFeatureEnabled = true,
  isMoneyAccountGeoEligible = true,
  isSplashRedirectNeeded = false,
  geolocationStatus = 'complete',
  highestBalanceAaveTokenMeetingDepositMinimum,
  hasMoneyAccount = true,
}: {
  hasMoneyAccount?: boolean;
  isMoneyAccountFeatureEnabled?: boolean;
  isMoneyAccountGeoEligible?: boolean;
  isSplashRedirectNeeded?: boolean;
  geolocationStatus?: string;
  highestBalanceAaveTokenMeetingDepositMinimum?: typeof mockHighestBalanceAaveOutputToken;
} = {}) => {
  mockUseSelector.mockImplementation((selector) => {
    if (selector === selectMoneyEnableMoneyAccountFlag) {
      return isMoneyAccountFeatureEnabled;
    }

    if (selector === selectMoneyEntryContext) {
      return {
        accessBlockReason: !isMoneyAccountFeatureEnabled
          ? 'feature_disabled'
          : !isMoneyAccountGeoEligible
            ? 'geo_blocked'
            : undefined,
        isSplashRedirectNeeded,
      };
    }

    if (selector === selectGeolocationStatus) {
      return geolocationStatus;
    }

    if (selector === selectPrimaryMoneyAccount) {
      return hasMoneyAccount ? { address: '0xabc' } : undefined;
    }

    if (selector === selectHighestBalanceAaveTokenMeetingDepositMinimum) {
      return highestBalanceAaveTokenMeetingDepositMinimum;
    }

    return undefined;
  });
};

describe('MoneyDepositDeeplinkBridge', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseNavigation.mockReturnValue({
      navigate: mockNavigate,
      dispatch: mockDispatch,
      getState: mockGetState,
    } as never);
    mockGetState.mockReturnValue({
      key: STACK_KEY,
      routes: [{ key: 'home-tabs' }, { key: BRIDGE_ROUTE_KEY }],
    });
    mockUseRoute.mockReturnValue({
      key: BRIDGE_ROUTE_KEY,
      params: undefined,
    } as never);
    mockDepositFailed.mockReturnValue(mockDepositFailedToast);
    jest.mocked(useMoneyToasts).mockReturnValue({
      showToast: mockShowToast,
      MoneyToastOptions: {
        deposit: { failed: mockDepositFailed },
      },
    } as never);
    mockUseMoneyAccountDeposit.mockReturnValue({
      initiateDeposit: mockInitiateDeposit,
    } as never);
    mockInitiateDeposit.mockResolvedValue(undefined);
    mockIsUserRejectedError.mockReturnValue(false);
    arrangeEligibility();
  });

  it('shows the disabled feature message when Money is unavailable', () => {
    arrangeEligibility({ isMoneyAccountFeatureEnabled: false });

    render(<MoneyDepositDeeplinkBridge />);

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.MONEY.MODALS.DEEPLINK_MODAL,
      {
        title: 'money.deeplink_modal.money_account_disabled.title',
        description: 'money.deeplink_modal.money_account_disabled.description',
      },
    );
    expect(mockInitiateDeposit).not.toHaveBeenCalled();
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('shows the geo block sheet when the user is ineligible', () => {
    arrangeEligibility({ isMoneyAccountGeoEligible: false });

    render(<MoneyDepositDeeplinkBridge />);

    expect(mockDispatch).toHaveBeenCalledTimes(1);
    const dispatchCallback = mockDispatch.mock.calls[0]?.[0] as
      | ((state: { key: string }) => unknown)
      | undefined;

    expect(dispatchCallback).toEqual(expect.any(Function));
    expect(dispatchCallback?.({ key: 'money-stack' })).toEqual({
      ...StackActions.replace(Routes.MONEY.MODALS.ROOT, {
        screen: Routes.MONEY.MODALS.GEO_BLOCK_SHEET,
      }),
      target: 'money-stack',
    });
    expect(mockInitiateDeposit).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('redirects unseen users to the splash with a deposit continuation', () => {
    mockUseRoute.mockReturnValue({
      key: BRIDGE_ROUTE_KEY,
      params: {
        tokenType: 'atoken',
      },
    } as never);
    arrangeEligibility({
      isSplashRedirectNeeded: true,
      highestBalanceAaveTokenMeetingDepositMinimum:
        mockHighestBalanceAaveOutputToken,
    });

    render(<MoneyDepositDeeplinkBridge />);

    expect(mockDispatch).toHaveBeenCalledTimes(1);
    const dispatchCallback = mockDispatch.mock.calls[0]?.[0] as
      | ((state: { key: string }) => unknown)
      | undefined;
    expect(dispatchCallback).toEqual(expect.any(Function));

    expect(dispatchCallback?.({ key: 'money-stack' })).toEqual({
      ...StackActions.replace(Routes.MONEY.SPLASH, {
        postOnboardingRedirect: {
          type: MoneyPostOnboardingRedirectType.DEPOSIT,
          preferredPaymentToken: {
            address: mockHighestBalanceAaveOutputToken.address,
            chainId: mockHighestBalanceAaveOutputToken.chainId,
          },
        },
      }),
      target: 'money-stack',
    });
    expect(mockInitiateDeposit).not.toHaveBeenCalled();
  });

  it('starts a replacement deposit confirmation when the splash is not needed', async () => {
    const { rerender } = render(<MoneyDepositDeeplinkBridge />);
    rerender(<MoneyDepositDeeplinkBridge />);

    await waitFor(() => {
      expect(mockInitiateDeposit).toHaveBeenCalledTimes(1);
    });

    expect(mockInitiateDeposit).toHaveBeenCalledWith({
      replaceConfirmation: true,
    });
  });

  it('starts deposit with the highest-balance aToken when requested', async () => {
    mockUseRoute.mockReturnValue({
      key: BRIDGE_ROUTE_KEY,
      params: {
        tokenType: 'atoken',
      },
    } as never);
    arrangeEligibility({
      highestBalanceAaveTokenMeetingDepositMinimum:
        mockHighestBalanceAaveOutputToken,
    });

    render(<MoneyDepositDeeplinkBridge />);

    await waitFor(() => {
      expect(mockInitiateDeposit).toHaveBeenCalledWith({
        preferredPaymentToken: {
          address: mockHighestBalanceAaveOutputToken.address,
          chainId: mockHighestBalanceAaveOutputToken.chainId,
        },
        replaceConfirmation: true,
      });
    });
  });

  it('starts normal deposit when atoken is requested without a positive balance', async () => {
    mockUseRoute.mockReturnValue({
      key: BRIDGE_ROUTE_KEY,
      params: {
        tokenType: 'atoken',
      },
    } as never);

    render(<MoneyDepositDeeplinkBridge />);

    await waitFor(() => {
      expect(mockInitiateDeposit).toHaveBeenCalledWith({
        replaceConfirmation: true,
      });
    });
  });

  it('starts normal deposit for an unsupported tokenType', async () => {
    mockUseRoute.mockReturnValue({
      key: BRIDGE_ROUTE_KEY,
      params: {
        tokenType: 'future-token',
      },
    } as never);
    arrangeEligibility({
      highestBalanceAaveTokenMeetingDepositMinimum:
        mockHighestBalanceAaveOutputToken,
    });

    render(<MoneyDepositDeeplinkBridge />);

    await waitFor(() => {
      expect(mockInitiateDeposit).toHaveBeenCalledWith({
        replaceConfirmation: true,
      });
    });
  });

  it('waits for geolocation before starting a cold-start deposit', async () => {
    arrangeEligibility({
      isMoneyAccountGeoEligible: false,
      geolocationStatus: 'loading',
    });
    const { rerender } = render(<MoneyDepositDeeplinkBridge />);

    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockDispatch).not.toHaveBeenCalled();
    expect(mockInitiateDeposit).not.toHaveBeenCalled();

    arrangeEligibility();
    rerender(<MoneyDepositDeeplinkBridge />);

    await waitFor(() => {
      expect(mockInitiateDeposit).toHaveBeenCalledTimes(1);
    });
  });

  it('does not start a cold-start deposit before the money account exists', () => {
    arrangeEligibility({ hasMoneyAccount: false });

    render(<MoneyDepositDeeplinkBridge />);

    expect(mockInitiateDeposit).not.toHaveBeenCalled();
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('starts the deposit once the money account arrives', async () => {
    arrangeEligibility({ hasMoneyAccount: false });
    const { rerender } = render(<MoneyDepositDeeplinkBridge />);

    arrangeEligibility();
    rerender(<MoneyDepositDeeplinkBridge />);

    await waitFor(() => {
      expect(mockInitiateDeposit).toHaveBeenCalledTimes(1);
    });
  });

  it('redirects to the splash without waiting for the money account', () => {
    arrangeEligibility({
      isSplashRedirectNeeded: true,
      hasMoneyAccount: false,
    });

    render(<MoneyDepositDeeplinkBridge />);

    expect(mockDispatch).toHaveBeenCalledTimes(1);
    expect(mockInitiateDeposit).not.toHaveBeenCalled();
  });

  describe('readiness timeout', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it.each([
      [
        'geolocation',
        { geolocationStatus: 'loading' },
        { geolocationStatus: 'loading', hasMoneyAccount: true },
      ],
      [
        'the money account',
        { hasMoneyAccount: false },
        { geolocationStatus: 'complete', hasMoneyAccount: false },
      ],
    ])(
      'closes the bridge with a failure toast when %s never becomes ready',
      (_name, pending, loggedReadiness) => {
        arrangeEligibility(pending);
        render(<MoneyDepositDeeplinkBridge />);

        act(() => {
          jest.advanceTimersByTime(MONEY_DEPOSIT_DEEPLINK_READINESS_TIMEOUT_MS);
        });

        expect(mockDispatch).toHaveBeenCalledTimes(1);
        expect(mockDispatch).toHaveBeenCalledWith(bridgeFailureAction);
        expect(mockDepositFailed).toHaveBeenCalledWith({ intent: 'addMusd' });
        expect(mockShowToast).toHaveBeenCalledTimes(1);
        expect(mockShowToast).toHaveBeenCalledWith(mockDepositFailedToast);
        expect(Logger.error).toHaveBeenCalledWith(
          new Error('Deposit deeplink readiness timed out'),
          {
            tags: { feature: 'money' },
            context: {
              name: 'money_deposit_deeplink_bridge',
              data: loggedReadiness,
            },
          },
        );
        expect(mockInitiateDeposit).not.toHaveBeenCalled();
      },
    );

    it('closes the bridge only once when readiness arrives after the timeout', () => {
      arrangeEligibility({ hasMoneyAccount: false });
      const { rerender } = render(<MoneyDepositDeeplinkBridge />);
      act(() => {
        jest.advanceTimersByTime(MONEY_DEPOSIT_DEEPLINK_READINESS_TIMEOUT_MS);
      });
      arrangeEligibility();

      rerender(<MoneyDepositDeeplinkBridge />);

      expect(mockInitiateDeposit).not.toHaveBeenCalled();
      expect(mockDispatch).toHaveBeenCalledTimes(1);
      expect(mockShowToast).toHaveBeenCalledTimes(1);
    });

    it.each([
      [
        'feature-disabled modal',
        { isMoneyAccountFeatureEnabled: false },
        { navigate: 1, dispatch: 0 },
      ],
      [
        'geo block sheet',
        { isMoneyAccountGeoEligible: false },
        { navigate: 0, dispatch: 1 },
      ],
      [
        'splash redirect',
        { isSplashRedirectNeeded: true },
        { navigate: 0, dispatch: 1 },
      ],
    ])(
      'leaves the %s alone after rerenders and the timeout',
      (_name, eligibility, expectedCalls) => {
        arrangeEligibility(eligibility);
        const { rerender } = render(<MoneyDepositDeeplinkBridge />);
        arrangeEligibility(eligibility);

        rerender(<MoneyDepositDeeplinkBridge />);
        act(() => {
          jest.advanceTimersByTime(MONEY_DEPOSIT_DEEPLINK_READINESS_TIMEOUT_MS);
        });

        expect(mockNavigate).toHaveBeenCalledTimes(expectedCalls.navigate);
        expect(mockDispatch).toHaveBeenCalledTimes(expectedCalls.dispatch);
        expect(mockShowToast).not.toHaveBeenCalled();
        expect(Logger.error).not.toHaveBeenCalled();
      },
    );

    it('does nothing at the timeout once the deposit has started', () => {
      render(<MoneyDepositDeeplinkBridge />);

      act(() => {
        jest.advanceTimersByTime(MONEY_DEPOSIT_DEEPLINK_READINESS_TIMEOUT_MS);
      });

      expect(mockInitiateDeposit).toHaveBeenCalledTimes(1);
      expect(mockDispatch).not.toHaveBeenCalled();
      expect(mockShowToast).not.toHaveBeenCalled();
    });
  });

  it('closes the bridge with a failure toast when deposit setup fails', async () => {
    const error = new Error('deposit failed');
    mockInitiateDeposit.mockRejectedValue(error);

    render(<MoneyDepositDeeplinkBridge />);

    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalledWith(bridgeFailureAction);
    });

    expect(mockDepositFailed).toHaveBeenCalledWith({ intent: 'addMusd' });
    expect(mockShowToast).toHaveBeenCalledWith(mockDepositFailedToast);
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(Logger.error).toHaveBeenCalledWith(
      error,
      '[MoneyDepositDeeplinkBridge] Failed to initiate deposit',
    );
  });

  it('leaves navigation alone when the confirmation already replaced the bridge', async () => {
    const error = new Error('batch failed');
    mockInitiateDeposit.mockRejectedValue(error);
    mockGetState.mockReturnValue({
      key: STACK_KEY,
      routes: [{ key: 'home-tabs' }, { key: 'money-confirmations' }],
    });

    render(<MoneyDepositDeeplinkBridge />);

    await waitFor(() => {
      expect(Logger.error).toHaveBeenCalledWith(
        error,
        '[MoneyDepositDeeplinkBridge] Failed to initiate deposit',
      );
    });

    expect(mockDispatch).not.toHaveBeenCalled();
    expect(mockShowToast).not.toHaveBeenCalled();
  });

  it('does not navigate home when deposit is rejected by the user', async () => {
    const error = new Error('user rejected');
    mockInitiateDeposit.mockRejectedValue(error);
    mockIsUserRejectedError.mockReturnValue(true);

    render(<MoneyDepositDeeplinkBridge />);

    await waitFor(() => {
      expect(mockIsUserRejectedError).toHaveBeenCalledWith(
        error,
        '[MoneyDepositDeeplinkBridge] Deposit cancelled',
      );
    });

    expect(mockDispatch).not.toHaveBeenCalled();
    expect(mockShowToast).not.toHaveBeenCalled();
    expect(Logger.error).not.toHaveBeenCalled();
  });
});
