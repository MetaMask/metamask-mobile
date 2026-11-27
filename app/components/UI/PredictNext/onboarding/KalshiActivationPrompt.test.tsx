import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { AppState } from 'react-native';

import type { PredictVenueId } from '../types';
import type { KalshiActivationApi } from './internal/useKalshiActivation';
import { KalshiDemoOnboardingTestIds } from './internal/KalshiDemoOnboarding.testIds';
import { KalshiActivationPrompt } from './KalshiActivationPrompt';

const mockState = {
  signedIn: true,
  walletUnlocked: true,
  kycApproved: false,
};

const mockClient: KalshiActivationApi = {
  getStatus: jest.fn(async () => ({ state: 'approved' as const })),
  activate: jest.fn(async () => ({}) as never),
};
const mockCreateClient = jest.fn(() => mockClient);
const mockInvalidateQueries = jest.fn(async (_arg: unknown) => undefined);
let focusCallback: (() => void | (() => void)) | undefined;

jest.mock('react-redux', () => ({
  useSelector: (selector: () => unknown) => selector(),
}));
jest.mock('../../../../selectors/identity', () => ({
  selectIsSignedIn: () => mockState.signedIn,
}));
jest.mock('../../../../selectors/keyringController', () => ({
  selectIsUnlocked: () => mockState.walletUnlocked,
}));
jest.mock('../../../../selectors/accountsController', () => ({
  selectEvmAddress: () => '0x1234',
}));
jest.mock('../selectors/predictConfig', () => ({
  selectPredictConfig: () => ({}),
}));
jest.mock('../config/predictConfig', () => ({
  resolveVenueAuthProfile: () => ({ profile: 'test' }),
}));
jest.mock('../../KYC/Kalshi/kalshiBannerState', () => ({
  selectIsKalshiKycApproved: () => mockState.kycApproved,
}));
jest.mock('../../../../hooks/useNetworkTier', () => ({
  useNetworkTier: () => 'WIFI',
}));
jest.mock('../../../../util/deviceCapability', () => ({
  getHardwareTier: () => 'HIGH',
}));
jest.mock('../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      PredictPortfolioService: {
        invalidateQueries: async (arg: unknown) => mockInvalidateQueries(arg),
      },
    },
  },
}));
jest.mock('@react-navigation/native', () => ({
  useIsFocused: () => true,
  useFocusEffect: (callback: () => void | (() => void)) => {
    focusCallback = callback;
  },
}));
jest.mock('./internal/createKalshiOnboardingClient', () => ({
  createKalshiOnboardingClient: () => mockCreateClient(),
}));

const renderPrompt = () =>
  render(<KalshiActivationPrompt venueId={'kalshi' as PredictVenueId} />);

const flush = async () => {
  await act(async () => undefined);
};

describe('KalshiActivationPrompt', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    AppState.currentState = 'active';
    mockState.signedIn = true;
    mockState.walletUnlocked = true;
    mockState.kycApproved = true;
    mockCreateClient.mockClear();
    mockInvalidateQueries.mockClear();
    focusCallback = undefined;
    (mockClient.getStatus as jest.Mock).mockReset();
    (mockClient.getStatus as jest.Mock).mockResolvedValue({
      state: 'approved',
    });
  });

  it('opens once KYC is approved and predict-api still says approved', async () => {
    renderPrompt();
    await flush();

    expect(mockCreateClient).toHaveBeenCalledTimes(1);
    expect(mockClient.getStatus).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId(KalshiDemoOnboardingTestIds.SHEET)).toBeTruthy();
  });

  it('stays closed until KYC is approved', async () => {
    mockState.kycApproved = false;

    renderPrompt();
    await flush();

    expect(mockCreateClient).not.toHaveBeenCalled();
    expect(mockClient.getStatus).not.toHaveBeenCalled();
    expect(screen.queryByTestId(KalshiDemoOnboardingTestIds.SHEET)).toBeNull();
  });

  it('stays closed without an unlocked wallet', async () => {
    mockState.walletUnlocked = false;

    renderPrompt();
    await flush();

    expect(mockCreateClient).not.toHaveBeenCalled();
    expect(screen.queryByTestId(KalshiDemoOnboardingTestIds.SHEET)).toBeNull();
  });

  it('stays closed when the profile is signed out', async () => {
    mockState.signedIn = false;

    renderPrompt();
    await flush();

    expect(mockCreateClient).not.toHaveBeenCalled();
    expect(screen.queryByTestId(KalshiDemoOnboardingTestIds.SHEET)).toBeNull();
  });

  it('stays closed for another venue', async () => {
    render(<KalshiActivationPrompt venueId={'polymarket' as PredictVenueId} />);
    await flush();

    expect(mockCreateClient).not.toHaveBeenCalled();
    expect(screen.queryByTestId(KalshiDemoOnboardingTestIds.SHEET)).toBeNull();
  });

  it('stays closed when the account is already active', async () => {
    (mockClient.getStatus as jest.Mock).mockResolvedValue({ state: 'active' });

    renderPrompt();
    await flush();

    expect(screen.queryByTestId(KalshiDemoOnboardingTestIds.SHEET)).toBeNull();
  });

  it('shows the ready state after activation and closes on Done', async () => {
    jest.useFakeTimers();
    (mockClient.getStatus as jest.Mock)
      .mockResolvedValueOnce({ state: 'approved' })
      .mockResolvedValueOnce({ state: 'active' });
    (mockClient.activate as jest.Mock).mockResolvedValue({});

    renderPrompt();
    await act(async () => {
      await jest.runAllTimersAsync();
    });
    fireEvent.press(screen.getByTestId(KalshiDemoOnboardingTestIds.ACTIVATE));
    await act(async () => {
      await jest.runAllTimersAsync();
    });

    expect(screen.getByTestId(KalshiDemoOnboardingTestIds.DONE)).toBeTruthy();
    expect(mockInvalidateQueries).toHaveBeenCalled();
    expect(mockClient.activate).toHaveBeenCalledTimes(1);

    fireEvent.press(screen.getByTestId(KalshiDemoOnboardingTestIds.CLOSE));
    expect(screen.queryByTestId(KalshiDemoOnboardingTestIds.SHEET)).toBeNull();
  });

  it('does not reopen after Not now until Home regains focus', async () => {
    renderPrompt();
    await flush();
    await act(async () => {
      focusCallback?.();
    });

    fireEvent.press(screen.getByTestId(KalshiDemoOnboardingTestIds.NOT_NOW));
    expect(screen.queryByTestId(KalshiDemoOnboardingTestIds.SHEET)).toBeNull();

    await act(async () => {
      focusCallback?.();
    });
    await flush();

    expect(screen.getByTestId(KalshiDemoOnboardingTestIds.SHEET)).toBeTruthy();
  });
});
