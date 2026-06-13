import {
  Messenger,
  MOCK_ANY_NAMESPACE,
  type MockAnyNamespace,
} from '@metamask/messenger';
import { buildSnapRestrictedMethodSpecifications } from '@metamask/snaps-rpc-methods';
import type { SnapMessage } from '@metamask/eth-snap-keyring';
import type { SnapId } from '@metamask/snaps-sdk';
import {
  SnapPermissionSpecificationsActions,
  SnapPermissionSpecificationsEvents,
  getSnapPermissionSpecifications,
} from './specifications';

jest.mock('@metamask/snaps-rpc-methods', () => ({
  buildSnapEndowmentSpecifications: jest.fn(() => ({})),
  buildSnapRestrictedMethodSpecifications: jest.fn(() => ({})),
}));

const MOCK_SNAP_ID = 'npm:@metamask/test-snap' as SnapId;
const MOCK_MESSAGE: SnapMessage = { method: 'keyring_createAccount' };

function getMessenger() {
  return new Messenger<
    MockAnyNamespace,
    SnapPermissionSpecificationsActions,
    SnapPermissionSpecificationsEvents
  >({ namespace: MOCK_ANY_NAMESPACE });
}

function getCapturedOptions() {
  const { calls } = jest.mocked(buildSnapRestrictedMethodSpecifications).mock;
  expect(calls.length).toBeGreaterThan(0);
  // options are the second argument
  return calls[calls.length - 1][1] as Record<string, unknown>;
}

describe('getSnapPermissionSpecifications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getSnapKeyring', () => {
    it('passes a getSnapKeyring option to buildSnapRestrictedMethodSpecifications', () => {
      const messenger = getMessenger();
      messenger.registerActionHandler(
        'SnapAccountService:handleKeyringSnapMessage',
        jest.fn(),
      );

      getSnapPermissionSpecifications(messenger);

      const options = getCapturedOptions();
      expect(typeof options.getSnapKeyring).toBe('function');
    });

    it('returns a keyring object with a handleKeyringSnapMessage method', async () => {
      const messenger = getMessenger();
      messenger.registerActionHandler(
        'SnapAccountService:handleKeyringSnapMessage',
        jest.fn().mockResolvedValue(null),
      );

      getSnapPermissionSpecifications(messenger);

      const { getSnapKeyring } = getCapturedOptions() as {
        getSnapKeyring: () => Promise<unknown>;
      };
      const keyring = await getSnapKeyring();

      expect(
        typeof (keyring as Record<string, unknown>).handleKeyringSnapMessage,
      ).toBe('function');
    });

    it('delegates handleKeyringSnapMessage to SnapAccountService:handleKeyringSnapMessage', async () => {
      const messenger = getMessenger();
      const handleMock = jest.fn().mockResolvedValue({ address: '0xabc' });
      messenger.registerActionHandler(
        'SnapAccountService:handleKeyringSnapMessage',
        handleMock,
      );

      getSnapPermissionSpecifications(messenger);

      const { getSnapKeyring } = getCapturedOptions() as {
        getSnapKeyring: () => Promise<{
          handleKeyringSnapMessage(
            snapId: string,
            message: SnapMessage,
          ): Promise<unknown>;
        }>;
      };
      const keyring = await getSnapKeyring();
      await keyring.handleKeyringSnapMessage(MOCK_SNAP_ID, MOCK_MESSAGE);

      expect(handleMock).toHaveBeenCalledTimes(1);
      expect(handleMock).toHaveBeenCalledWith(MOCK_SNAP_ID, MOCK_MESSAGE);
    });

    it('returns the result from SnapAccountService:handleKeyringSnapMessage', async () => {
      const messenger = getMessenger();
      const expectedResult = { address: '0xabc' };
      messenger.registerActionHandler(
        'SnapAccountService:handleKeyringSnapMessage',
        jest.fn().mockResolvedValue(expectedResult),
      );

      getSnapPermissionSpecifications(messenger);

      const { getSnapKeyring } = getCapturedOptions() as {
        getSnapKeyring: () => Promise<{
          handleKeyringSnapMessage(
            snapId: string,
            message: SnapMessage,
          ): Promise<unknown>;
        }>;
      };
      const keyring = await getSnapKeyring();
      const result = await keyring.handleKeyringSnapMessage(
        MOCK_SNAP_ID,
        MOCK_MESSAGE,
      );

      expect(result).toBe(expectedResult);
    });
  });
});
