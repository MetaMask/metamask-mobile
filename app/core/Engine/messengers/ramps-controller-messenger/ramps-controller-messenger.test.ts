import { Messenger } from '@metamask/messenger';
import {
  RampsControllerActions,
  RampsControllerEvents,
  RampsServiceActions,
  RampsServiceEvents,
} from '@metamask/ramps-controller';
import { getRampsControllerMessenger } from './ramps-controller-messenger';

type AllActions = RampsControllerActions | RampsServiceActions;
type AllEvents = RampsControllerEvents | RampsServiceEvents;

type RootMessenger = Messenger<'Root', AllActions, AllEvents>;

function getRootMessenger(): RootMessenger {
  return new Messenger({
    namespace: 'Root',
  });
}

describe('getRampsControllerMessenger', () => {
  it('returns a messenger', () => {
    const rootMessenger = getRootMessenger();
    const rampsControllerMessenger = getRampsControllerMessenger(rootMessenger);

    expect(rampsControllerMessenger).toBeInstanceOf(Messenger);
  });
});
