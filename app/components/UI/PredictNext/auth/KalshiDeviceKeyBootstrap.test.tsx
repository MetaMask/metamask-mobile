import React from 'react';
import { View } from 'react-native';
import { render, waitFor } from '@testing-library/react-native';

import SecureKeychain from '../../../../core/SecureKeychain';
import { selectIsUnlocked } from '../../../../selectors/keyringController';
import type { PredictConfig } from '../config/predictConfig';
import { selectPredictConfig } from '../selectors/predictConfig';
import { KalshiDeviceKeyBootstrap } from './KalshiDeviceKeyBootstrap';
import { clearKalshiDeviceKey, getKalshiDeviceKey } from './kalshiDeviceKey';

jest.mock('../../../../core/SecureKeychain', () => ({
  setSecureItem: jest.fn(),
  getSecureItem: jest.fn(),
  clearSecureScope: jest.fn(),
  ACCESSIBLE: {
    WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY',
  },
}));

jest.mock('react-redux', () => ({
  useSelector: (selector: (state: unknown) => unknown) => selector(undefined),
}));

jest.mock('../selectors/predictConfig', () => ({
  selectPredictConfig: jest.fn(),
}));

jest.mock('../../../../selectors/keyringController', () => ({
  selectIsUnlocked: jest.fn(),
}));

const selectPredictConfigMock = selectPredictConfig as unknown as jest.Mock<
  PredictConfig,
  [unknown]
>;
const selectIsUnlockedMock = selectIsUnlocked as unknown as jest.Mock<
  boolean,
  [unknown]
>;

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
    polymarket: { enabled: true },
    kalshi: { enabled: false },
  },
};

describe('KalshiDeviceKeyBootstrap', () => {
  let saved: string | null;

  beforeEach(() => {
    saved = null;
    selectPredictConfigMock.mockReturnValue(enabledConfig);
    selectIsUnlockedMock.mockReturnValue(true);
    (SecureKeychain.getSecureItem as jest.Mock).mockImplementation(async () =>
      saved === null ? null : { key: 'kalshi-device-key', value: saved },
    );
    (SecureKeychain.setSecureItem as jest.Mock).mockImplementation(
      async (_key: string, value: string) => {
        saved = value;
        return true;
      },
    );
    (SecureKeychain.clearSecureScope as jest.Mock).mockResolvedValue(true);
  });

  afterEach(() => {
    clearKalshiDeviceKey();
    selectPredictConfigMock.mockReset();
    selectIsUnlockedMock.mockReset();
  });

  it('creates a device key when Kalshi is enabled and the wallet is unlocked', async () => {
    const view = render(
      <KalshiDeviceKeyBootstrap>
        <View testID="kalshi-child" />
      </KalshiDeviceKeyBootstrap>,
    );

    expect(view.getByTestId('kalshi-child')).toBeOnTheScreen();
    await waitFor(() => {
      expect(getKalshiDeviceKey()?.publicRaw[0]).toBe(0x04);
    });
  });

  it('drops plaintext when the wallet locks and reloads the same key on unlock', async () => {
    const view = render(
      <KalshiDeviceKeyBootstrap>
        <View testID="kalshi-child" />
      </KalshiDeviceKeyBootstrap>,
    );
    await waitFor(() => {
      expect(getKalshiDeviceKey()).not.toBeNull();
    });
    const publicKey = getKalshiDeviceKey()?.publicKey;

    selectIsUnlockedMock.mockReturnValue(false);
    view.rerender(
      <KalshiDeviceKeyBootstrap>
        <View testID="kalshi-child" />
      </KalshiDeviceKeyBootstrap>,
    );

    await waitFor(() => {
      expect(getKalshiDeviceKey()).toBeNull();
    });
    expect(SecureKeychain.clearSecureScope).not.toHaveBeenCalled();

    selectIsUnlockedMock.mockReturnValue(true);
    view.rerender(
      <KalshiDeviceKeyBootstrap>
        <View testID="kalshi-child" />
      </KalshiDeviceKeyBootstrap>,
    );

    await waitFor(() => {
      expect(getKalshiDeviceKey()?.publicKey).toBe(publicKey);
    });
  });

  it('keeps the loaded key when predict config is a new object with Kalshi still enabled', async () => {
    const view = render(
      <KalshiDeviceKeyBootstrap>
        <View testID="kalshi-child" />
      </KalshiDeviceKeyBootstrap>,
    );
    await waitFor(() => {
      expect(getKalshiDeviceKey()).not.toBeNull();
    });
    const publicKey = getKalshiDeviceKey()?.publicKey;

    selectPredictConfigMock.mockReturnValue({
      ...enabledConfig,
      venues: {
        polymarket: { enabled: false },
        kalshi: { enabled: true },
      },
    });
    view.rerender(
      <KalshiDeviceKeyBootstrap>
        <View testID="kalshi-child" />
      </KalshiDeviceKeyBootstrap>,
    );

    expect(getKalshiDeviceKey()?.publicKey).toBe(publicKey);
  });

  it('drops plaintext when Kalshi is turned off and keeps the encrypted key', async () => {
    const view = render(
      <KalshiDeviceKeyBootstrap>
        <View testID="kalshi-child" />
      </KalshiDeviceKeyBootstrap>,
    );
    await waitFor(() => {
      expect(getKalshiDeviceKey()).not.toBeNull();
    });

    selectPredictConfigMock.mockReturnValue(disabledConfig);
    view.rerender(
      <KalshiDeviceKeyBootstrap>
        <View testID="kalshi-child" />
      </KalshiDeviceKeyBootstrap>,
    );

    await waitFor(() => {
      expect(getKalshiDeviceKey()).toBeNull();
    });
    expect(view.getByTestId('kalshi-child')).toBeOnTheScreen();
    expect(SecureKeychain.clearSecureScope).not.toHaveBeenCalled();
    expect(saved).not.toBeNull();
  });
});
