/* eslint-disable @typescript-eslint/ban-ts-comment */
import { ApprovalController } from '@metamask/approval-controller';
import { PreferencesController } from '@metamask/preferences-controller';
import Engine from '../../Engine';
import { Connection } from '../Connection';
import checkPermissions from './checkPermissions';
import { PermissionController } from '@metamask/permission-controller';
import { getPermittedAccounts } from '../../../core/Permissions';
import { KeyringController } from '@metamask/keyring-controller';

jest.mock('../Connection', () => ({
  RPC_METHODS: jest.requireActual('../Connection').RPC_METHODS,
}));
jest.mock('../../Engine');
jest.mock('../../../core/Permissions');
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
    jest.useFakeTimers().setSystemTime(currentTime);
    mockGetPermittedAccounts.mockResolvedValue([]);

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
    mockGetPermittedAccounts.mockResolvedValue(['0x123']);

    const result = await checkPermissions({ connection, engine });
    expect(result).toBe(true);
  });

  it('should return false if no permitted accounts exist and no approval promise', async () => {
    mockGetPermittedAccounts.mockResolvedValue([]);
    permissionController.getPermission = jest.fn().mockReturnValue(null);

    const result = await checkPermissions({ connection, engine });
    expect(result).toBe(false);
  });

  it('should request permissions if no eth_accounts permission exists', async () => {
    mockGetPermittedAccounts.mockResolvedValue([]);
    permissionController.getPermission = jest.fn().mockReturnValue(null);
    requestPermissions.mockResolvedValue({});
    mockGetPermittedAccounts.mockResolvedValueOnce([]).mockResolvedValueOnce(['0x123']);

    const result = await checkPermissions({ connection, engine });
    expect(requestPermissions).toHaveBeenCalledWith(
      { origin: connection.channelId },
      { eth_accounts: {} },
      { preserveExistingPermissions: false }
    );
    expect(result).toBe(true);
  });
});
