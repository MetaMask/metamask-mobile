import { Messenger } from '@metamask/messenger';

import {
  CollectiblesController,
  COLLECTIBLES_CONTROLLER_NAME,
  type CollectiblesControllerMessenger,
} from './CollectiblesController';

const setup = () => {
  const messenger: CollectiblesControllerMessenger = new Messenger({
    namespace: COLLECTIBLES_CONTROLLER_NAME,
  });
  const controller = new CollectiblesController({ messenger });
  return { controller, messenger };
};

describe('CollectiblesController', () => {
  it('initializes an empty module state', () => {
    const { controller } = setup();

    expect(controller.name).toBe(COLLECTIBLES_CONTROLLER_NAME);
    expect(controller.state).toStrictEqual({});
  });

  it('exposes its state through the controller messenger', () => {
    const { controller, messenger } = setup();

    const state = messenger.call('CollectiblesController:getState');

    expect(state).toBe(controller.state);
  });

  it('retains an empty state when the wallet resets', () => {
    const { controller } = setup();

    controller.clearState();

    expect(controller.state).toStrictEqual({});
  });
});
