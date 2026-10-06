import {
  Messenger,
  MOCK_ANY_NAMESPACE,
  type MessengerActions,
  type MessengerEvents,
  type MockAnyNamespace,
} from '@metamask/messenger';
import type { SnapControllerHandleRequestAction } from '@metamask/snaps-controllers';

import {
  getDefaultGachaControllerState,
  type GachaControllerMessenger,
} from '../../../../components/UI/Gacha/controllers/GachaController';
import { getGachaControllerMessenger } from '.';

type RootMessenger = Messenger<
  MockAnyNamespace,
  MessengerActions<GachaControllerMessenger>,
  MessengerEvents<GachaControllerMessenger>
>;

type HandleRequest = SnapControllerHandleRequestAction['handler'];

const setup = () => {
  const rootMessenger: RootMessenger = new Messenger({
    namespace: MOCK_ANY_NAMESPACE,
  });
  const handleRequest = jest
    .fn<ReturnType<HandleRequest>, Parameters<HandleRequest>>()
    .mockResolvedValue({ signature: 'signature' });
  rootMessenger.registerActionHandler(
    'SnapController:handleRequest',
    handleRequest,
  );
  const messenger = getGachaControllerMessenger(rootMessenger);
  return { rootMessenger, handleRequest, messenger };
};

describe('getGachaControllerMessenger', () => {
  it('delegates the Solana snap request to the controller messenger', async () => {
    const { messenger, handleRequest } = setup();
    const args: Parameters<HandleRequest>[0] = {
      origin: 'metamask',
      snapId: 'npm:@metamask/solana-wallet-snap',
      handler: 'onClientRequest',
      request: { jsonrpc: '2.0', id: '1', method: 'signTransaction' },
    } as unknown as Parameters<HandleRequest>[0];

    const result = await messenger.call('SnapController:handleRequest', args);

    expect(result).toStrictEqual({ signature: 'signature' });
    expect(handleRequest).toHaveBeenCalledWith(args);
  });

  it('exposes the controller actions to the root messenger', () => {
    const { rootMessenger, messenger } = setup();
    const state = getDefaultGachaControllerState();
    messenger.registerActionHandler('GachaController:getState', () => state);

    expect(rootMessenger.call('GachaController:getState')).toBe(state);
  });

  it('publishes the controller state changes to the root messenger', () => {
    const { rootMessenger, messenger } = setup();
    const listener = jest.fn();
    const state = getDefaultGachaControllerState();
    rootMessenger.subscribe('GachaController:stateChanged', listener);

    messenger.publish('GachaController:stateChanged', state, []);

    expect(listener).toHaveBeenCalledWith(state, []);
  });
});
