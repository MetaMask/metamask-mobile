import React from 'react';
import { Text } from 'react-native';
import { act, render } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PredictError, PredictErrorCode } from '../errors';
import { portfolioQueries } from '../queries/portfolioQueries';
import { KALSHI_VENUE_ID } from '../adapters/remote/KalshiRemoteAdapter';

import { KalshiDemoOnboardingGate } from './KalshiDemoOnboardingGate';

/**
 * The gate is the only thing between a user and the temporary demo flow, so
 * the test pins when it must stay closed. The flow, its hook and the network
 * are stubbed: only whether a flow starts is under test.
 */

const mockState = {
  config: {} as unknown,
  signedIn: true,
  unlocked: true,
  authProfile: { id: 'kalshi-a2t-v1' } as unknown,
};
const mockCreateClient = jest.fn(() => ({ getStatus: jest.fn() }));
const mockUseOnboarding = jest.fn();

jest.mock('react-redux', () => ({
  useSelector: (selector: () => unknown) => selector(),
}));
jest.mock('../selectors/predictConfig', () => ({
  selectPredictConfig: () => mockState.config,
}));
jest.mock('../../../../selectors/identity', () => ({
  selectIsSignedIn: () => mockState.signedIn,
}));
jest.mock('../../../../selectors/keyringController', () => ({
  selectIsUnlocked: () => mockState.unlocked,
}));
jest.mock('../../../../selectors/accountsController', () => ({
  selectEvmAddress: () => '0x44934055428d2eF7E3F97D98187f2459007fa49F',
}));
jest.mock('../config/predictConfig', () => ({
  resolveVenueAuthProfile: () => mockState.authProfile,
}));
jest.mock('../../../../core/Engine', () => ({
  __esModule: true,
  default: { context: { PredictPortfolioService: {} } },
}));
jest.mock('../../../../hooks/useNetworkTier', () => ({
  useNetworkTier: () => 'WIFI',
}));
jest.mock('../../../../util/deviceCapability', () => ({
  getHardwareTier: () => 'HIGH',
}));
jest.mock('./internal/createKalshiOnboardingClient', () => ({
  createKalshiOnboardingClient: () => mockCreateClient(),
}));
jest.mock('./internal/useKalshiDemoOnboarding', () => ({
  useKalshiDemoOnboarding: (options: unknown) => mockUseOnboarding(options),
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

describe('KalshiDemoOnboardingGate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    queryClient.clear();
    mockState.signedIn = true;
    mockState.unlocked = true;
    mockState.authProfile = { id: 'kalshi-a2t-v1' };
    mockUseOnboarding.mockReturnValue({ state: { step: 'link' } });
  });

  it('opens the flow for a signed-in, unlocked wallet with a venue auth profile', () => {
    const view = renderGate();

    expect(view.getByTestId('child')).toBeOnTheScreen();
    expect(view.getByTestId('demo-modal')).toBeOnTheScreen();
    expect(mockCreateClient).toHaveBeenCalledTimes(1);
  });

  it('stays closed when the remote configuration selects no venue auth profile', () => {
    mockState.authProfile = undefined;

    const view = renderGate();

    expect(view.getByTestId('child')).toBeOnTheScreen();
    expect(view.queryByTestId('demo-modal')).not.toBeOnTheScreen();
    expect(mockCreateClient).not.toHaveBeenCalled();
    expect(mockUseOnboarding).not.toHaveBeenCalled();
  });

  it('stays closed while the user is signed out', () => {
    mockState.signedIn = false;

    const view = renderGate();

    expect(view.queryByTestId('demo-modal')).not.toBeOnTheScreen();
    expect(mockCreateClient).not.toHaveBeenCalled();
  });

  it('stays closed while the wallet is locked', () => {
    mockState.unlocked = false;

    const view = renderGate();

    expect(view.queryByTestId('demo-modal')).not.toBeOnTheScreen();
    expect(mockCreateClient).not.toHaveBeenCalled();
  });

  it('shows nothing while the status read is loading or hidden', () => {
    for (const step of ['loading', 'hidden']) {
      mockUseOnboarding.mockReturnValue({ state: { step } });

      const view = renderGate();

      expect(view.queryByTestId('demo-modal')).not.toBeOnTheScreen();
      view.unmount();
    }
  });

  it('reopens a hidden flow when a real portfolio query reports account not enabled', () => {
    mockUseOnboarding.mockReturnValue({ state: { step: 'hidden' } });
    const view = renderGate();
    expect(view.queryByTestId('demo-modal')).not.toBeOnTheScreen();
    mockUseOnboarding.mockReturnValue({ state: { step: 'link' } });

    act(() => {
      queryClient.getQueryCache().build(queryClient, {
        queryKey: portfolioQueries.getBalance(KALSHI_VENUE_ID).family,
        queryFn: async () => undefined,
      }).setState({
        status: 'error',
        error: PredictError.from(PredictErrorCode.VENUE_ACCOUNT_NOT_ENABLED),
      });
    });

    expect(view.getByTestId('demo-modal')).toBeOnTheScreen();
    expect(mockCreateClient).toHaveBeenCalledTimes(1);
  });
});
