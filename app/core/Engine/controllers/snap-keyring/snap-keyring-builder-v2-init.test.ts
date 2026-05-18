import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';
import { buildMessengerClientInitRequestMock } from '../../utils/test-utils';
import { ExtendedMessenger } from '../../../ExtendedMessenger';
import {
  getSnapKeyringBuilderV2InitMessenger,
  getSnapKeyringBuilderV2Messenger,
  type SnapKeyringBuilderV2InitMessenger,
  type SnapKeyringBuilderV2Messenger,
} from '../../messengers/snap-keyring-builder-v2-messenger';
import type { MessengerClientInitRequest } from '../../types';
import { snapKeyringBuilderV2 } from '../../../SnapKeyring/SnapKeyringV2';
import { snapKeyringBuilderV2Init } from './snap-keyring-builder-v2-init';

jest.mock('../../../SnapKeyring/SnapKeyringV2', () => ({
  ...jest.requireActual('../../../SnapKeyring/SnapKeyringV2'),
  snapKeyringBuilderV2: jest.fn(),
}));

function getInitRequestMock(): jest.Mocked<
  MessengerClientInitRequest<
    SnapKeyringBuilderV2Messenger,
    SnapKeyringBuilderV2InitMessenger
  >
> {
  const baseMessenger = new ExtendedMessenger<MockAnyNamespace, never, never>({
    namespace: MOCK_ANY_NAMESPACE,
  });

  return {
    ...buildMessengerClientInitRequestMock(baseMessenger),
    controllerMessenger: getSnapKeyringBuilderV2Messenger(baseMessenger),
    initMessenger: getSnapKeyringBuilderV2InitMessenger(baseMessenger),
  };
}

describe('snapKeyringBuilderV2Init', () => {
  const v1Builder = Object.assign(jest.fn(), { type: 'snap' });
  const v2Builder = Object.assign(jest.fn(), { type: 'snap' });
  const mockBuilder = {
    name: 'SnapKeyringBuilderV2' as const,
    state: null,
    v1Builder,
    v2Builder,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(snapKeyringBuilderV2).mockReturnValue(mockBuilder);
  });

  it('returns the constructed builder as the controller', () => {
    const requestMock = getInitRequestMock();

    const result = snapKeyringBuilderV2Init(requestMock);

    expect(snapKeyringBuilderV2).toHaveBeenCalledWith(
      requestMock.controllerMessenger,
      {
        persistKeyringHelper: expect.any(Function),
        removeAccountHelper: expect.any(Function),
      },
    );
    expect(result.controller).toBe(mockBuilder);
  });

  it('persistKeyringHelper persists keyrings and updates accounts', async () => {
    const requestMock = getInitRequestMock();
    const initMessengerCallSpy = jest
      .spyOn(requestMock.initMessenger, 'call')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mockResolvedValue(undefined as any);

    snapKeyringBuilderV2Init(requestMock);

    const { persistKeyringHelper } =
      jest.mocked(snapKeyringBuilderV2).mock.calls[0][1];
    await persistKeyringHelper();

    expect(initMessengerCallSpy).toHaveBeenCalledWith(
      'KeyringController:persistAllKeyrings',
    );
    expect(initMessengerCallSpy).toHaveBeenCalledWith(
      'AccountsController:updateAccounts',
    );
  });

  it('removeAccountHelper delegates to the request removeAccount callback', async () => {
    const requestMock = getInitRequestMock();
    snapKeyringBuilderV2Init(requestMock);

    const { removeAccountHelper } =
      jest.mocked(snapKeyringBuilderV2).mock.calls[0][1];
    const address = '0x2a4d4b667D5f12C3F9Bf8F14a7B9f8D8d9b8c8fA';
    await removeAccountHelper(address);

    expect(requestMock.removeAccount).toHaveBeenCalledWith(address);
  });
});
