/**
 * Deep-link wiring for E2E QR sync sync-ready injection.
 */

jest.mock('../../util/test/utils', () => ({ hasTestOverrides: true }));

const urlListeners: ((e: { url: string }) => void)[] = [];
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    Linking: {
      addEventListener: jest.fn(
        (event: string, cb: (e: { url: string }) => void) => {
          if (event === 'url') {
            urlListeners.push(cb);
          }
          return { remove: jest.fn() };
        },
      ),
      getInitialURL: jest.fn().mockResolvedValue(null),
    },
  };
});

import {
  __handleE2EQrSyncUrlForTests,
  __resetE2EQrSyncBridgeForTests,
  registerE2EQrSyncDeepLinkHandler,
} from './e2eBridgeQrSync';
import type { QrSyncController } from './QrSyncController';

describe('e2eBridgeQrSync deep link', () => {
  beforeEach(() => {
    urlListeners.length = 0;
    __resetE2EQrSyncBridgeForTests();
  });

  it('applies sync-ready payload from metamask e2e deep link', () => {
    const applyTestSyncReadyPayload = jest.fn();
    const controller = {
      applyTestSyncReadyPayload,
    } as unknown as QrSyncController;

    registerE2EQrSyncDeepLinkHandler(() => controller);

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

  it('ignores unknown paths', () => {
    const applyTestSyncReadyPayload = jest.fn();
    registerE2EQrSyncDeepLinkHandler(
      () =>
        ({
          applyTestSyncReadyPayload,
        }) as unknown as QrSyncController,
    );

    __handleE2EQrSyncUrlForTests('metamask://e2e/qr-sync/unknown');

    expect(applyTestSyncReadyPayload).not.toHaveBeenCalled();
  });
});
