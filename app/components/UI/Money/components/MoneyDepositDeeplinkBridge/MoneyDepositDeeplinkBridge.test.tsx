import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { StackActions, useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { useMoneyAccountDeposit } from '../../hooks/useMoneyAccount';
import { useMoneyOnboardingNavigation } from '../../hooks/useMoneyNavigation';
import { selectIsMoneyAccountGeoEligible } from '../../selectors/eligibility';
import { selectMoneyEnableMoneyAccountFlag } from '../../selectors/featureFlags';
import { selectGeolocationStatus } from '../../../../../selectors/geolocationController';
import { MoneyPostOnboardingRedirectType } from '../../types/navigation';
import Routes from '../../../../../constants/navigation/Routes';
import Logger from '../../../../../util/Logger';
import { isUserRejectedError } from '../../../../../util/errorHandling/isUserRejectedError';
import MoneyDepositDeeplinkBridge from './MoneyDepositDeeplinkBridge';

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: jest.fn(),
}));
jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));
jest.mock('../../hooks/useMoneyAccount');
jest.mock('../../hooks/useMoneyNavigation');
jest.mock('../../../../../util/Logger');
jest.mock('../../../../../util/errorHandling/isUserRejectedError');
jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => key),
}));

const mockUseNavigation = jest.mocked(useNavigation);
const mockUseSelector = jest.mocked(useSelector);
const mockUseMoneyAccountDeposit = jest.mocked(useMoneyAccountDeposit);
const mockUseMoneyOnboardingNavigation = jest.mocked(
  useMoneyOnboardingNavigation,
);
const mockNavigate = jest.fn();
const mockDispatch = jest.fn();
const mockInitiateDeposit = jest.fn();
const mockRedirectToOnboardingIfNeeded = jest.fn();
const mockIsUserRejectedError = jest.mocked(isUserRejectedError);

const arrangeEligibility = ({
  isMoneyAccountFeatureEnabled = true,
  isMoneyAccountGeoEligible = true,
  geolocationStatus = 'complete',
}: {
  isMoneyAccountFeatureEnabled?: boolean;
  isMoneyAccountGeoEligible?: boolean;
  geolocationStatus?: string;
} = {}) => {
  mockUseSelector.mockImplementation((selector) => {
    if (selector === selectMoneyEnableMoneyAccountFlag) {
      return isMoneyAccountFeatureEnabled;
    }

    if (selector === selectIsMoneyAccountGeoEligible) {
      return isMoneyAccountGeoEligible;
    }

    if (selector === selectGeolocationStatus) {
      return geolocationStatus;
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
    } as never);
    mockUseMoneyAccountDeposit.mockReturnValue({
      initiateDeposit: mockInitiateDeposit,
    } as never);
    mockUseMoneyOnboardingNavigation.mockReturnValue({
      isOnboardingRedirectNeeded: false,
      redirectToOnboardingIfNeeded: mockRedirectToOnboardingIfNeeded,
    });
    mockInitiateDeposit.mockResolvedValue(undefined);
    mockRedirectToOnboardingIfNeeded.mockReturnValue(false);
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

    expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.MODALS.ROOT, {
      screen: Routes.MONEY.MODALS.GEO_BLOCK_SHEET,
    });
    expect(mockInitiateDeposit).not.toHaveBeenCalled();
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('redirects unseen users to onboarding with a deposit continuation', () => {
    mockUseMoneyOnboardingNavigation.mockReturnValue({
      isOnboardingRedirectNeeded: true,
      redirectToOnboardingIfNeeded: mockRedirectToOnboardingIfNeeded,
    });

    render(<MoneyDepositDeeplinkBridge />);

    expect(mockDispatch).toHaveBeenCalledTimes(1);
    const dispatchCallback = mockDispatch.mock.calls[0]?.[0] as
      | ((state: { key: string }) => unknown)
      | undefined;
    expect(dispatchCallback).toEqual(expect.any(Function));

    expect(dispatchCallback?.({ key: 'money-stack' })).toEqual({
      ...StackActions.replace(Routes.MONEY.ONBOARDING, {
        postOnboardingRedirect: {
          type: MoneyPostOnboardingRedirectType.DEPOSIT,
        },
      }),
      target: 'money-stack',
    });
    expect(mockInitiateDeposit).not.toHaveBeenCalled();
  });

  it('starts a replacement deposit confirmation when onboarding is not needed', async () => {
    const { rerender } = render(<MoneyDepositDeeplinkBridge />);
    rerender(<MoneyDepositDeeplinkBridge />);

    await waitFor(() => {
      expect(mockInitiateDeposit).toHaveBeenCalledTimes(1);
    });

    expect(mockInitiateDeposit).toHaveBeenCalledWith({
      replaceConfirmation: true,
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

  it('logs the initiation failure and returns home', async () => {
    const error = new Error('deposit failed');
    mockInitiateDeposit.mockRejectedValue(error);

    render(<MoneyDepositDeeplinkBridge />);

    await waitFor(() => {
      expect(mockIsUserRejectedError).toHaveBeenCalledWith(
        error,
        '[MoneyDepositDeeplinkBridge] Deposit cancelled',
      );
      expect(mockNavigate).toHaveBeenCalledWith(Routes.WALLET.HOME);
    });

    expect(Logger.error).toHaveBeenCalledWith(
      error,
      '[MoneyDepositDeeplinkBridge] Failed to initiate deposit',
    );
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

    expect(mockNavigate).not.toHaveBeenCalled();
    expect(Logger.error).not.toHaveBeenCalled();
  });
});
