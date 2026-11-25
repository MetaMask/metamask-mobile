import {
  Messenger,
  MOCK_ANY_NAMESPACE,
  type MessengerActions,
  type MessengerEvents,
  type MockAnyNamespace,
} from '@metamask/messenger';

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

const setup = () => {
  const rootMessenger: RootMessenger = new Messenger({
    namespace: MOCK_ANY_NAMESPACE,
  });
  const messenger = getCollectiblesControllerMessenger(rootMessenger);
  return { rootMessenger, messenger };
};

describe('getCollectiblesControllerMessenger', () => {
  it('creates a controller messenger', () => {
    const { messenger } = setup();

    expect(messenger).toBeInstanceOf(Messenger);
  });

  it('exposes the controller state to the root messenger', () => {
    const { rootMessenger, messenger } = setup();
    const state = getDefaultCollectiblesControllerState();
    messenger.registerActionHandler(
      'CollectiblesController:getState',
      () => state,
    );

    const result = rootMessenger.call('CollectiblesController:getState');

    expect(result).toBe(state);
  });

  it('publishes controller state changes to the root messenger', () => {
    const { rootMessenger, messenger } = setup();
    const listener = jest.fn();
    const state = getDefaultCollectiblesControllerState();
    rootMessenger.subscribe('CollectiblesController:stateChanged', listener);

    messenger.publish('CollectiblesController:stateChanged', state, []);

    expect(listener).toHaveBeenCalledWith(state, []);
  });
});
