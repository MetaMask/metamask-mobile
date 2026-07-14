jest.mock('../../util/test/utils', () => ({
  hasTestOverrides: true,
}));

import type { IKeyManager } from '@metamask/mobile-wallet-protocol-core';
import { Messenger } from '@metamask/messenger';

import {
  QrSyncPhases,
  QrSyncProvisioningStatuses,
  QrSyncSecretTypes,
} from './constants';
import {
  QR_SYNC_CONTROLLER_NAME,
  type QrSyncControllerMessenger,
} from './controller-types';
import { QrSyncController } from './QrSyncController';

const TEST_RELAY_URL = 'wss://test-relay.example.com';
const TEST_MNEMONIC =
  'leisure swallow trip elbow prison wait rely keep supply hole general mountain';

const buildMessenger = (): QrSyncControllerMessenger =>
  new Messenger({
    namespace: QR_SYNC_CONTROLLER_NAME,
  });

describe('QrSyncController.applyTestSyncReadyPayload', () => {
  it('sets awaiting_password state for a primary mnemonic', () => {
    const controller = new QrSyncController({
      messenger: buildMessenger(),
      keyManager: {} as IKeyManager,
      relayUrl: TEST_RELAY_URL,
      getIsOnboardingCompleted: () => false,
    });

    controller.applyTestSyncReadyPayload({
      mnemonic: TEST_MNEMONIC,
      walletName: 'Extension Wallet',
      accountName: 'Synced Account',
      isPrimary: true,
    });

    expect(controller.state.phase).toBe(QrSyncPhases.REVIEWING_IMPORT);
    expect(controller.state.provisioningStatus).toBe(
      QrSyncProvisioningStatuses.AWAITING_PASSWORD,
    );
    expect(controller.state.pendingSecretImports).toEqual([
      {
        index: 0,
        type: QrSyncSecretTypes.MNEMONIC,
        value: TEST_MNEMONIC,
        isPrimary: true,
      },
    ]);
    expect(controller.state.provisioningMetadata?.entries[0]).toMatchObject({
      name: 'Extension Wallet',
      groups: [{ groupIndex: 0, name: 'Synced Account' }],
    });
  });

  it('rejects onboarding payloads without a primary mnemonic', () => {
    const controller = new QrSyncController({
      messenger: buildMessenger(),
      keyManager: {} as IKeyManager,
      relayUrl: TEST_RELAY_URL,
      getIsOnboardingCompleted: () => false,
    });

    expect(() =>
      controller.applyTestSyncReadyPayload({
        mnemonic: TEST_MNEMONIC,
        isPrimary: false,
      }),
    ).toThrow(/primary mnemonic/);
  });
});
