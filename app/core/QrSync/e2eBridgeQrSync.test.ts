/**
 * Deep-link wiring for E2E QR sync sync-ready injection.
 */

jest.mock('../../util/test/utils', () => ({ hasTestOverrides: true }));

const mockUrlListeners: ((event: { url?: string }) => void)[] = [];
const mockGetInitialURL = jest.fn().mockResolvedValue(null);

jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    Linking: {
      addEventListener: jest.fn(
        (event: string, cb: (payload: unknown) => void) => {
          if (event === 'url') {
            mockUrlListeners.push(cb as (event: { url?: string }) => void);
          }
          return { remove: jest.fn() };
        },
      ),
      getInitialURL: (...args: unknown[]) => mockGetInitialURL(...args),
    },
  };
});

jest.mock('../../util/Logger', () => ({
  log: jest.fn(),
  error: jest.fn(),
}));

import { Linking } from 'react-native';
import Logger from '../../util/Logger';
import {
  __handleE2EQrSyncUrlForTests,
  __resetE2EQrSyncBridgeForTests,
  registerE2EQrSyncDeepLinkHandler,
} from './e2eBridgeQrSync';
import type { QrSyncController } from './QrSyncController';

const mockAddEventListener = Linking.addEventListener as jest.Mock;

const buildController = (
  applyTestSyncReadyPayload: jest.Mock = jest.fn(),
): QrSyncController =>
  ({
    applyTestSyncReadyPayload,
  }) as unknown as QrSyncController;

describe('e2eBridgeQrSync deep link', () => {
  beforeEach(() => {
    mockUrlListeners.length = 0;
    mockAddEventListener.mockClear();
    mockGetInitialURL.mockReset().mockResolvedValue(null);
    jest.mocked(Logger.log).mockClear();
    jest.mocked(Logger.error).mockClear();
    __resetE2EQrSyncBridgeForTests();
  });

  it('applies sync-ready payload from metamask e2e deep link', () => {
    const applyTestSyncReadyPayload = jest.fn();
    registerE2EQrSyncDeepLinkHandler(() =>
      buildController(applyTestSyncReadyPayload),
    );

    __handleE2EQrSyncUrlForTests(
      'metamask://e2e/qr-sync/apply-sync-ready?mnemonic=one%20two%20three&walletName=Ext&accountName=Acc&isPrimary=true',
    );

    expect(applyTestSyncReadyPayload).toHaveBeenCalledWith({
      mnemonic: 'one two three',
      isPrimary: true,
      walletName: 'Ext',
      accountName: 'Acc',
    });
  });

  it('applies sync-ready payload from raw e2e scheme', () => {
    const applyTestSyncReadyPayload = jest.fn();
    registerE2EQrSyncDeepLinkHandler(() =>
      buildController(applyTestSyncReadyPayload),
    );

    __handleE2EQrSyncUrlForTests(
      'e2e://qr-sync/apply-sync-ready?mnemonic=alpha&isPrimary=1',
    );

    expect(applyTestSyncReadyPayload).toHaveBeenCalledWith({
      mnemonic: 'alpha',
      isPrimary: true,
      walletName: undefined,
      accountName: undefined,
    });
  });

  it('strips nested qr-sync schemes before parsing the path', () => {
    const applyTestSyncReadyPayload = jest.fn();
    registerE2EQrSyncDeepLinkHandler(() =>
      buildController(applyTestSyncReadyPayload),
    );

    __handleE2EQrSyncUrlForTests(
      'metamask://e2e/qr-sync/e2e://qr-sync/apply-sync-ready?mnemonic=nested&isPrimary=false',
    );

    expect(applyTestSyncReadyPayload).toHaveBeenCalledWith({
      mnemonic: 'nested',
      isPrimary: false,
      walletName: undefined,
      accountName: undefined,
    });
  });

  it('defaults isPrimary to true when the query param is missing or empty', () => {
    const applyTestSyncReadyPayload = jest.fn();
    registerE2EQrSyncDeepLinkHandler(() =>
      buildController(applyTestSyncReadyPayload),
    );

    __handleE2EQrSyncUrlForTests(
      'metamask://e2e/qr-sync/apply-sync-ready?mnemonic=only',
    );
    __handleE2EQrSyncUrlForTests(
      'metamask://e2e/qr-sync/apply-sync-ready?mnemonic=empty&isPrimary=',
    );

    expect(applyTestSyncReadyPayload).toHaveBeenNthCalledWith(1, {
      mnemonic: 'only',
      isPrimary: true,
      walletName: undefined,
      accountName: undefined,
    });
    expect(applyTestSyncReadyPayload).toHaveBeenNthCalledWith(2, {
      mnemonic: 'empty',
      isPrimary: true,
      walletName: undefined,
      accountName: undefined,
    });
  });

  it('ignores blank urls and non qr-sync schemes', () => {
    const applyTestSyncReadyPayload = jest.fn();
    registerE2EQrSyncDeepLinkHandler(() =>
      buildController(applyTestSyncReadyPayload),
    );

    __handleE2EQrSyncUrlForTests('');
    __handleE2EQrSyncUrlForTests('metamask://other/path');

    expect(applyTestSyncReadyPayload).not.toHaveBeenCalled();
  });

  it('ignores unknown paths', () => {
    const applyTestSyncReadyPayload = jest.fn();
    registerE2EQrSyncDeepLinkHandler(() =>
      buildController(applyTestSyncReadyPayload),
    );

    __handleE2EQrSyncUrlForTests('metamask://e2e/qr-sync/unknown');

    expect(applyTestSyncReadyPayload).not.toHaveBeenCalled();
    expect(Logger.log).toHaveBeenCalledWith(
      expect.stringContaining('Ignoring unknown path'),
    );
  });

  it('ignores duplicate deep links after a successful apply', () => {
    const applyTestSyncReadyPayload = jest.fn();
    registerE2EQrSyncDeepLinkHandler(() =>
      buildController(applyTestSyncReadyPayload),
    );

    const url =
      'metamask://e2e/qr-sync/apply-sync-ready?mnemonic=once&isPrimary=true';
    __handleE2EQrSyncUrlForTests(url);
    __handleE2EQrSyncUrlForTests(url);

    expect(applyTestSyncReadyPayload).toHaveBeenCalledTimes(1);
  });

  it('logs when QrSyncController is unavailable and allows retry', () => {
    const applyTestSyncReadyPayload = jest.fn();
    const controllerRef: { current: QrSyncController | undefined } = {
      current: undefined,
    };
    registerE2EQrSyncDeepLinkHandler(() => controllerRef.current);

    const url = 'metamask://e2e/qr-sync/apply-sync-ready?mnemonic=x';
    __handleE2EQrSyncUrlForTests(url);

    expect(Logger.error).toHaveBeenCalledWith(
      expect.any(Error),
      'E2E QR Sync apply-sync-ready',
    );
    expect(applyTestSyncReadyPayload).not.toHaveBeenCalled();

    controllerRef.current = buildController(applyTestSyncReadyPayload);
    __handleE2EQrSyncUrlForTests(url);

    expect(applyTestSyncReadyPayload).toHaveBeenCalledTimes(1);
  });

  it('logs when applyTestSyncReadyPayload throws and allows retry', () => {
    const applyTestSyncReadyPayload = jest
      .fn()
      .mockImplementationOnce(() => {
        throw new Error('boom');
      })
      .mockImplementationOnce(() => undefined);
    registerE2EQrSyncDeepLinkHandler(() =>
      buildController(applyTestSyncReadyPayload),
    );

    const url = 'metamask://e2e/qr-sync/apply-sync-ready?mnemonic=x';
    __handleE2EQrSyncUrlForTests(url);

    expect(Logger.error).toHaveBeenCalledWith(
      expect.any(Error),
      'E2E QR Sync apply-sync-ready failed',
    );

    __handleE2EQrSyncUrlForTests(url);

    expect(applyTestSyncReadyPayload).toHaveBeenCalledTimes(2);
  });

  it('registers a Linking listener once and applies live url events', () => {
    const applyTestSyncReadyPayload = jest.fn();
    registerE2EQrSyncDeepLinkHandler(() =>
      buildController(applyTestSyncReadyPayload),
    );
    registerE2EQrSyncDeepLinkHandler(() =>
      buildController(applyTestSyncReadyPayload),
    );

    expect(mockAddEventListener).toHaveBeenCalledTimes(1);
    expect(Logger.log).toHaveBeenCalledWith(
      '[E2E QR Sync] Deep link handler registered',
    );

    const listener = mockAddEventListener.mock.calls[0][1] as (event: {
      url?: string;
    }) => void;
    listener({
      url: 'metamask://e2e/qr-sync/apply-sync-ready?mnemonic=live',
    });
    listener({});

    expect(applyTestSyncReadyPayload).toHaveBeenCalledTimes(1);
    expect(applyTestSyncReadyPayload).toHaveBeenCalledWith({
      mnemonic: 'live',
      isPrimary: true,
      walletName: undefined,
      accountName: undefined,
    });
  });

  it('applies the initial Linking url when present', async () => {
    const applyTestSyncReadyPayload = jest.fn();
    jest
      .spyOn(Linking, 'getInitialURL')
      .mockResolvedValue(
        'metamask://e2e/qr-sync/apply-sync-ready?mnemonic=initial',
      );

    registerE2EQrSyncDeepLinkHandler(() =>
      buildController(applyTestSyncReadyPayload),
    );

    await Promise.resolve();
    await Promise.resolve();

    expect(applyTestSyncReadyPayload).toHaveBeenCalledWith({
      mnemonic: 'initial',
      isPrimary: true,
      walletName: undefined,
      accountName: undefined,
    });
  });

  it('swallows getInitialURL rejection', async () => {
    mockGetInitialURL.mockRejectedValue(new Error('no initial url'));

    registerE2EQrSyncDeepLinkHandler(() => buildController());

    await Promise.resolve();
    await Promise.resolve();

    expect(Logger.error).not.toHaveBeenCalledWith(
      expect.any(Error),
      '[E2E QR Sync] Failed to register deep link handler',
    );
  });

  it('logs when Linking registration throws', () => {
    mockAddEventListener.mockImplementationOnce(() => {
      throw new Error('listener failed');
    });

    registerE2EQrSyncDeepLinkHandler(() => buildController());

    expect(Logger.error).toHaveBeenCalledWith(
      expect.any(Error),
      '[E2E QR Sync] Failed to register deep link handler',
    );
  });
});
