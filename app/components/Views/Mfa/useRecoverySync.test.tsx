import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { act, render, screen } from '@testing-library/react-native';
import {
  removePasskeyFromRecovery,
  syncRecoveryAfterEnroll,
} from '../../../core/MfaRecovery/syncRecoveryIdentifiers';
import { mobileMfaControllerAdapter } from '../../../util/identity/mfa/bindings';
import type {
  MfaFlowResult,
  MfaReason,
} from '../../../util/identity/mfa/engine/types';
import Logger from '../../../util/Logger';
import { RECOVERY_SETUP_PROGRESS_TEST_IDS } from '../shared/RecoverySetupProgressBottomSheet';
import useRecoverySync from './useRecoverySync';

jest.mock('../../../core/MfaRecovery/syncRecoveryIdentifiers', () => ({
  syncRecoveryAfterEnroll: jest.fn(),
  removePasskeyFromRecovery: jest.fn(),
}));

jest.mock('../../../util/identity/mfa/bindings', () => ({
  mobileMfaControllerAdapter: {
    getVerificationToken: jest.fn(),
  },
}));

const mockVerifyOrEnroll = jest.fn();
jest.mock('../../../util/identity/mfa', () => ({
  useMfa: (): { verifyOrEnroll: typeof mockVerifyOrEnroll } => ({
    verifyOrEnroll: mockVerifyOrEnroll,
  }),
}));

const mockUseSelector = jest.fn();
jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: (selector: unknown): unknown => mockUseSelector(selector),
}));

jest.mock('../../../selectors/featureFlagController/mfaRecovery', () => ({
  selectMfaRecoveryEnabled: jest.fn(),
}));

type SyncOptions = Parameters<typeof syncRecoveryAfterEnroll>[1];
type RemoveOptions = Parameters<typeof removePasskeyFromRecovery>[1];
type RecoverySync = ReturnType<typeof useRecoverySync>;

const mockSync = jest.mocked(syncRecoveryAfterEnroll);
const mockRemoveFromRecovery = jest.mocked(removePasskeyFromRecovery);
const mockGetVerificationToken = jest.mocked(
  mobileMfaControllerAdapter.getVerificationToken,
);
const REASON: MfaReason = { operation: 'settings.addPasskey' };
const FLOW_RESULT: MfaFlowResult = { credentials: [] };
const ACTIVE_SESSION = {
  accessToken: 'token',
  expiresIn: 900,
  obtainedAt: 1_000,
  claims: { sub: 'profile', amr: ['passkey'], exp: 1_900 },
};
const MODAL_SETTLE_MS = 300;

interface Deferred<Value> {
  promise: Promise<Value>;
  resolve: (value: Value) => void;
  reject: (error: Error) => void;
}

const deferred = <Value = void,>(): Deferred<Value> => {
  let resolve: (value: Value) => void = () => undefined;
  let reject: (error: Error) => void = () => undefined;
  const promise = new Promise<Value>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

const Harness = ({
  onReady,
}: {
  onReady: (recoverySync: RecoverySync) => void;
}): React.JSX.Element => {
  const recoverySync = useRecoverySync();
  useEffect(() => {
    onReady(recoverySync);
  }, [onReady, recoverySync]);
  return <>{recoverySync.recoverySheets}</>;
};

const renderRecoverySync = (): ReturnType<typeof render> & {
  startSync: () => Promise<void>;
  startRemove: (verifyMfa?: () => Promise<unknown>) => Promise<void>;
} => {
  let recoverySync: RecoverySync | undefined;
  const utils = render(
    <Harness
      onReady={(next) => {
        recoverySync = next;
      }}
    />,
  );
  const startSync = async (): Promise<void> => {
    let result: Promise<void> = Promise.resolve();
    act(() => {
      result =
        recoverySync?.syncRecovery('passkey', REASON) ?? Promise.resolve();
    });
    return result;
  };
  const startRemove = async (
    verifyMfa: () => Promise<unknown> = jest.fn(),
  ): Promise<void> => {
    let result: Promise<void> = Promise.resolve();
    act(() => {
      result =
        recoverySync?.removeRecoveryPasskey('credential', verifyMfa) ??
        Promise.resolve();
    });
    return result;
  };
  return { ...utils, startSync, startRemove };
};

const flush = async (): Promise<void> => act(async () => undefined);
const advance = async (ms: number): Promise<void> =>
  act(async () => {
    await jest.advanceTimersByTimeAsync(ms);
  });

const progressSheet = (): ReturnType<typeof screen.queryByTestId> =>
  screen.queryByTestId(RECOVERY_SETUP_PROGRESS_TEST_IDS.SHEET);

describe('useRecoverySync', () => {
  const originalOS = Platform.OS;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockUseSelector.mockReturnValue(true);
    mockGetVerificationToken.mockResolvedValue(null);
  });

  afterEach(() => {
    Platform.OS = originalOS;
    jest.useRealTimers();
  });

  it('shows the progress sheet while the sync is pending', async () => {
    const sync = deferred();
    mockSync.mockReturnValue(sync.promise);
    const { startSync } = renderRecoverySync();

    const result = startSync();

    expect(progressSheet()).toBeNull();
    await advance(MODAL_SETTLE_MS);
    expect(progressSheet()).toBeOnTheScreen();
    await act(async () => {
      sync.resolve();
      await result;
    });
    expect(progressSheet()).toBeNull();
  });

  it('does not show the progress sheet when the sync finishes before modals settle on iOS', async () => {
    const sync = deferred();
    mockSync.mockReturnValue(sync.promise);
    const { startSync } = renderRecoverySync();

    const result = startSync();
    await act(async () => {
      sync.resolve();
      await result;
    });
    await advance(MODAL_SETTLE_MS);

    expect(progressSheet()).toBeNull();
  });

  it('removes the progress sheet and logs when the sync fails', async () => {
    const errorSpy = jest
      .spyOn(Logger, 'error')
      .mockImplementation(() => undefined);
    const sync = deferred();
    mockSync.mockReturnValue(sync.promise);
    const { startSync } = renderRecoverySync();
    const result = startSync();

    const syncError = new Error('sync failed');
    await act(async () => {
      sync.reject(syncError);
      await result;
    });

    expect(errorSpy).toHaveBeenCalledWith(syncError, {
      tags: { feature: 'mfa', operation: REASON.operation },
    });
    expect(progressSheet()).toBeNull();
    errorSpy.mockRestore();
  });

  it('hides the progress sheet while verifying and restores it afterwards', async () => {
    const verify = deferred<MfaFlowResult>();
    const finish = deferred();
    mockVerifyOrEnroll.mockReturnValue(verify.promise);
    mockSync.mockImplementation(async (_method, options: SyncOptions) => {
      await options.verifyMfa();
      await finish.promise;
    });
    const { startSync } = renderRecoverySync();

    void startSync();
    await flush();
    expect(progressSheet()).toBeNull();
    expect(mockVerifyOrEnroll).not.toHaveBeenCalled();
    await advance(MODAL_SETTLE_MS);
    expect(mockVerifyOrEnroll).toHaveBeenCalledWith({
      methods: ['passkey'],
      verifyWith: ['passkey'],
      reason: REASON,
    });
    expect(progressSheet()).toBeNull();
    await act(async () => verify.resolve(FLOW_RESULT));
    expect(progressSheet()).toBeNull();
    await advance(MODAL_SETTLE_MS);

    expect(progressSheet()).toBeOnTheScreen();
  });

  it('keeps the progress sheet visible and skips verification when a session is active', async () => {
    mockGetVerificationToken.mockResolvedValue(ACTIVE_SESSION);
    const finish = deferred();
    let verifyDone = false;
    mockSync.mockImplementation(async (_method, options: SyncOptions) => {
      await options.verifyMfa();
      verifyDone = true;
      await finish.promise;
    });
    const { startSync } = renderRecoverySync();

    void startSync();
    await flush();
    await advance(MODAL_SETTLE_MS);

    expect(verifyDone).toBe(true);
    expect(mockVerifyOrEnroll).not.toHaveBeenCalled();
    expect(progressSheet()).toBeOnTheScreen();
  });

  it('verifies without waiting for modals to settle on Android', async () => {
    Platform.OS = 'android';
    const finish = deferred();
    mockVerifyOrEnroll.mockResolvedValue(FLOW_RESULT);
    mockSync.mockImplementation(async (_method, options: SyncOptions) => {
      await options.verifyMfa();
      await finish.promise;
    });
    const { startSync } = renderRecoverySync();

    void startSync();
    await flush();

    expect(mockVerifyOrEnroll).toHaveBeenCalledTimes(1);
    expect(progressSheet()).toBeOnTheScreen();
  });

  it('shows the update sheet while a passkey is removed from recovery', async () => {
    const removal = deferred();
    mockRemoveFromRecovery.mockReturnValue(removal.promise);
    const { startRemove } = renderRecoverySync();

    const result = startRemove();

    expect(mockRemoveFromRecovery).toHaveBeenCalledWith(
      'credential',
      expect.objectContaining({ verifyMfa: expect.any(Function) }),
    );
    await advance(MODAL_SETTLE_MS);
    expect(progressSheet()).toBeOnTheScreen();
    expect(screen.getByText('Updating recovery')).toBeOnTheScreen();
    await act(async () => {
      removal.resolve();
      await result;
    });
    expect(progressSheet()).toBeNull();
  });

  it('hides the update sheet while verifying for the removal', async () => {
    const verify = deferred();
    const verifyMfa = jest.fn(async () => verify.promise);
    const finish = deferred();
    mockRemoveFromRecovery.mockImplementation(
      async (_credentialId, options: RemoveOptions) => {
        await options.verifyMfa();
        await finish.promise;
      },
    );
    const { startRemove } = renderRecoverySync();

    void startRemove(verifyMfa);
    await flush();
    expect(progressSheet()).toBeNull();
    await advance(MODAL_SETTLE_MS);
    expect(verifyMfa).toHaveBeenCalledTimes(1);
    await act(async () => verify.resolve());
    await advance(MODAL_SETTLE_MS);

    expect(progressSheet()).toBeOnTheScreen();
  });

  it('keeps the update sheet visible and skips verification when a session is active', async () => {
    mockGetVerificationToken.mockResolvedValue(ACTIVE_SESSION);
    const verifyMfa = jest.fn();
    const finish = deferred();
    let verifyDone = false;
    mockRemoveFromRecovery.mockImplementation(
      async (_credentialId, options: RemoveOptions) => {
        await options.verifyMfa();
        verifyDone = true;
        await finish.promise;
      },
    );
    const { startRemove } = renderRecoverySync();

    void startRemove(verifyMfa);
    await flush();
    await advance(MODAL_SETTLE_MS);

    expect(verifyDone).toBe(true);
    expect(verifyMfa).not.toHaveBeenCalled();
    expect(progressSheet()).toBeOnTheScreen();
  });

  it('removes the update sheet and rejects when the removal fails', async () => {
    const removal = deferred();
    mockRemoveFromRecovery.mockReturnValue(removal.promise);
    const { startRemove } = renderRecoverySync();
    const result = startRemove();
    result.catch(() => undefined);

    await act(async () => {
      removal.reject(new Error('remove failed'));
    });

    await expect(result).rejects.toThrow('remove failed');
    expect(progressSheet()).toBeNull();
  });

  it('shows the setup title again for a sync after a removal', async () => {
    mockRemoveFromRecovery.mockResolvedValue(undefined);
    const sync = deferred();
    mockSync.mockReturnValue(sync.promise);
    const { startRemove, startSync } = renderRecoverySync();
    await act(async () => {
      await startRemove();
    });

    void startSync();
    await advance(MODAL_SETTLE_MS);

    expect(screen.getByText('Setting up recovery')).toBeOnTheScreen();
    await act(async () => sync.resolve());
  });

  describe('when the mfaRecovery flag is off', () => {
    beforeEach(() => {
      mockUseSelector.mockReturnValue(false);
    });

    it('does not run recovery sync', async () => {
      const { startSync } = renderRecoverySync();

      await startSync();

      expect(mockSync).not.toHaveBeenCalled();
      expect(mockVerifyOrEnroll).not.toHaveBeenCalled();
      expect(progressSheet()).toBeNull();
    });

    it('does not remove the passkey from recovery', async () => {
      const verifyMfa = jest.fn();
      const { startRemove } = renderRecoverySync();

      await startRemove(verifyMfa);

      expect(mockRemoveFromRecovery).not.toHaveBeenCalled();
      expect(verifyMfa).not.toHaveBeenCalled();
      expect(progressSheet()).toBeNull();
    });
  });
});
