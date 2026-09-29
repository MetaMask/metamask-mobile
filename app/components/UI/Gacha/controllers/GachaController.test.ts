import { Messenger } from '@metamask/messenger';
import { CollectorCryptProvider } from '../providers/collector-crypt';

import {
  GachaController,
  GACHA_CONTROLLER_NAME,
  type GachaControllerMessenger,
} from './GachaController';

const setup = () => {
  const messenger: GachaControllerMessenger = new Messenger({
    namespace: GACHA_CONTROLLER_NAME,
  });
  const controller = new GachaController({ messenger });
  return { controller, messenger };
};

describe('GachaController', () => {
  it('initializes an empty module state', () => {
    const { controller } = setup();

    expect(controller.name).toBe(GACHA_CONTROLLER_NAME);
    expect(controller.state).toStrictEqual({});
  });

  it('creates its Collector Crypt provider', () => {
    const { controller } = setup();

    expect(controller.collectorCryptProvider).toBeInstanceOf(
      CollectorCryptProvider,
    );
  });

  it('exposes its state through the controller messenger', () => {
    const { controller, messenger } = setup();

    const state = messenger.call('GachaController:getState');

    expect(state).toBe(controller.state);
  });

  it('retains an empty state when the wallet resets', () => {
    const { controller } = setup();

    controller.clearState();

    expect(controller.state).toStrictEqual({});
  });
});
