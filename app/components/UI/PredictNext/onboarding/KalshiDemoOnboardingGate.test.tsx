import React from 'react';
import { Text } from 'react-native';
import { act, render } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import type { AccountSetupIntent } from './accountReadiness.types';
import { KalshiDemoOnboardingGate } from './KalshiDemoOnboardingGate';

/**
 * Setup may only mount after an explicit readiness card action. Entering Home,
 * refreshing, or discovering an account that is not enabled never opens it.
 */

const mockState = {
  config: {} as unknown,
  signedIn: true,
  unlocked: true,
  authProfile: { id: 'kalshi-a2t-v1' } as { id: string } | undefined,
  evmAddress: '0x44934055428d2eF7E3F97D98187f2459007fa49F',
  canonicalProfileId: 'profile-1' as string | undefined,
  accountNotEnabled: false,
};
const mockUseOnboarding = jest.fn();
const mockCreateAdapter = jest.fn();
let mockCapturedOpenSetup: ((intent: AccountSetupIntent) => void) | null = null;
const mockAdapter = {
  subscribe: jest.fn(() => jest.fn()),
  openSetup: jest.fn(),
  resetSetup: jest.fn(),
  dispose: jest.fn(),
  publishStatus: jest.fn(),
  publishFailure: jest.fn(),
};

jest.mock('react-redux', () => ({
  useSelector: (selector: () => unknown) => selector(),
}));
jest.mock('../selectors/predictConfig', () => ({
  selectPredictConfig: () => mockState.config,
}));
jest.mock('../../../../selectors/identity', () => ({
  selectIsSignedIn: () => mockState.signedIn,
  selectCanonicalProfileId: () => mockState.canonicalProfileId,
}));
jest.mock('../../../../selectors/keyringController', () => ({
  selectIsUnlocked: () => mockState.unlocked,
}));
jest.mock('../../../../selectors/accountsController', () => ({
  selectEvmAddress: () => mockState.evmAddress,
}));
jest.mock('../config/predictConfig', () => ({
  resolveVenueAuthProfile: () => mockState.authProfile,
}));
jest.mock('../config/predictClusterUrls', () => ({
  getPredictApiUrl: () => 'https://predict.example',
}));
jest.mock('../implementation', () => ({
  useNextVenueId: () => 'kalshi',
}));
jest.mock('../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      PredictPortfolioService: { invalidateQueries: jest.fn() },
    },
  },
}));
jest.mock('../../../../hooks/useNetworkTier', () => ({
  useNetworkTier: () => 'WIFI',
}));
jest.mock('../../../../hooks/useNetworkLatency', () => ({
  useSettledNetworkLatency: () => 'OK',
}));
jest.mock('../../../../util/deviceCapability', () => ({
  getHardwareTier: () => 'HIGH',
}));
jest.mock('./internal/createKalshiOnboardingClient', () => ({
  createKalshiOnboardingClient: () => ({ getStatus: jest.fn() }),
}));
jest.mock('./internal/createKalshiAccountReadinessAdapter', () => ({
  createKalshiAccountReadinessAdapter: (args: {
    openSetup: (intent: AccountSetupIntent) => void;
  }) => {
    mockCreateAdapter(args);
    mockCapturedOpenSetup = args.openSetup;
    return mockAdapter;
  },
}));
jest.mock('./internal/useKalshiDemoOnboarding', () => ({
  useKalshiDemoOnboarding: (options: unknown) => mockUseOnboarding(options),
}));
jest.mock('./internal/useVenueAccountNotEnabled', () => ({
  useVenueAccountNotEnabled: () => mockState.accountNotEnabled,
}));
jest.mock('./internal/KalshiDemoOnboardingModal', () => {
  // eslint-disable-next-line @typescript-eslint/no-shadow
  const { Text } = jest.requireActual('react-native');
  return {
    KalshiDemoOnboardingModal: () => <Text testID="demo-modal">modal</Text>,
  };
});

const queryClient = new QueryClient();

const renderGate = () =>
  render(
    <QueryClientProvider client={queryClient}>
      <KalshiDemoOnboardingGate>
        <Text testID="child">child</Text>
      </KalshiDemoOnboardingGate>
    </QueryClientProvider>,
  );

const openFromCard = (intent: AccountSetupIntent = 'resume') =>
  act(() => {
    mockCapturedOpenSetup?.(intent);
  });

describe('KalshiDemoOnboardingGate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    queryClient.clear();
    mockState.signedIn = true;
    mockState.unlocked = true;
    mockState.authProfile = { id: 'kalshi-a2t-v1' };
    mockState.canonicalProfileId = 'profile-1';
    mockState.accountNotEnabled = false;
    mockState.evmAddress = '0x44934055428d2eF7E3F97D98187f2459007fa49F';
    mockUseOnboarding.mockReturnValue({ state: { step: 'link' } });
  });

  it('passes children through and mounts no flow on entry', () => {
    const view = renderGate();

    expect(view.getByTestId('child')).toBeOnTheScreen();
    expect(view.queryByTestId('demo-modal')).toBeNull();
    expect(mockUseOnboarding).not.toHaveBeenCalled();
    expect(mockCreateAdapter).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['no venue auth profile', { authProfile: undefined }],
    ['signed out', { signedIn: false }],
    ['locked wallet', { unlocked: false }],
    ['unknown canonical profile', { canonicalProfileId: undefined }],
  ])('does not create an adapter with %s', (_label, patch) => {
    Object.assign(mockState, patch);

    const view = renderGate();

    expect(view.queryByTestId('demo-modal')).toBeNull();
    expect(mockCreateAdapter).not.toHaveBeenCalled();
    expect(mockUseOnboarding).not.toHaveBeenCalled();
  });

  it('mounts the flow only after an explicit card action', () => {
    mockUseOnboarding.mockReturnValue({ state: { step: 'email' } });
    const view = renderGate();

    openFromCard('restart');

    expect(view.getByTestId('demo-modal')).toBeOnTheScreen();
    expect(mockUseOnboarding).toHaveBeenCalledWith(
      expect.objectContaining({ initialIntent: 'restart' }),
    );
    expect(mockCreateAdapter).toHaveBeenCalledTimes(1);
  });

  it('ignores repeated opens while the flow is mounted', () => {
    const view = renderGate();

    openFromCard();
    openFromCard('restart');

    expect(view.getAllByTestId('demo-modal')).toHaveLength(1);
    expect(mockUseOnboarding).toHaveBeenCalledTimes(1);
    expect(mockCreateAdapter).toHaveBeenCalledTimes(1);
  });

  it('closes and cancels the flow through the flow lifecycle callback', () => {
    mockUseOnboarding.mockReturnValue({ state: { step: 'email' } });
    const view = renderGate();
    openFromCard();

    const options: unknown = mockUseOnboarding.mock.calls[0][0];
    if (
      typeof options !== 'object' ||
      options === null ||
      !('onClose' in options) ||
      typeof options.onClose !== 'function'
    ) {
      throw new Error('flow did not receive an onClose callback');
    }
    const onClose = options.onClose;
    if (typeof onClose !== 'function') {
      throw new Error('flow did not receive an onClose callback');
    }
    act(() => {
      onClose();
    });

    expect(view.queryByTestId('demo-modal')).toBeNull();
    expect(mockAdapter.resetSetup).toHaveBeenCalledTimes(1);
  });

  it('closes a flow that discovers the account is already active', () => {
    mockUseOnboarding.mockReturnValue({ state: { step: 'hidden' } });
    const view = renderGate();

    openFromCard();

    expect(view.queryByTestId('demo-modal')).toBeNull();
  });

  it('never opens setup when a portfolio query reports account not enabled', () => {
    const view = renderGate();

    act(() => {
      mockState.accountNotEnabled = true;
      view.rerender(
        <QueryClientProvider client={queryClient}>
          <KalshiDemoOnboardingGate>
            <Text testID="child">child</Text>
          </KalshiDemoOnboardingGate>
        </QueryClientProvider>,
      );
    });

    expect(view.queryByTestId('demo-modal')).toBeNull();
    expect(mockUseOnboarding).not.toHaveBeenCalled();
  });

  it('closes the flow when the Funding Wallet address changes', () => {
    const view = renderGate();
    openFromCard();

    mockState.evmAddress = '0x0000000000000000000000000000000000000001';
    view.rerender(
      <QueryClientProvider client={queryClient}>
        <KalshiDemoOnboardingGate>
          <Text testID="child">child</Text>
        </KalshiDemoOnboardingGate>
      </QueryClientProvider>,
    );

    expect(view.queryByTestId('demo-modal')).toBeNull();
  });

  it('closes the flow and creates a new adapter when identity changes', () => {
    const view = renderGate();
    openFromCard();

    mockState.canonicalProfileId = 'profile-2';
    view.rerender(
      <QueryClientProvider client={queryClient}>
        <KalshiDemoOnboardingGate>
          <Text testID="child">child</Text>
        </KalshiDemoOnboardingGate>
      </QueryClientProvider>,
    );

    expect(view.queryByTestId('demo-modal')).toBeNull();
    expect(mockCreateAdapter).toHaveBeenCalledTimes(2);
  });
});
