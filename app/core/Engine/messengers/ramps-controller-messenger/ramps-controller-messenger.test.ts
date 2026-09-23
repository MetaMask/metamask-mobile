import { Messenger, type MessengerEvents } from '@metamask/messenger';
import {
  RAMPS_CONTROLLER_REQUIRED_CONTROLLER_ACTIONS,
  RAMPS_CONTROLLER_REQUIRED_SERVICE_ACTIONS,
  RampsControllerActions,
  RampsControllerEvents,
  RampsServiceActions,
  RampsServiceEvents,
  type RampsControllerMessenger,
} from '@metamask/ramps-controller';
import { getRampsControllerMessenger } from './ramps-controller-messenger';

type AllActions = RampsControllerActions | RampsServiceActions;
type AllEvents =
  | RampsControllerEvents
  | RampsServiceEvents
  | MessengerEvents<RampsControllerMessenger>;

type RootMessenger = Messenger<'Root', AllActions, AllEvents>;

function getRootMessenger(): RootMessenger {
  return new Messenger({
    namespace: 'Root',
  });
}

function getDelegatedActions(rootMessenger: RootMessenger): string[] {
  const delegate = jest.spyOn(rootMessenger, 'delegate');

  getRampsControllerMessenger(rootMessenger);

  return delegate.mock.calls.flatMap(([{ actions }]) => actions ?? []);
}

describe('getRampsControllerMessenger', () => {
  it('returns a messenger', () => {
    const rootMessenger = getRootMessenger();
    const rampsControllerMessenger = getRampsControllerMessenger(rootMessenger);

    expect(rampsControllerMessenger).toBeInstanceOf(Messenger);
  });

  it('delegates RemoteFeatureFlagController:getState', () => {
    const actions = getDelegatedActions(getRootMessenger());

    expect(actions).toContain('RemoteFeatureFlagController:getState');
  });

  it('delegates every action the ramps-controller package declares as required', () => {
    const actions = getDelegatedActions(getRootMessenger());

    expect(actions).toStrictEqual(
      expect.arrayContaining([
        ...RAMPS_CONTROLLER_REQUIRED_SERVICE_ACTIONS,
        ...RAMPS_CONTROLLER_REQUIRED_CONTROLLER_ACTIONS,
      ]),
    );
  });

  it('delegates each action only once', () => {
    const actions = getDelegatedActions(getRootMessenger());

    expect(actions).toStrictEqual([...new Set(actions)]);
  });
});
