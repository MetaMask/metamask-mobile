import React from 'react';
import { AppState } from 'react-native';
import { render, waitFor } from '@testing-library/react-native';

import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';
import { useNetworkTier } from '../../../../hooks/useNetworkTier';
import {
  PredictDeviceAuthBootstrap,
  canRefreshVenueProfiles,
  shouldPrefetchA2t,
} from './PredictDeviceAuthBootstrap';
import { A2tSessionClearedError } from './a2tSession';
import { refreshVenueProfile } from './venueSigningProfiles';

const mockUseSelector = jest.fn();

jest.mock('../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    controllerMessenger: {
      call: jest.fn(),
    },
  },
}));

jest.mock('react-redux', () => ({
  useSelector: (...args: unknown[]) => mockUseSelector(...args),
}));

jest.mock('../../../../hooks/useNetworkTier', () => ({
  useNetworkTier: jest.fn(() => 'WIFI'),
}));

jest.mock('./venueSigningProfiles', () => ({
  refreshVenueProfile: jest.fn(),
}));

jest.mock('../../../../util/deviceCapability', () => ({
  getHardwareTier: () => 'HIGH',
}));

describe('shouldPrefetchA2t', () => {
  it.each([
    ['LOW', 'NONE', false],
    ['LOW', 'SLOW_CELLULAR', false],
    ['LOW', 'FAST_CELLULAR', false],
    ['LOW', 'WIFI', false],
    ['LOW', null, true],
    ['MID', 'NONE', false],
    ['MID', 'SLOW_CELLULAR', false],
    ['MID', 'FAST_CELLULAR', true],
    ['MID', 'WIFI', true],
    ['MID', null, true],
    ['HIGH', 'NONE', false],
    ['HIGH', 'SLOW_CELLULAR', false],
    ['HIGH', 'FAST_CELLULAR', true],
    ['HIGH', 'WIFI', true],
    ['HIGH', null, true],
    [null, 'NONE', false],
    [null, 'SLOW_CELLULAR', false],
    [null, 'FAST_CELLULAR', true],
    [null, 'WIFI', true],
    [null, null, true],
  ] as const)(
    'hardware %s and network %s returns %s',
    (hardwareTier, networkTier, expected) => {
      expect(shouldPrefetchA2t(hardwareTier, networkTier)).toBe(expected);
    },
  );
});

describe('canRefreshVenueProfiles', () => {
  it.each([
    ['NONE', false],
    [null, true],
    ['WIFI', true],
    ['SLOW_CELLULAR', true],
    ['FAST_CELLULAR', true],
  ] as const)('network %s returns %s', (networkTier, expected) => {
    expect(canRefreshVenueProfiles(networkTier)).toBe(expected);
  });
});

describe('PredictDeviceAuthBootstrap', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useNetworkTier).mockReturnValue('WIFI');
    jest.mocked(refreshVenueProfile).mockResolvedValue(undefined);
    jest.mocked(Engine.controllerMessenger.call).mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const mockSelectors = ({
    signedIn = true,
    unlocked = true,
    predictEnabled = true,
    kalshiEnabled = true,
  }: {
    signedIn?: boolean;
    unlocked?: boolean;
    predictEnabled?: boolean;
    kalshiEnabled?: boolean;
  } = {}) => {
    mockUseSelector
      .mockReturnValueOnce(signedIn)
      .mockReturnValueOnce(unlocked)
      .mockReturnValueOnce({
        enabled: predictEnabled,
        venues: {
          kalshi: { enabled: kalshiEnabled, authProfileId: 'kalshi-a2t-v1' },
          polymarket: { enabled: false },
        },
        venueSelection: { enabled: false },
      });
  };

  it('starts non-blocking A2T prefetch when the wallet is ready', async () => {
    mockSelectors();
    jest.mocked(Engine.controllerMessenger.call).mockResolvedValue(undefined);

    const result = render(
      <PredictDeviceAuthBootstrap>
        <></>
      </PredictDeviceAuthBootstrap>,
    );

    await waitFor(() => {
      expect(Engine.controllerMessenger.call).toHaveBeenCalledWith(
        'PredictDeviceAuthService:prefetch',
        true,
      );
    });
    result.unmount();
    expect(Engine.controllerMessenger.call).toHaveBeenCalledTimes(1);
  });

  it('does not log expected session cancellation', async () => {
    mockSelectors();
    jest
      .mocked(Engine.controllerMessenger.call)
      .mockRejectedValue(new A2tSessionClearedError());
    const loggerSpy = jest
      .spyOn(Logger, 'error')
      .mockImplementation(() => undefined);

    render(
      <PredictDeviceAuthBootstrap>
        <></>
      </PredictDeviceAuthBootstrap>,
    );

    await waitFor(() => {
      expect(Engine.controllerMessenger.call).toHaveBeenCalled();
    });
    await Promise.resolve();
    expect(loggerSpy).not.toHaveBeenCalled();
  });

  it('does not log issuer error details', async () => {
    mockSelectors();
    jest
      .mocked(Engine.controllerMessenger.call)
      .mockRejectedValue(new Error('sensitive issuer response'));
    const loggerSpy = jest
      .spyOn(Logger, 'error')
      .mockImplementation(() => undefined);

    render(
      <PredictDeviceAuthBootstrap>
        <></>
      </PredictDeviceAuthBootstrap>,
    );

    await waitFor(() => {
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Predict device authentication prefetch failed',
        }),
        'Predict device authentication prefetch failed',
      );
    });
    expect(JSON.stringify(loggerSpy.mock.calls)).not.toContain(
      'sensitive issuer response',
    );
  });

  it('does not prepare credentials while the wallet is locked', () => {
    mockSelectors({ unlocked: false });

    render(
      <PredictDeviceAuthBootstrap>
        <></>
      </PredictDeviceAuthBootstrap>,
    );

    expect(Engine.controllerMessenger.call).not.toHaveBeenCalled();
  });

  it('does not prepare credentials while PredictNext is disabled', () => {
    mockSelectors({ predictEnabled: false, kalshiEnabled: true });

    render(
      <PredictDeviceAuthBootstrap>
        <></>
      </PredictDeviceAuthBootstrap>,
    );

    expect(Engine.controllerMessenger.call).not.toHaveBeenCalled();
  });

  it('prepares credentials when PredictNext is enabled and Kalshi is disabled', async () => {
    mockSelectors({ kalshiEnabled: false });
    jest.mocked(Engine.controllerMessenger.call).mockResolvedValue(undefined);

    render(
      <PredictDeviceAuthBootstrap>
        <></>
      </PredictDeviceAuthBootstrap>,
    );

    await waitFor(() => {
      expect(Engine.controllerMessenger.call).toHaveBeenCalledWith(
        'PredictDeviceAuthService:prefetch',
        true,
      );
    });
  });

  it('refreshes the venue profile once on entry when unlocked and enabled', async () => {
    mockSelectors();
    jest.mocked(Engine.controllerMessenger.call).mockResolvedValue(undefined);

    const result = render(
      <PredictDeviceAuthBootstrap>
        <></>
      </PredictDeviceAuthBootstrap>,
    );

    await waitFor(() => {
      expect(refreshVenueProfile).toHaveBeenCalledTimes(1);
      expect(refreshVenueProfile).toHaveBeenCalledWith(true);
    });
    result.unmount();
  });

  it('does not refresh while offline, locked, or disabled', () => {
    mockSelectors();
    jest.mocked(useNetworkTier).mockReturnValue('NONE');
    const offline = render(
      <PredictDeviceAuthBootstrap>
        <></>
      </PredictDeviceAuthBootstrap>,
    );
    expect(refreshVenueProfile).not.toHaveBeenCalled();
    offline.unmount();

    jest.mocked(useNetworkTier).mockReturnValue('WIFI');
    mockSelectors({ unlocked: false });
    const locked = render(
      <PredictDeviceAuthBootstrap>
        <></>
      </PredictDeviceAuthBootstrap>,
    );
    expect(refreshVenueProfile).not.toHaveBeenCalled();
    locked.unmount();

    mockSelectors({ predictEnabled: false });
    const disabled = render(
      <PredictDeviceAuthBootstrap>
        <></>
      </PredictDeviceAuthBootstrap>,
    );
    expect(refreshVenueProfile).not.toHaveBeenCalled();
    disabled.unmount();
  });

  it('refreshes when the app returns to the foreground and removes the listener', async () => {
    mockSelectors();
    jest.mocked(Engine.controllerMessenger.call).mockResolvedValue(undefined);
    const remove = jest.fn();
    const addEventListener = jest
      .spyOn(AppState, 'addEventListener')
      .mockReturnValue({ remove });

    const result = render(
      <PredictDeviceAuthBootstrap>
        <></>
      </PredictDeviceAuthBootstrap>,
    );
    await waitFor(() => {
      expect(refreshVenueProfile).toHaveBeenCalledTimes(1);
    });
    const listener = addEventListener.mock.calls[0][1];
    listener('background');
    expect(refreshVenueProfile).toHaveBeenCalledTimes(1);
    listener('active');
    await waitFor(() => {
      expect(refreshVenueProfile).toHaveBeenCalledTimes(2);
      expect(refreshVenueProfile).toHaveBeenLastCalledWith();
    });

    result.unmount();
    expect(remove).toHaveBeenCalledTimes(1);
  });

  it('prepares only the local key while signed out', async () => {
    mockSelectors({ signedIn: false });
    jest.mocked(Engine.controllerMessenger.call).mockResolvedValue(undefined);

    render(
      <PredictDeviceAuthBootstrap>
        <></>
      </PredictDeviceAuthBootstrap>,
    );

    await waitFor(() => {
      expect(Engine.controllerMessenger.call).toHaveBeenCalledWith(
        'PredictDeviceAuthService:prefetch',
        false,
      );
    });
  });
});
