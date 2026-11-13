import {
  Caip25CaveatType,
  Caip25CaveatValue,
  Caip25EndowmentPermissionName,
} from '@metamask/chain-agnostic-permission';
import {
  Messenger,
  MOCK_ANY_NAMESPACE,
  type MessengerActions,
  type MessengerEvents,
  type MockAnyNamespace,
} from '@metamask/messenger';
import {
  PermissionController,
  type PermissionControllerMessenger,
} from '@metamask/permission-controller';
import {
  NavigationContainerRef,
  ParamListBase,
} from '@react-navigation/native';
import { store } from '../../store';
import Engine from '../Engine';
import { getPermittedAccounts } from '../Permissions';
import {
  getCaveatSpecifications,
  getPermissionSpecifications,
  unrestrictedMethods,
} from '../Permissions/specifications';
import { Connection } from './Connection';
import removeChannel from './ConnectionManagement/removeChannel';
import checkPermissions from './handlers/checkPermissions';
import asyncInit from './InitializationManagement/asyncInit';
import SDKConnect from './SDKConnect';

jest.mock('../Engine', () => ({ context: {} }));
jest.mock('../../store', () => ({
  store: { getState: jest.fn(), dispatch: jest.fn() },
}));
jest.mock('./utils/wait.util', () => ({
  ...jest.requireActual('./utils/wait.util'),
  wait: jest.fn().mockResolvedValue(undefined),
}));

const CHANNEL_ID = 'sdk-channel-1';
const ACCOUNT = '0x1234567890abcdef1234567890abcdef12345678';

const grantedCaveatValue: Caip25CaveatValue = {
  requiredScopes: {},
  optionalScopes: {
    'eip155:1': { accounts: [`eip155:1:${ACCOUNT}`] },
  },
  sessionProperties: {},
  isMultichainOrigin: false,
};

type PermissionMessengerActions =
  MessengerActions<PermissionControllerMessenger>;
type PermissionMessengerEvents = MessengerEvents<PermissionControllerMessenger>;

const createPermissionController = (addApprovalRequest: jest.Mock) => {
  const rootMessenger = new Messenger<
    MockAnyNamespace,
    PermissionMessengerActions,
    PermissionMessengerEvents
  >({ namespace: MOCK_ANY_NAMESPACE });
  const messenger = new Messenger<
    'PermissionController',
    PermissionMessengerActions,
    PermissionMessengerEvents,
    typeof rootMessenger
  >({ namespace: 'PermissionController', parent: rootMessenger });
  rootMessenger.delegate({
    actions: ['ApprovalController:addRequest'],
    messenger,
  });
  rootMessenger.registerActionHandler(
    'ApprovalController:addRequest',
    addApprovalRequest,
  );

  return new PermissionController({
    messenger,
    caveatSpecifications: getCaveatSpecifications({
      listAccounts: () => [{ address: ACCOUNT, type: 'eip155:eoa' }],
      findNetworkClientIdByChainId: () => 'mainnet',
      isNonEvmScopeSupported: () => false,
      getNonEvmAccountAddresses: () => [],
    }),
    permissionSpecifications: getPermissionSpecifications(),
    unrestrictedMethods,
  });
};

const createInstance = () =>
  ({
    state: {
      connected: {},
      connections: {},
      approvedHosts: {},
      disabledHosts: {},
      connecting: {},
    },
  }) as unknown as SDKConnect;

const createConnection = ({
  validUntil,
  onTerminate = jest.fn(),
}: {
  validUntil: number;
  onTerminate?: Connection['onTerminate'];
}) =>
  ({
    channelId: CHANNEL_ID,
    validUntil,
    initialConnection: true,
    originatorInfo: { url: 'https://dapp.example', title: 'Dapp' },
    navigation: { getCurrentRoute: () => ({ name: 'WalletView' }) },
    setLoading: jest.fn(),
    onTerminate,
  }) as unknown as Connection;

describe('expired SDK session permissions', () => {
  let permissionController: ReturnType<typeof createPermissionController>;
  let addApprovalRequest: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    addApprovalRequest = jest.fn(async ({ requestData }) => requestData);
    permissionController = createPermissionController(addApprovalRequest);
    Object.assign(Engine.context, {
      PermissionController: permissionController,
      KeyringController: { isUnlocked: () => true },
      AccountsController: { getAccountByAddress: () => undefined },
    });
    permissionController.grantPermissions({
      subject: { origin: CHANNEL_ID },
      approvedPermissions: {
        [Caip25EndowmentPermissionName]: {
          caveats: [{ type: Caip25CaveatType, value: grantedCaveatValue }],
        },
      },
    });
  });

  it('revokes the permission of an expired session on init so the next connection prompts', async () => {
    expect(getPermittedAccounts(CHANNEL_ID)).toEqual([ACCOUNT]);
    (store.getState as jest.Mock).mockReturnValue({
      sdk: {
        connections: {
          [CHANNEL_ID]: { id: CHANNEL_ID, validUntil: Date.now() - 1000 },
        },
        approvedHosts: {},
        dappConnections: {},
      },
    });

    await asyncInit({
      instance: createInstance(),
      navigation: {} as NavigationContainerRef<ParamListBase>,
    });

    expect(permissionController.hasPermissions(CHANNEL_ID)).toBe(false);
    expect(getPermittedAccounts(CHANNEL_ID)).toEqual([]);

    await checkPermissions({
      connection: createConnection({ validUntil: Date.now() + 60_000 }),
      engine: Engine,
    });

    expect(addApprovalRequest).toHaveBeenCalledTimes(1);
    expect(addApprovalRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        origin: CHANNEL_ID,
        type: 'wallet_requestPermissions',
      }),
      true,
    );
  });

  it('terminates a session that expires while in use and revokes its permission', async () => {
    const instance = createInstance();
    const connection = createConnection({
      validUntil: Date.now() - 1,
      onTerminate: ({ channelId }) => {
        removeChannel({ channelId, engine: Engine, instance });
      },
    });

    await expect(
      checkPermissions({ connection, engine: Engine }),
    ).rejects.toThrow('SDK session expired');

    expect(permissionController.hasPermissions(CHANNEL_ID)).toBe(false);
    expect(addApprovalRequest).not.toHaveBeenCalled();
  });
});
