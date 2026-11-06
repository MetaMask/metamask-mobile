import React from 'react';
import { Text } from 'react-native';
import { render } from '@testing-library/react-native';

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

const renderGate = () =>
  render(
    <KalshiDemoOnboardingGate>
      <Text testID="child">child</Text>
    </KalshiDemoOnboardingGate>,
  );

describe('KalshiDemoOnboardingGate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockState.signedIn = true;
    mockState.unlocked = true;
    mockState.authProfile = { id: 'kalshi-a2t-v1' };
    mockUseOnboarding.mockReturnValue({ state: { step: 'link' } });
  });

  it('opens the flow for a signed-in, unlocked wallet with a venue auth profile', () => {
    const view = renderGate();

    expect(view.getByTestId('child')).toBeTruthy();
    expect(view.getByTestId('demo-modal')).toBeTruthy();
    expect(mockCreateClient).toHaveBeenCalledTimes(1);
  });

  it('stays closed when the remote configuration selects no venue auth profile', () => {
    mockState.authProfile = undefined;

    const view = renderGate();

    expect(view.getByTestId('child')).toBeTruthy();
    expect(view.queryByTestId('demo-modal')).toBeNull();
    expect(mockCreateClient).not.toHaveBeenCalled();
    expect(mockUseOnboarding).not.toHaveBeenCalled();
  });

  it('stays closed while the user is signed out', () => {
    mockState.signedIn = false;

    const view = renderGate();

    expect(view.queryByTestId('demo-modal')).toBeNull();
    expect(mockCreateClient).not.toHaveBeenCalled();
  });

  it('stays closed while the wallet is locked', () => {
    mockState.unlocked = false;

    const view = renderGate();

    expect(view.queryByTestId('demo-modal')).toBeNull();
    expect(mockCreateClient).not.toHaveBeenCalled();
  });

  it('shows nothing while the status read is loading or hidden', () => {
    for (const step of ['loading', 'hidden']) {
      mockUseOnboarding.mockReturnValue({ state: { step } });

      const view = renderGate();

      expect(view.queryByTestId('demo-modal')).toBeNull();
      view.unmount();
    }
  });
});
