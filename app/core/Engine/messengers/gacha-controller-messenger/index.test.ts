import {
  Messenger,
  MOCK_ANY_NAMESPACE,
  type MessengerActions,
  type MessengerEvents,
  type MockAnyNamespace,
} from '@metamask/messenger';

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

const setup = () => {
  const rootMessenger: RootMessenger = new Messenger({
    namespace: MOCK_ANY_NAMESPACE,
  });
  const messenger = getGachaControllerMessenger(rootMessenger);
  return { rootMessenger, messenger };
};

describe('getGachaControllerMessenger', () => {
  it('creates a controller messenger', () => {
    const { messenger } = setup();

    expect(messenger).toBeInstanceOf(Messenger);
  });

  it('exposes the controller state to the root messenger', () => {
    const { rootMessenger, messenger } = setup();
    const state = getDefaultGachaControllerState();
    messenger.registerActionHandler('GachaController:getState', () => state);

    const result = rootMessenger.call('GachaController:getState');

    expect(result).toBe(state);
  });

  it('publishes controller state changes to the root messenger', () => {
    const { rootMessenger, messenger } = setup();
    const listener = jest.fn();
    const state = getDefaultGachaControllerState();
    rootMessenger.subscribe('GachaController:stateChanged', listener);

    messenger.publish('GachaController:stateChanged', state, []);

    expect(listener).toHaveBeenCalledWith(state, []);
  });
});
