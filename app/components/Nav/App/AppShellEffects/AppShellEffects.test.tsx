import React from 'react';
import { act, render } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';

import { Authentication } from '../../../../core';
import {
  CURRENT_APP_VERSION,
  LAST_APP_VERSION,
} from '../../../../constants/storage';
import { useOTAUpdates } from '../../../hooks/useOTAUpdates';
import { selectSeedlessOnboardingLoginFlow } from '../../../../selectors/seedlessOnboardingController';
import StorageWrapper from '../../../../store/storage-wrapper';
import initialRootState from '../../../../util/test/initial-root-state';
import Logger from '../../../../util/Logger';
import AppShellEffects from './AppShellEffects';

/**
 * AppShellEffects renders nothing. The contract is that the OTA hook, the
 * seedless password check, and version storage run on mount. A component-view
 * test drives visible UI and does not observe these calls.
 *
 * Version storage is covered here, not by rendering App. App mounts this
 * component after the full route tree, and that mount exceeds Jest's 5s test
 * timeout on a slow unit shard.
 *
 * Cases that write a version await that exact `setItem` call. `waitFor` can
 * only pass on a timer tick, so a worker whose event loop stalls past Jest's
 * 5s deadline fails the test even after the write has already happened.
 */

jest.mock('../../../hooks/useOTAUpdates', () => ({
  useOTAUpdates: jest.fn(),
}));

jest.mock('../../../../core', () => ({
  Authentication: {
    checkIsSeedlessPasswordOutdated: jest.fn(() => Promise.resolve()),
  },
}));

jest.mock('../../../../selectors/seedlessOnboardingController', () => ({
  selectSeedlessOnboardingLoginFlow: jest.fn(),
}));

jest.mock('../../../../util/Logger', () => ({
  log: jest.fn(),
  error: jest.fn(),
}));

jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn(() => '1.0.0'),
}));

jest.mock('../../../../store/storage-wrapper', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn().mockResolvedValue('1.0.0'),
    setItem: jest.fn().mockResolvedValue(undefined),
  },
}));

const mockGetItem = jest.mocked(StorageWrapper.getItem);
const mockSetItem = jest.mocked(StorageWrapper.setItem);

const renderEffects = (existingUser = false): ReturnType<typeof render> => {
  const store = configureMockStore()({
    ...initialRootState,
    user: {
      ...initialRootState.user,
      existingUser,
    },
  });

  return render(
    <Provider store={store}>
      <AppShellEffects />
    </Provider>,
  );
};

// startApp awaits StorageWrapper several times. Each mocked call resolves on a
// later microtask, so one Promise.resolve() stops before the effect finishes.
// Used for cases that do not write, where there is no setItem call to await.
const settleStartApp = async (): Promise<void> => {
  await act(async () => {
    for (let step = 0; step < 20; step += 1) {
      await Promise.resolve();
    }
  });
};

// The timer only matters when the awaited write never happens. On the passing
// path the promise settles on microtasks, before any timer can run.
const storageCall = <Value,>(
  description: string,
  register: (resolve: (value: Value) => void) => void,
): Promise<Value> =>
  new Promise<Value>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Timed out waiting for ${description}`)),
      1000,
    );
    register((value) => {
      clearTimeout(timer);
      resolve(value);
    });
  });

const nextWrite = (key: string): Promise<string> =>
  storageCall<string>(`setItem(${key})`, (resolve) => {
    mockSetItem.mockImplementation(
      async (writtenKey: string, value: string): Promise<void> => {
        if (writtenKey === key) resolve(value);
      },
    );
  });

describe('AppShellEffects', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetItem.mockResolvedValue('1.0.0');
    mockSetItem.mockResolvedValue(undefined);
    jest
      .mocked(Authentication.checkIsSeedlessPasswordOutdated)
      .mockResolvedValue(false);
    jest.mocked(selectSeedlessOnboardingLoginFlow).mockReturnValue(true);
  });

  it('runs the OTA hook and the seedless password check on mount', async () => {
    renderEffects();

    expect(useOTAUpdates).toHaveBeenCalledTimes(1);

    await settleStartApp();

    expect(Authentication.checkIsSeedlessPasswordOutdated).toHaveBeenCalledWith(
      {
        skipCache: true,
        captureSentryError: false,
      },
    );
  });

  describe('version storage', () => {
    it('reads the saved app version on mount', async () => {
      mockGetItem.mockResolvedValue(null);

      renderEffects();
      await settleStartApp();

      expect(mockGetItem).toHaveBeenCalledWith(CURRENT_APP_VERSION);
    });

    it('logs storage errors from the version effect', async () => {
      const storageError = new Error('Storage error');
      mockGetItem.mockRejectedValue(storageError);

      renderEffects();
      await settleStartApp();

      expect(Logger.error).toHaveBeenCalledWith(storageError);
    });

    it('saves last and current version when currentVersion differs from savedVersion', async () => {
      mockGetItem.mockImplementation(async (key) => {
        if (key === CURRENT_APP_VERSION) {
          return '0.9.0';
        }
        if (key === LAST_APP_VERSION) {
          return '0.8.0';
        }
        return null;
      });
      const currentVersionWritten = nextWrite(CURRENT_APP_VERSION);

      renderEffects(false);

      expect(await currentVersionWritten).toBe('1.0.0');
      expect(mockSetItem).toHaveBeenCalledWith(LAST_APP_VERSION, '0.9.0');
    });

    it('saves only current version when savedVersion is null', async () => {
      mockGetItem.mockImplementation(async () => null);
      const lastVersionWritten = nextWrite(LAST_APP_VERSION);

      renderEffects(false);

      expect(await lastVersionWritten).toBe('1.0.0');
      expect(mockSetItem).toHaveBeenCalledWith(CURRENT_APP_VERSION, '1.0.0');
    });

    it('sets lastVersion to 0.0.1 when existingUser is true and lastVersion is missing', async () => {
      mockGetItem.mockImplementation(async (key) => {
        if (key === CURRENT_APP_VERSION) {
          return '1.0.0';
        }
        return null;
      });
      const lastVersionWritten = nextWrite(LAST_APP_VERSION);

      renderEffects(true);

      expect(await lastVersionWritten).toBe('0.0.1');
      expect(mockSetItem).toHaveBeenCalledTimes(1);
    });

    it('sets lastVersion to currentVersion when existingUser is false and lastVersion is missing', async () => {
      mockGetItem.mockImplementation(async (key) => {
        if (key === CURRENT_APP_VERSION) {
          return '1.0.0';
        }
        return null;
      });
      const lastVersionWritten = nextWrite(LAST_APP_VERSION);

      renderEffects(false);

      expect(await lastVersionWritten).toBe('1.0.0');
      expect(mockSetItem).toHaveBeenCalledTimes(1);
    });

    it('does not overwrite versions when currentVersion matches savedVersion', async () => {
      mockGetItem.mockImplementation(async (key) => {
        if (key === CURRENT_APP_VERSION) {
          return '1.0.0';
        }
        if (key === LAST_APP_VERSION) {
          return '0.9.0';
        }
        return null;
      });

      renderEffects(false);
      await settleStartApp();

      expect(mockGetItem).toHaveBeenCalledWith(LAST_APP_VERSION);
      expect(mockSetItem).not.toHaveBeenCalledWith(
        CURRENT_APP_VERSION,
        expect.anything(),
      );
      expect(mockSetItem).not.toHaveBeenCalledWith(
        LAST_APP_VERSION,
        expect.anything(),
      );
    });
  });
});
