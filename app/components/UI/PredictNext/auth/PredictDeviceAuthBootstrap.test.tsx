import React from 'react';
import { render, waitFor } from '@testing-library/react-native';

import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';
import {
  PredictDeviceAuthBootstrap,
  shouldPrefetchA2t,
} from './PredictDeviceAuthBootstrap';
import { A2tSessionClearedError } from './a2tSession';

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
  useNetworkTier: () => 'WIFI',
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

describe('PredictDeviceAuthBootstrap', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockSelectors = ({
    signedIn = true,
    unlocked = true,
    enabled = true,
  }: {
    signedIn?: boolean;
    unlocked?: boolean;
    enabled?: boolean;
  } = {}) => {
    mockUseSelector
      .mockReturnValueOnce(signedIn)
      .mockReturnValueOnce(unlocked)
      .mockReturnValueOnce({
        enabled,
        venues: {
          kalshi: { enabled },
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

  it('does not prepare credentials while Kalshi is disabled', () => {
    mockSelectors({ enabled: false });

    render(
      <PredictDeviceAuthBootstrap>
        <></>
      </PredictDeviceAuthBootstrap>,
    );

    expect(Engine.controllerMessenger.call).not.toHaveBeenCalled();
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
