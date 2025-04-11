/* eslint-disable @typescript-eslint/ban-ts-comment */

// Mock Platform first, before any imports
jest.mock('react-native/Libraries/Utilities/Platform', () => {
  const Platform = {
    OS: 'ios',
    select: jest.fn(),
  };
  return Platform;
});

// Mock wait util - change this part
jest.mock('../utils/wait.util', () => {
  const mockWait = jest.fn().mockResolvedValue(undefined);
  return {
    wait: mockWait,
    waitForCondition: jest.fn(),
    waitForKeychainUnlocked: jest.fn().mockResolvedValue(true),
    waitForConnectionReadiness: jest.fn(),
    waitForEmptyRPCQueue: jest.fn(),
    waitForUserLoggedIn: jest.fn(),
    waitForAndroidServiceBinding: jest.fn(),
  };
});

// Import wait after mocking
import { wait } from '../utils/wait.util';
import { Platform } from 'react-native';
import { ApprovalController } from '@metamask/approval-controller';
import { PreferencesController } from '@metamask/preferences-controller';
import Engine from '../../Engine';
import { Connection } from '../Connection';
import checkPermissions from './checkPermissions';
import { PermissionController } from '@metamask/permission-controller';
import {
  getDefaultCaip25CaveatValue,
  getPermittedAccounts,
} from '../../../core/Permissions';
import { KeyringController } from '@metamask/keyring-controller';
import {
  Caip25CaveatType,
  Caip25EndowmentPermissionName,
} from '@metamask/chain-agnostic-permission';

// Rest of the mocks
jest.mock('../Connection', () => ({
  RPC_METHODS: jest.requireActual('../Connection').RPC_METHODS,
}));
jest.mock('../../Engine');
jest.mock('../../../core/Permissions', () => ({
  ...jest.requireActual('../../../core/Permissions'),
  getPermittedAccounts: jest.fn(),
}));
jest.mock('@metamask/preferences-controller');
jest.mock('@metamask/approval-controller');
jest.mock('../utils/DevLogger');

describe('checkPermissions', () => {
  let connection = {
    navigation: {
      getCurrentRoute: jest.fn(() => {
        'ok';
      }),
    },
  } as unknown as Connection;
  let engine = {
    context: {
      keyringController: {
        isUnlocked: jest.fn(() => true),
      },
    },
  } as unknown as typeof Engine;
  const requestPermissions = jest.fn();
  let preferencesController = {} as unknown as PreferencesController;
  let approvalController = {} as unknown as ApprovalController;
  let keyringController = {} as unknown as KeyringController;
  let permissionController = {
    executeProviderRequest: jest.fn(),
    executeRestrictedMethod: jest.fn().mockResolvedValue({}),
    hasPermissions: jest.fn(),
    requestPermissions,
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as unknown as PermissionController<any, any>;
  const currentTime = Date.now();

  const mockGetPermittedAccounts = getPermittedAccounts as jest.MockedFunction<
    typeof getPermittedAccounts
  >;
  const mockIsApproved = jest.fn();
  const mockRevalidate = jest.fn();
  const mockAdd = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset platform to iOS by default
    Platform.OS = 'ios';
    jest.useFakeTimers().setSystemTime(currentTime);
    mockGetPermittedAccounts.mockReturnValue([]);

    connection = {
      channelId: 'channelId',
      isApproved: mockIsApproved,
      revalidate: mockRevalidate,
      initialConnection: true,
      setLoading: jest.fn(),
    } as unknown as Connection;

    engine = {
      context: {},
    } as unknown as typeof Engine;

    preferencesController = {
      state: {
        selectedAddress: '',
      },
    } as unknown as PreferencesController;
    approvalController = {
      add: mockAdd,
    } as unknown as ApprovalController;
    keyringController = {
      isUnlocked: jest.fn(() => true),
    } as unknown as KeyringController;
    permissionController = {
      executeProviderRequest: jest.fn(),
      executeRestrictedMethod: jest.fn().mockResolvedValue({}),
      hasPermissions: jest.fn(),
      getPermissions: jest.fn(),
      getPermission: jest.fn(),
      getCaveat: jest.fn(),
      requestPermissions,
      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as unknown as PermissionController<any, any>;

    engine = {
      context: {
        PreferencesController: preferencesController,
        ApprovalController: approvalController,
        KeyringController: keyringController,
        PermissionController: permissionController,
      },
    } as unknown as typeof Engine;
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('should return true if permitted accounts exist', async () => {
    mockGetPermittedAccounts.mockReturnValue(['0x123']);
    const result = await checkPermissions({ connection, engine });
    expect(result).toBe(true);
  });

  it('should return false if no permitted accounts exist and no approval promise', async () => {
    mockGetPermittedAccounts.mockReturnValue([]);
    permissionController.getPermission = jest.fn().mockReturnValue(null);
    const result = await checkPermissions({ connection, engine });
    expect(result).toBe(false);
  });

  it(`should request permissions if no ${Caip25EndowmentPermissionName} permission exists`, async () => {
    mockGetPermittedAccounts.mockReturnValue([]);
    permissionController.getPermission = jest.fn().mockReturnValue(null);
    requestPermissions.mockResolvedValue({});
    mockGetPermittedAccounts
      .mockReturnValueOnce([])
      .mockReturnValueOnce(['0x123']);

    const result = await checkPermissions({ connection, engine });
    expect(requestPermissions).toHaveBeenCalledWith(
      { origin: connection.channelId },
      {
        [Caip25EndowmentPermissionName]: {
          caveats: [
            {
              type: Caip25CaveatType,
              value: getDefaultCaip25CaveatValue(),
            },
          ],
        },
      },
      { preserveExistingPermissions: false },
    );
    expect(result).toBe(true);
  });

  describe('platform specific behavior', () => {
    it('should add delay on iOS after permission approval', async () => {
      Platform.OS = 'ios';
      mockGetPermittedAccounts.mockReturnValue([]);
      permissionController.getPermission = jest.fn().mockReturnValue(null);
      requestPermissions.mockResolvedValue({});
      mockGetPermittedAccounts
        .mockReturnValueOnce([])
        .mockReturnValueOnce(['0x123']);

      await checkPermissions({ connection, engine });
      expect(wait).toHaveBeenCalledWith(100);
    });

    it('should not add delay on Android after permission approval', async () => {
      Platform.OS = 'android';
      mockGetPermittedAccounts.mockReturnValue([]);
      permissionController.getPermission = jest.fn().mockReturnValue(null);
      requestPermissions.mockResolvedValue({});
      mockGetPermittedAccounts
        .mockReturnValueOnce([])
        .mockReturnValueOnce(['0x123']);

      await checkPermissions({ connection, engine });
      expect(wait).not.toHaveBeenCalledWith(100);
    });
  });
});
