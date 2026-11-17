import React from 'react';
import { render, RenderResult, waitFor } from '@testing-library/react-native';
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
import AppShellEffects from './AppShellEffects';

/**
 * AppShellEffects renders nothing. The contract is that the OTA hook, the
 * seedless password check, and the app version bookkeeping run on mount. A
 * component-view test drives visible UI and does not observe these calls.
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

const renderEffects = ({ existingUser = false } = {}): RenderResult => {
  const store = configureMockStore()({
    ...initialRootState,
    user: { ...initialRootState.user, existingUser },
  });

  return render(
    <Provider store={store}>
      <AppShellEffects />
    </Provider>,
  );
};

// The timer only matters when the awaited storage call never happens. On the
// passing path the promise settles on microtasks, before any timer can run.
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

const mockStoredVersions = ({
  current,
  last,
}: {
  current: string | null;
  last: string | null;
}): { afterLastVersionRead: () => Promise<void> } => {
  const lastVersionRead = Promise.resolve(last);
  const lastVersionRequested = storageCall<void>(
    `getItem(${LAST_APP_VERSION})`,
    (resolve) => {
      jest.mocked(StorageWrapper.getItem).mockImplementation((key: string) => {
        if (key === CURRENT_APP_VERSION) return Promise.resolve(current);
        if (key === LAST_APP_VERSION) {
          resolve();
          return lastVersionRead;
        }
        return Promise.resolve(null);
      });
    },
  );

  return {
    // The effect awaits the last-version read before the test does, so its
    // continuation (including any write) has run once this resolves.
    afterLastVersionRead: async (): Promise<void> => {
      await lastVersionRequested;
      await lastVersionRead;
    },
  };
};

// Await the exact write instead of polling with `waitFor`. A `waitFor` poll
// needs timer ticks to finish, so if the worker's event loop stalls past
// Jest's 5s deadline, the expired test timeout fires before the poll can pass.
const nextWrite = (key: string): Promise<string> =>
  storageCall<string>(`setItem(${key})`, (resolve) => {
    jest
      .mocked(StorageWrapper.setItem)
      .mockImplementation(
        async (writtenKey: string, value: string): Promise<void> => {
          if (writtenKey === key) resolve(value);
        },
      );
  });

describe('AppShellEffects', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .mocked(Authentication.checkIsSeedlessPasswordOutdated)
      .mockResolvedValue(false);
    jest.mocked(selectSeedlessOnboardingLoginFlow).mockReturnValue(true);
  });

  it('runs the OTA hook and the seedless password check on mount', async () => {
    renderEffects();

    expect(useOTAUpdates).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(
        Authentication.checkIsSeedlessPasswordOutdated,
      ).toHaveBeenCalledWith({
        skipCache: true,
        captureSentryError: false,
      });
    });
  });

  describe('app version storage', () => {
    it('saves last and current version when currentVersion differs from savedVersion', async () => {
      mockStoredVersions({ current: '0.9.0', last: '0.8.0' });
      const currentVersionWritten = nextWrite(CURRENT_APP_VERSION);

      renderEffects();

      expect(await currentVersionWritten).toBe('1.0.0');
      expect(StorageWrapper.setItem).toHaveBeenCalledWith(
        LAST_APP_VERSION,
        '0.9.0',
      );
    });

    it('saves only current version when savedVersion is null', async () => {
      mockStoredVersions({ current: null, last: null });
      const lastVersionWritten = nextWrite(LAST_APP_VERSION);

      renderEffects();

      expect(await lastVersionWritten).toBe('1.0.0');
      expect(StorageWrapper.setItem).toHaveBeenCalledWith(
        CURRENT_APP_VERSION,
        '1.0.0',
      );
    });

    it('sets lastVersion to 0.0.1 when existingUser is true and lastVersion is missing', async () => {
      mockStoredVersions({ current: '1.0.0', last: null });
      const lastVersionWritten = nextWrite(LAST_APP_VERSION);

      renderEffects({ existingUser: true });

      expect(await lastVersionWritten).toBe('0.0.1');
      expect(StorageWrapper.setItem).toHaveBeenCalledTimes(1);
    });

    it('sets lastVersion to currentVersion when existingUser is false and lastVersion is missing', async () => {
      mockStoredVersions({ current: '1.0.0', last: null });
      const lastVersionWritten = nextWrite(LAST_APP_VERSION);

      renderEffects({ existingUser: false });

      expect(await lastVersionWritten).toBe('1.0.0');
      expect(StorageWrapper.setItem).toHaveBeenCalledTimes(1);
    });

    it('does not overwrite versions when currentVersion matches savedVersion', async () => {
      const storage = mockStoredVersions({ current: '1.0.0', last: '0.9.0' });

      renderEffects();
      await storage.afterLastVersionRead();

      expect(StorageWrapper.getItem).toHaveBeenCalledWith(LAST_APP_VERSION);
      expect(StorageWrapper.setItem).not.toHaveBeenCalled();
    });
  });
});
