import React from 'react';
import { View } from 'react-native';
import { render, waitFor } from '@testing-library/react-native';

import { selectIsSignedIn } from '../../../../selectors/identity';
import { selectIsUnlocked } from '../../../../selectors/keyringController';
import type { PredictConfig } from '../config/predictConfig';
import { selectPredictConfig } from '../selectors/predictConfig';
import { KalshiA2tSessionBootstrap } from './KalshiA2tSessionBootstrap';
import { a2tSession } from './a2tSessionInstance';

jest.mock('react-redux', () => ({
  useSelector: (selector: (state: unknown) => unknown) => selector(undefined),
}));

jest.mock('../../../../selectors/identity', () => ({
  selectIsSignedIn: jest.fn(),
}));

jest.mock('../../../../selectors/keyringController', () => ({
  selectIsUnlocked: jest.fn(),
}));

jest.mock('../selectors/predictConfig', () => ({
  selectPredictConfig: jest.fn(),
}));

jest.mock('./a2tSessionInstance', () => ({
  a2tSession: {
    ensureA2T: jest.fn(),
    clear: jest.fn(),
  },
}));

const selectIsSignedInMock = selectIsSignedIn as unknown as jest.Mock<
  boolean,
  [unknown]
>;
const selectIsUnlockedMock = selectIsUnlocked as unknown as jest.Mock<
  boolean,
  [unknown]
>;
const selectPredictConfigMock = selectPredictConfig as unknown as jest.Mock<
  PredictConfig,
  [unknown]
>;
const ensureA2TMock = a2tSession.ensureA2T as unknown as jest.Mock;
const clearMock = a2tSession.clear as unknown as jest.Mock;

const enabledConfig: PredictConfig = {
  enabled: true,
  venues: {
    polymarket: { enabled: false },
    kalshi: { enabled: true },
  },
  venueSelection: { enabled: false },
};

const disabledConfig: PredictConfig = {
  ...enabledConfig,
  venues: {
    ...enabledConfig.venues,
    kalshi: { enabled: false },
  },
};

describe('KalshiA2tSessionBootstrap', () => {
  beforeEach(() => {
    selectIsSignedInMock.mockReturnValue(true);
    selectIsUnlockedMock.mockReturnValue(true);
    selectPredictConfigMock.mockReturnValue(enabledConfig);
    ensureA2TMock.mockResolvedValue('a2t');
    clearMock.mockReset();
    ensureA2TMock.mockClear();
  });

  it('prefetches an A2T when signed in, unlocked, and Kalshi is enabled', async () => {
    render(
      <KalshiA2tSessionBootstrap>
        <View testID="predict-child" />
      </KalshiA2tSessionBootstrap>,
    );

    await waitFor(() => {
      expect(ensureA2TMock).toHaveBeenCalledTimes(1);
    });
    expect(clearMock).not.toHaveBeenCalled();
  });

  it('clears the session and does not prefetch when signed out', async () => {
    selectIsSignedInMock.mockReturnValue(false);

    render(
      <KalshiA2tSessionBootstrap>
        <View />
      </KalshiA2tSessionBootstrap>,
    );

    await waitFor(() => {
      expect(clearMock).toHaveBeenCalledTimes(1);
    });
    expect(ensureA2TMock).not.toHaveBeenCalled();
  });

  it('does not prefetch while the wallet is locked', async () => {
    selectIsUnlockedMock.mockReturnValue(false);

    render(
      <KalshiA2tSessionBootstrap>
        <View />
      </KalshiA2tSessionBootstrap>,
    );

    await waitFor(() => {
      expect(selectIsUnlockedMock).toHaveBeenCalled();
    });
    expect(ensureA2TMock).not.toHaveBeenCalled();
    expect(clearMock).not.toHaveBeenCalled();
  });

  it('clears the session when Kalshi is disabled', async () => {
    selectPredictConfigMock.mockReturnValue(disabledConfig);

    render(
      <KalshiA2tSessionBootstrap>
        <View />
      </KalshiA2tSessionBootstrap>,
    );

    await waitFor(() => {
      expect(clearMock).toHaveBeenCalledTimes(1);
    });
    expect(ensureA2TMock).not.toHaveBeenCalled();
  });
});
