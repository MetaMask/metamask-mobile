import { Messenger } from '@metamask/messenger';
import { createPackPartnerApi } from '../services/clients/PackPartnerApiClient';

import {
  CollectiblesController,
  COLLECTIBLES_CONTROLLER_NAME,
  getDefaultCollectiblesControllerState,
  type CollectiblesControllerMessenger,
  type CollectiblesControllerState,
} from './CollectiblesController';

const setup = (
  state?: Partial<CollectiblesControllerState>,
  persist = jest.fn().mockResolvedValue(undefined),
): {
  controller: CollectiblesController;
  messenger: CollectiblesControllerMessenger;
} => {
  const messenger: CollectiblesControllerMessenger = new Messenger({
    namespace: COLLECTIBLES_CONTROLLER_NAME,
  });
  const controller = new CollectiblesController({
    messenger,
    state,
    persist,
    packPartner: { api: createPackPartnerApi() },
  });
  return { controller, messenger };
};

describe('CollectiblesController', () => {
  it('initializes a fresh wallet journal', () => {
    const { controller } = setup();

    expect(controller.name).toBe(COLLECTIBLES_CONTROLLER_NAME);
    expect(controller.state).toStrictEqual(
      getDefaultCollectiblesControllerState(),
    );
  });

  it('exposes its state through the controller messenger', () => {
    const { controller, messenger } = setup();

    const state = messenger.call('CollectiblesController:getState');

    expect(state).toBe(controller.state);
  });

  it('keeps a quarantined journal protected until the reset reaches disk', async () => {
    const persist = jest
      .fn()
      .mockRejectedValueOnce(new Error('Disk unavailable'))
      .mockResolvedValue(undefined);
    // An unreadable stored layout reaches the constructor across an untyped disk boundary.
    const state = { hasCompletedOnboarding: true, unreadableJournal: true };
    const { controller } = setup(state, persist);

    await expect(controller.clearState()).rejects.toThrow('Disk unavailable');
    expect(controller.isJournalQuarantined).toBe(true);

    await controller.clearState();
    expect(controller.isJournalQuarantined).toBe(false);
  });

  it('resets the wallet journal', async () => {
    const persist = jest.fn().mockResolvedValue(undefined);
    const { controller } = setup({ hasCompletedOnboarding: true }, persist);

    await controller.clearState();

    expect(persist).toHaveBeenCalledWith(
      getDefaultCollectiblesControllerState(),
    );

    expect(controller.state).toStrictEqual(
      getDefaultCollectiblesControllerState(),
    );
  });
});
