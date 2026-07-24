const mockHasTestOverrides = jest.fn(() => true);

jest.mock('../../util/test/utils', () => ({
  get hasTestOverrides() {
    return mockHasTestOverrides();
  },
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

const buildController = (
  getIsOnboardingCompleted: () => boolean = () => false,
) =>
  new QrSyncController({
    messenger: buildMessenger(),
    keyManager: {} as IKeyManager,
    relayUrl: TEST_RELAY_URL,
    getIsOnboardingCompleted,
  });

describe('QrSyncController.applyTestSyncReadyPayload', () => {
  beforeEach(() => {
    mockHasTestOverrides.mockReturnValue(true);
  });

  it('sets awaiting_password state for a primary mnemonic', () => {
    const controller = buildController(() => false);

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

  it('uses default wallet and account names when omitted', () => {
    const controller = buildController(() => true);

    controller.applyTestSyncReadyPayload({
      mnemonic: `  ${TEST_MNEMONIC}  `,
    });

    expect(controller.state.pendingSecretImports?.[0]).toMatchObject({
      value: TEST_MNEMONIC,
      isPrimary: true,
    });
    expect(controller.state.provisioningMetadata?.entries[0]).toMatchObject({
      name: 'Extension Wallet',
      groups: [{ groupIndex: 0, name: 'Account 1' }],
    });
  });

  it('accepts non-primary mnemonic when onboarding is already completed', () => {
    const controller = buildController(() => true);

    controller.applyTestSyncReadyPayload({
      mnemonic: TEST_MNEMONIC,
      isPrimary: false,
      walletName: 'Secondary',
      accountName: 'Extra',
    });

    expect(controller.state.pendingSecretImports?.[0]?.isPrimary).toBe(false);
    expect(controller.state.provisioningMetadata?.entries[0]).toMatchObject({
      isPrimary: false,
      name: 'Secondary',
      groups: [{ groupIndex: 0, name: 'Extra' }],
    });
  });

  it('rejects onboarding payloads without a primary mnemonic', () => {
    const controller = buildController(() => false);

    expect(() =>
      controller.applyTestSyncReadyPayload({
        mnemonic: TEST_MNEMONIC,
        isPrimary: false,
      }),
    ).toThrow(/primary mnemonic/);
  });

  it('rejects empty mnemonic payloads', () => {
    const controller = buildController(() => true);

    expect(() =>
      controller.applyTestSyncReadyPayload({
        mnemonic: '   ',
      }),
    ).toThrow(/non-empty mnemonic/);
  });

  it('rejects when HAS_TEST_OVERRIDES is disabled', () => {
    mockHasTestOverrides.mockReturnValue(false);
    const controller = buildController(() => true);

    expect(() =>
      controller.applyTestSyncReadyPayload({
        mnemonic: TEST_MNEMONIC,
      }),
    ).toThrow(/HAS_TEST_OVERRIDES/);
  });
});
