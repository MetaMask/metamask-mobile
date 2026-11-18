import type { DataServiceInvalidateQueriesAction } from '@metamask/base-data-service';
import {
  Messenger,
  MOCK_ANY_NAMESPACE,
  type MessengerActions,
  type MessengerEvents,
  type MockAnyNamespace,
} from '@metamask/messenger';
import type { SnapControllerHandleRequestAction } from '@metamask/snaps-controllers';

import {
  getDefaultCollectiblesControllerState,
  type CollectiblesControllerMessenger,
} from '../../../../components/UI/Collectibles/controllers/CollectiblesController';
import { getCollectiblesControllerMessenger } from '.';

type RootMessenger = Messenger<
  MockAnyNamespace,
  MessengerActions<CollectiblesControllerMessenger>,
  MessengerEvents<CollectiblesControllerMessenger>
>;

type HandleRequest = SnapControllerHandleRequestAction['handler'];
type InvalidateQueries =
  DataServiceInvalidateQueriesAction<'PackPartnerDataService'>['handler'];

const setup = () => {
  const rootMessenger: RootMessenger = new Messenger({
    namespace: MOCK_ANY_NAMESPACE,
  });
  const handleRequest = jest
    .fn<ReturnType<HandleRequest>, Parameters<HandleRequest>>()
    .mockResolvedValue({ signature: 'signature' });
  const invalidateQueries = jest
    .fn<ReturnType<InvalidateQueries>, Parameters<InvalidateQueries>>()
    .mockResolvedValue(undefined);
  rootMessenger.registerActionHandler(
    'SnapController:handleRequest',
    handleRequest,
  );
  rootMessenger.registerActionHandler(
    'PackPartnerDataService:invalidateQueries',
    invalidateQueries,
  );
  const messenger = getCollectiblesControllerMessenger(rootMessenger);
  return {
    rootMessenger,
    handleRequest,
    invalidateQueries,
    messenger,
  };
};

describe('getCollectiblesControllerMessenger', () => {
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

  it('delegates the PackPartner data-service invalidation to the controller messenger', async () => {
    const { messenger, invalidateQueries } = setup();
    const filters = {
      queryKey: [
        'PackPartnerDataService:getOwnedCards',
        'mainnet',
        '78ieXfmDY4ZG2t6PzY183YjpmpJkmzThgZHV6ZVxyare',
      ] as const,
    };

    await messenger.call('PackPartnerDataService:invalidateQueries', filters);

    expect(invalidateQueries).toHaveBeenCalledWith(filters);
  });

  it('delegates the wallet unlock event to the controller messenger', () => {
    const { rootMessenger, messenger } = setup();
    const listener = jest.fn();
    messenger.subscribe('KeyringController:unlock', listener);

    rootMessenger.publish('KeyringController:unlock');

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('exposes the controller actions to the root messenger', () => {
    const { rootMessenger, messenger } = setup();
    const state = getDefaultCollectiblesControllerState();
    messenger.registerActionHandler(
      'CollectiblesController:getState',
      () => state,
    );

    const result = rootMessenger.call('CollectiblesController:getState');

    expect(result).toBe(state);
  });

  it('publishes the controller state changes to the root messenger', () => {
    const { rootMessenger, messenger } = setup();
    const listener = jest.fn();
    const state = getDefaultCollectiblesControllerState();
    rootMessenger.subscribe('CollectiblesController:stateChanged', listener);

    messenger.publish('CollectiblesController:stateChanged', state, []);

    expect(listener).toHaveBeenCalledWith(state, []);
  });
});
