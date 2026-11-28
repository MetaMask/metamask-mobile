import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo, AppState } from 'react-native';

import type { PredictVenueId } from '../types';
import type { KalshiActivationApi } from './internal/useKalshiActivation';
import { KalshiDemoOnboardingTestIds } from './internal/KalshiDemoOnboarding.testIds';
import { KalshiActivationPrompt } from './KalshiActivationPrompt';

const mockState = {
  signedIn: true,
  walletUnlocked: true,
  kycApproved: false,
  isFocused: true,
};

let identities = 0;
const mockClient: KalshiActivationApi = {
  getStatus: jest.fn(async () => ({ state: 'approved' as const })),
  activate: jest.fn(async () => ({}) as never),
  getIdentity: jest.fn(async () => `device-${identities++}`),
};
const mockCreateClient = jest.fn(() => mockClient);
const mockInvalidateQueries = jest.fn(async (_arg: unknown) => undefined);

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
jest.mock('./internal/kalshiActivationStatus', () => ({
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
  useIsFocused: (): boolean => mockState.isFocused,
  useFocusEffect: (callback: () => void | (() => void)): void => {
    jest.requireActual('react').useEffect(() => {
      if (mockState.isFocused) {
        return callback();
      }
      return undefined;
    }, [callback, mockState.isFocused]);
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
  let announceForAccessibility: jest.SpyInstance | undefined;
  let originalApiEnv: string | undefined;

  afterEach(() => {
    jest.useRealTimers();
    process.env.MM_API_ENV = originalApiEnv;
    announceForAccessibility?.mockRestore();
  });

  beforeEach(() => {
    originalApiEnv = process.env.MM_API_ENV;
    process.env.MM_API_ENV = 'uat';
    AppState.currentState = 'active';
    mockState.signedIn = true;
    mockState.walletUnlocked = true;
    mockState.kycApproved = true;
    mockCreateClient.mockClear();
    mockInvalidateQueries.mockClear();
    mockState.isFocused = true;
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
    expect(
      screen.getByTestId(KalshiDemoOnboardingTestIds.SHEET),
    ).toBeOnTheScreen();
  });

  it('opens when KYC approves while Home is focused', async () => {
    mockState.kycApproved = false;
    const { rerender } = renderPrompt();
    await flush();

    mockState.kycApproved = true;
    rerender(<KalshiActivationPrompt venueId={'kalshi' as PredictVenueId} />);
    await flush();

    expect(mockClient.getStatus).toHaveBeenCalledTimes(1);
    expect(
      screen.getByTestId(KalshiDemoOnboardingTestIds.SHEET),
    ).toBeOnTheScreen();
  });

  it('waits until Home is focused to check activation', async () => {
    mockState.isFocused = false;
    const { rerender } = renderPrompt();
    await flush();
    expect(mockClient.getStatus).not.toHaveBeenCalled();

    mockState.isFocused = true;
    rerender(<KalshiActivationPrompt venueId={'kalshi' as PredictVenueId} />);
    await flush();

    expect(mockClient.getStatus).toHaveBeenCalledTimes(1);
    expect(
      screen.getByTestId(KalshiDemoOnboardingTestIds.SHEET),
    ).toBeOnTheScreen();
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
    announceForAccessibility = jest
      .spyOn(AccessibilityInfo, 'announceForAccessibility')
      .mockImplementation(() => undefined);
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

    expect(
      screen.getByTestId(KalshiDemoOnboardingTestIds.DONE),
    ).toBeOnTheScreen();
    expect(announceForAccessibility).toHaveBeenCalledWith('Account ready');
    expect(mockInvalidateQueries).toHaveBeenCalled();
    expect(mockClient.activate).toHaveBeenCalledTimes(1);

    fireEvent.press(screen.getByTestId(KalshiDemoOnboardingTestIds.CLOSE));
    expect(screen.queryByTestId(KalshiDemoOnboardingTestIds.SHEET)).toBeNull();
  });

  it('does not reopen after Not now until Home regains focus', async () => {
    const { rerender } = renderPrompt();
    await flush();

    fireEvent.press(screen.getByTestId(KalshiDemoOnboardingTestIds.NOT_NOW));
    expect(screen.queryByTestId(KalshiDemoOnboardingTestIds.SHEET)).toBeNull();

    mockState.isFocused = false;
    rerender(<KalshiActivationPrompt venueId={'kalshi' as PredictVenueId} />);
    mockState.isFocused = true;
    rerender(<KalshiActivationPrompt venueId={'kalshi' as PredictVenueId} />);
    await flush();

    expect(mockClient.getStatus).toHaveBeenCalledTimes(2);
    expect(
      screen.getByTestId(KalshiDemoOnboardingTestIds.SHEET),
    ).toBeOnTheScreen();
  });

  it('announces a failed activation and keeps the sheet open', async () => {
    announceForAccessibility = jest
      .spyOn(AccessibilityInfo, 'announceForAccessibility')
      .mockImplementation(() => undefined);
    (mockClient.activate as jest.Mock).mockRejectedValueOnce(new Error('boom'));

    renderPrompt();
    await flush();
    fireEvent.press(screen.getByTestId(KalshiDemoOnboardingTestIds.ACTIVATE));
    await flush();

    expect(
      screen.getByTestId(KalshiDemoOnboardingTestIds.SHEET),
    ).toBeOnTheScreen();
    const message = screen.getByTestId(KalshiDemoOnboardingTestIds.MESSAGE);
    expect(message).toHaveTextContent('Something went wrong.');
    expect(message.props.accessibilityRole).toBe('alert');
    expect(announceForAccessibility).toHaveBeenCalledWith(
      'Something went wrong.',
    );
  });

  it('keeps the sheet open when a status re-read fails', async () => {
    const { rerender } = renderPrompt();
    await flush();
    expect(
      screen.getByTestId(KalshiDemoOnboardingTestIds.SHEET),
    ).toBeOnTheScreen();

    (mockClient.getStatus as jest.Mock).mockRejectedValue(new Error('offline'));
    mockState.isFocused = false;
    rerender(<KalshiActivationPrompt venueId={'kalshi' as PredictVenueId} />);
    mockState.isFocused = true;
    rerender(<KalshiActivationPrompt venueId={'kalshi' as PredictVenueId} />);
    await flush();

    expect(
      screen.getByTestId(KalshiDemoOnboardingTestIds.SHEET),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(KalshiDemoOnboardingTestIds.ACTIVATE),
    ).toBeOnTheScreen();
  });

  it('still shows readiness when portfolio invalidation fails', async () => {
    jest.useFakeTimers();
    mockInvalidateQueries.mockRejectedValueOnce(new Error('offline'));
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

    expect(
      screen.getByTestId(KalshiDemoOnboardingTestIds.DONE),
    ).toBeOnTheScreen();
  });

  it('stays closed when activation completes away from Home', async () => {
    const { rerender } = renderPrompt();
    await flush();
    fireEvent.press(screen.getByTestId(KalshiDemoOnboardingTestIds.NOT_NOW));
    (mockClient.getStatus as jest.Mock).mockResolvedValue({ state: 'active' });

    mockState.isFocused = false;
    rerender(<KalshiActivationPrompt venueId={'kalshi' as PredictVenueId} />);
    mockState.isFocused = true;
    rerender(<KalshiActivationPrompt venueId={'kalshi' as PredictVenueId} />);
    await flush();

    expect(screen.queryByTestId(KalshiDemoOnboardingTestIds.SHEET)).toBeNull();
    expect(mockInvalidateQueries).toHaveBeenCalled();
  });

  it('keeps the sheet open when the poll reports an unsupported state', async () => {
    jest.useFakeTimers();
    (mockClient.getStatus as jest.Mock)
      .mockResolvedValueOnce({ state: 'approved' })
      .mockResolvedValueOnce({ state: 'unsupported' });
    (mockClient.activate as jest.Mock).mockResolvedValue({});

    renderPrompt();
    await act(async () => {
      await jest.runAllTimersAsync();
    });
    fireEvent.press(screen.getByTestId(KalshiDemoOnboardingTestIds.ACTIVATE));
    await act(async () => {
      await jest.runAllTimersAsync();
    });

    expect(
      screen.getByTestId(KalshiDemoOnboardingTestIds.SHEET),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(KalshiDemoOnboardingTestIds.MESSAGE),
    ).toHaveTextContent("This account can't be linked in the demo flow.");
  });

  it('stays closed in a production environment', async () => {
    const devGlobal = globalThis as unknown as Record<string, unknown>;
    const originalDev = devGlobal.__DEV__;
    devGlobal.__DEV__ = false;
    process.env.MM_API_ENV = 'prod';

    try {
      renderPrompt();
      await flush();

      expect(mockCreateClient).not.toHaveBeenCalled();
      expect(
        screen.queryByTestId(KalshiDemoOnboardingTestIds.SHEET),
      ).toBeNull();
    } finally {
      devGlobal.__DEV__ = originalDev;
    }
  });
});
