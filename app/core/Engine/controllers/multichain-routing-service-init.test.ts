import { buildMessengerClientInitRequestMock } from '../utils/test-utils';
import { ExtendedMessenger } from '../../ExtendedMessenger';
import {
  getMultichainRoutingServiceInitMessenger,
  getMultichainRoutingServiceMessenger,
  MultichainRoutingServiceInitMessenger,
} from '../messengers/multichain-routing-service-messenger.ts';
import { MessengerClientInitRequest } from '../types';
import {
  multichainRoutingServiceInit,
  withSnapKeyring,
} from './multichain-routing-service-init.ts';
import {
  MultichainRoutingService,
  MultichainRoutingServiceMessenger,
} from '@metamask/snaps-controllers';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';
import { KeyringType } from '@metamask/keyring-api/v2';

jest.mock('@metamask/snaps-controllers');

interface WithKeyringOptions {
  filter: (keyring: unknown) => boolean;
}

type WithKeyringOperation = (args: { keyring: unknown }) => Promise<unknown>;

const mockRequest = {
  account: '0xabc',
  origin: 'test-origin',
  scope: 'eip155:1' as const,
  method: 'eth_sendTransaction',
  params: [],
};

function getInitRequestMock(): jest.Mocked<
  MessengerClientInitRequest<
    MultichainRoutingServiceMessenger,
    MultichainRoutingServiceInitMessenger
  >
> {
  const baseMessenger = new ExtendedMessenger<MockAnyNamespace, never, never>({
    namespace: MOCK_ANY_NAMESPACE,
  });

  const requestMock = {
    ...buildMessengerClientInitRequestMock(baseMessenger),
    controllerMessenger: getMultichainRoutingServiceMessenger(baseMessenger),
    initMessenger: getMultichainRoutingServiceInitMessenger(baseMessenger),
  };

  return requestMock;
}

function getInitMessenger() {
  const baseMessenger = new ExtendedMessenger<MockAnyNamespace, never, never>({
    namespace: MOCK_ANY_NAMESPACE,
  });
  return getMultichainRoutingServiceInitMessenger(baseMessenger);
}

describe('withSnapKeyring', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses KeyringController:withKeyringV2 to route requests', async () => {
    const mockV2Keyring = {
      type: KeyringType.Snap,
      submitRequest: jest.fn().mockResolvedValue({ result: 'success' }),
      hasAccount: jest.fn().mockReturnValue(true),
    };
    const mockOtherSnapKeyring = {
      type: KeyringType.Snap,
      hasAccount: jest.fn().mockReturnValue(false),
    };
    const mockNonSnapKeyring = {
      type: KeyringType.Hd,
      hasAccount: jest.fn(),
    };

    const initMessenger = getInitMessenger();

    jest
      .spyOn(initMessenger, 'call')
      .mockImplementation(
        async (action: unknown, options: unknown, operation: unknown) => {
          expect(action).toBe('KeyringController:withKeyringV2');

          const { filter } = options as WithKeyringOptions;
          expect(filter(mockV2Keyring)).toBe(true);
          expect(filter(mockOtherSnapKeyring)).toBe(false);
          expect(filter(mockNonSnapKeyring)).toBe(false);
          expect(mockNonSnapKeyring.hasAccount).not.toHaveBeenCalled();

          return (operation as WithKeyringOperation)({
            keyring: mockV2Keyring,
          });
        },
      );

    await expect(
      withSnapKeyring(initMessenger, async ({ keyring }) =>
        keyring.submitRequest(mockRequest),
      ),
    ).resolves.toStrictEqual({ result: 'success' });

    expect(initMessenger.call).toHaveBeenCalledWith(
      'KeyringController:withKeyringV2',
      expect.objectContaining({ filter: expect.any(Function) }),
      expect.any(Function),
    );
    expect(mockV2Keyring.submitRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        origin: mockRequest.origin,
        scope: mockRequest.scope,
        account: mockRequest.account,
        request: {
          method: mockRequest.method,
          params: mockRequest.params,
        },
        id: expect.any(String),
      }),
    );
  });

  it('does not look up a keyring until the provided operation submits a request', async () => {
    const initMessenger = getInitMessenger();
    const initMessengerCall = jest.spyOn(initMessenger, 'call');

    await expect(
      withSnapKeyring(initMessenger, async () => 'operation-result'),
    ).resolves.toBe('operation-result');

    expect(initMessengerCall).not.toHaveBeenCalled();
  });

  it('throws if the selected keyring is not a v2 Snap keyring', async () => {
    const initMessenger = getInitMessenger();

    jest
      .spyOn(initMessenger, 'call')
      .mockImplementation(async (_action, _options, operation) =>
        (operation as WithKeyringOperation)({
          keyring: { type: KeyringType.Hd },
        }),
      );

    await expect(
      withSnapKeyring(initMessenger, async ({ keyring }) =>
        keyring.submitRequest(mockRequest),
      ),
    ).rejects.toThrow('Expected v2 Snap keyring');
  });
});

describe('multichainRoutingServiceInit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('initializes the controller', () => {
    const { controller } = multichainRoutingServiceInit(getInitRequestMock());
    expect(controller).toBeInstanceOf(MultichainRoutingService);
  });

  it('passes the proper arguments to the controller', () => {
    multichainRoutingServiceInit(getInitRequestMock());

    const controllerMock = jest.mocked(MultichainRoutingService);
    expect(controllerMock).toHaveBeenCalledWith({
      messenger: expect.any(Object),
      withSnapKeyring: expect.any(Function),
    });
  });
});
