const mockHasTestOverrides = jest.fn(() => true);

jest.mock('../../util/test/utils', () => ({
  get hasTestOverrides() {
    return mockHasTestOverrides();
  },
}));

import { AccountWalletPayloadType } from '@metamask/account-tree-controller';
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

  it('computes the wallet payload ID matching the entropy-derived ID for the test mnemonic', async () => {
    const controller = buildController();

    await controller.applyTestSyncReadyPayload({ mnemonic: TEST_MNEMONIC });

    expect(controller.state.pendingSecretImports?.wallets[0].id).toBe(
      'wallet:entropy:mnemonic:94cc3e86-bcfe-43b6-8be2-d8a66fc55070',
    );
  });

  it('sets awaiting_password state, stores full payload in pendingSecretImports and secrets-stripped in provisioningMetadata', async () => {
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
    // pendingSecretImports: metadata-stripped — secrets present, wallet/group metadata absent
    expect(controller.state.pendingSecretImports).toMatchObject({
      version: 1,
      wallets: [
        { type: AccountWalletPayloadType.Mnemonic, value: expect.anything() },
      ],
    });
    expect(
      controller.state.pendingSecretImports?.wallets[0],
    ).not.toHaveProperty('metadata');
    expect(
      controller.state.pendingSecretImports?.wallets[0].groups?.[0],
    ).not.toHaveProperty('metadata');
    // provisioningMetadata: secrets stripped, no value
    expect(controller.state.provisioningMetadata).toMatchObject({
      version: 1,
      wallets: [
        {
          type: AccountWalletPayloadType.Mnemonic,
          metadata: { name: 'Extension Wallet' },
        },
      ],
    });
    expect(
      controller.state.provisioningMetadata?.wallets[0],
    ).not.toHaveProperty('value');
  });

  it('uses default wallet and account names when omitted', async () => {
    const controller = buildController(() => true);

    await controller.applyTestSyncReadyPayload({
      mnemonic: `  ${TEST_MNEMONIC}  `,
    });

    expect(controller.state.syncFlow).toBe(QrSyncSyncFlows.EXISTING_USER);
    expect(controller.state.pendingSecretImports?.wallets[0]).toMatchObject({
      type: AccountWalletPayloadType.Mnemonic,
      value: expect.anything(),
    });
    expect(
      controller.state.pendingSecretImports?.wallets[0],
    ).not.toHaveProperty('metadata');
  });

  it('rejects onboarding payloads without a primary mnemonic value', async () => {
    const controller = buildController(() => false);

    await expect(
      controller.applyTestSyncReadyPayload({
        mnemonic: '',
      }),
    ).rejects.toThrow(/non-empty mnemonic/);
  });

  it('rejects empty mnemonic payloads', async () => {
    const controller = buildController(() => true);

    await expect(
      controller.applyTestSyncReadyPayload({
        mnemonic: '   ',
      }),
    ).rejects.toThrow(/non-empty mnemonic/);
  });

  it('rejects when HAS_TEST_OVERRIDES is disabled', async () => {
    mockHasTestOverrides.mockReturnValue(false);
    const controller = buildController(() => true);

    await expect(
      controller.applyTestSyncReadyPayload({
        mnemonic: TEST_MNEMONIC,
      }),
    ).rejects.toThrow(/HAS_TEST_OVERRIDES/);
  });
});
