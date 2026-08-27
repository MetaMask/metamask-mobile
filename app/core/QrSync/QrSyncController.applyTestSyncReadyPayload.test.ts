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
  QrSyncSyncFlows,
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

  it('sets awaiting_password state and stores AccountTreePayload for new-user', async () => {
    const controller = buildController(() => false);

    await controller.applyTestSyncReadyPayload({
      mnemonic: TEST_MNEMONIC,
      walletName: 'Extension Wallet',
      accountName: 'Synced Account',
    });

    expect(controller.state.phase).toBe(QrSyncPhases.REVIEWING_IMPORT);
    expect(controller.state.syncFlow).toBe(QrSyncSyncFlows.NEW_USER);
    expect(controller.state.provisioningStatus).toBe(
      QrSyncProvisioningStatuses.AWAITING_PASSWORD,
    );
    expect(controller.state.pendingPayload).toMatchObject({
      version: 1,
      wallets: [
        {
          id: expect.stringMatching(/^wallet:entropy:mnemonic:/u),
          type: 'mnemonic',
          value: expect.any(Array),
          metadata: { name: 'Extension Wallet' },
          groups: [{ groupIndex: 0, metadata: { name: 'Synced Account' } }],
        },
      ],
    });
    expect(controller.state.pendingPayload?.wallets[0].groups[0].id).toBe(
      `${controller.state.pendingPayload?.wallets[0].id}/0`,
    );
  });

  it('uses default wallet and account names when omitted', async () => {
    const controller = buildController(() => true);

    await controller.applyTestSyncReadyPayload({
      mnemonic: `  ${TEST_MNEMONIC}  `,
    });

    expect(controller.state.syncFlow).toBe(QrSyncSyncFlows.EXISTING_USER);
    expect(controller.state.pendingPayload?.wallets[0]).toMatchObject({
      type: 'mnemonic',
      value: expect.any(Array),
      metadata: { name: 'Extension Wallet' },
      groups: [{ groupIndex: 0, metadata: { name: 'Account 1' } }],
    });
  });

  it('rejects onboarding payloads without a primary mnemonic value', async () => {
    const controller = buildController(() => false);

    await expect(
      controller.applyTestSyncReadyPayload({
        mnemonic: '',
      }),
    ).rejects.toThrow(/non-empty mnemonic/u);
  });

  it('rejects empty mnemonic payloads', async () => {
    const controller = buildController(() => true);

    await expect(
      controller.applyTestSyncReadyPayload({
        mnemonic: '   ',
      }),
    ).rejects.toThrow(/non-empty mnemonic/u);
  });

  it('rejects when HAS_TEST_OVERRIDES is disabled', async () => {
    mockHasTestOverrides.mockReturnValue(false);
    const controller = buildController(() => true);

    await expect(
      controller.applyTestSyncReadyPayload({
        mnemonic: TEST_MNEMONIC,
      }),
    ).rejects.toThrow(/HAS_TEST_OVERRIDES/u);
  });
});
