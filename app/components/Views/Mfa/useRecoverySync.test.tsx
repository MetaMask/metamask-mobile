import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import {
  removePasskeyFromRecovery,
  syncRecoveryAfterEnroll,
} from '../../../core/MfaRecovery/syncRecoveryIdentifiers';
import { verifyOrEnroll } from '../../../util/identity/mfa/useMfa';
import type {
  MfaFlowResult,
  MfaReason,
} from '../../../util/identity/mfa/engine/types';
import { RECOVERY_SETUP_PROGRESS_TEST_IDS } from '../shared/RecoverySetupProgressBottomSheet';
import { SOCIAL_LINK_EMAIL_TEST_IDS } from '../shared/SocialLinkEmailBottomSheet';
import useRecoverySync from './useRecoverySync';

jest.mock('../../../core/MfaRecovery/syncRecoveryIdentifiers', () => ({
  syncRecoveryAfterEnroll: jest.fn(),
  removePasskeyFromRecovery: jest.fn(),
}));

jest.mock('../../../util/identity/mfa/useMfa', () => ({
  verifyOrEnroll: jest.fn(),
}));

const mockIsMfaDevBuild = jest.fn(() => false);
jest.mock('../../../util/identity/mfa/isMfaDevBuild', () => ({
  isMfaDevBuild: (): boolean => mockIsMfaDevBuild(),
}));

type SyncOptions = Parameters<typeof syncRecoveryAfterEnroll>[1];
type RemoveOptions = Parameters<typeof removePasskeyFromRecovery>[1];
type RecoverySync = ReturnType<typeof useRecoverySync>;

const mockSync = jest.mocked(syncRecoveryAfterEnroll);
const mockRemoveFromRecovery = jest.mocked(removePasskeyFromRecovery);
const mockVerifyOrEnroll = jest.mocked(verifyOrEnroll);
const REASON: MfaReason = { operation: 'settings.addPasskey' };
const FLOW_RESULT: MfaFlowResult = { credentials: [] };
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
  const startSync = (): Promise<void> => {
    let result: Promise<void> = Promise.resolve();
    act(() => {
      result =
        recoverySync?.syncRecovery('passkey', REASON) ?? Promise.resolve();
    });
    return result;
  };
  const startRemove = (
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

const flush = (): Promise<void> => act(async () => undefined);
const advance = (ms: number): Promise<void> =>
  act(async () => {
    await jest.advanceTimersByTimeAsync(ms);
  });

const progressSheet = (): ReturnType<typeof screen.queryByTestId> =>
  screen.queryByTestId(RECOVERY_SETUP_PROGRESS_TEST_IDS.SHEET);
const socialLinkSheet = (): ReturnType<typeof screen.queryByTestId> =>
  screen.queryByTestId(SOCIAL_LINK_EMAIL_TEST_IDS.SHEET);

describe('useRecoverySync', () => {
  const originalOS = Platform.OS;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockIsMfaDevBuild.mockReturnValue(false);
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

    expect(progressSheet()).toBeOnTheScreen();
    await act(async () => {
      sync.resolve();
      await result;
    });
    expect(progressSheet()).toBeNull();
  });

  it('removes the progress sheet and rejects when the sync fails', async () => {
    const sync = deferred();
    mockSync.mockReturnValue(sync.promise);
    const { startSync } = renderRecoverySync();
    const result = startSync();
    result.catch(() => undefined);

    await act(async () => {
      sync.reject(new Error('sync failed'));
    });

    await expect(result).rejects.toThrow('sync failed');
    expect(progressSheet()).toBeNull();
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

    startSync();
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

  it('asks for the social link email in dev builds and hands it to the sync', async () => {
    mockIsMfaDevBuild.mockReturnValue(true);
    const email = deferred<string | undefined>();
    const finish = deferred();
    mockSync.mockImplementation(async (_method, options: SyncOptions) => {
      email.resolve(await options.getSocialLinkEmail?.());
      await finish.promise;
    });
    const { startSync } = renderRecoverySync();

    startSync();
    await flush();
    expect(progressSheet()).toBeNull();
    expect(socialLinkSheet()).toBeNull();
    await advance(MODAL_SETTLE_MS);
    expect(socialLinkSheet()).toBeOnTheScreen();
    fireEvent.changeText(
      screen.getByTestId(SOCIAL_LINK_EMAIL_TEST_IDS.INPUT),
      ' qa@example.com ',
    );
    await act(async () => {
      fireEvent.press(screen.getByTestId(SOCIAL_LINK_EMAIL_TEST_IDS.CONFIRM));
    });
    expect(socialLinkSheet()).toBeNull();
    await advance(MODAL_SETTLE_MS);

    await expect(email.promise).resolves.toBe('qa@example.com');
    expect(progressSheet()).toBeOnTheScreen();
  });

  it('offers no social link email outside dev builds', async () => {
    mockSync.mockResolvedValue(undefined);
    const { startSync } = renderRecoverySync();

    await act(async () => {
      await startSync();
    });

    expect(mockSync).toHaveBeenCalledWith(
      'passkey',
      expect.objectContaining({ getSocialLinkEmail: undefined }),
    );
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

    startSync();
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
    const verifyMfa = jest.fn(() => verify.promise);
    const finish = deferred();
    mockRemoveFromRecovery.mockImplementation(
      async (_credentialId, options: RemoveOptions) => {
        await options.verifyMfa();
        await finish.promise;
      },
    );
    const { startRemove } = renderRecoverySync();

    startRemove(verifyMfa);
    await flush();
    expect(progressSheet()).toBeNull();
    await advance(MODAL_SETTLE_MS);
    expect(verifyMfa).toHaveBeenCalledTimes(1);
    await act(async () => verify.resolve());
    await advance(MODAL_SETTLE_MS);

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

    startSync();

    expect(screen.getByText('Setting up recovery')).toBeOnTheScreen();
    await act(async () => sync.resolve());
  });

  it('resolves the pending social link email with undefined on unmount', async () => {
    mockIsMfaDevBuild.mockReturnValue(true);
    const email = deferred<string | undefined>();
    mockSync.mockImplementation(async (_method, options: SyncOptions) => {
      email.resolve(await options.getSocialLinkEmail?.());
    });
    const { startSync, unmount } = renderRecoverySync();
    startSync();
    await flush();
    await advance(MODAL_SETTLE_MS);
    expect(socialLinkSheet()).toBeOnTheScreen();

    unmount();
    await advance(MODAL_SETTLE_MS);

    await expect(email.promise).resolves.toBeUndefined();
  });
});
