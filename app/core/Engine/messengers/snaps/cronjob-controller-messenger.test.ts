import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
  MOCK_ANY_NAMESPACE,
  type MockAnyNamespace,
} from '@metamask/messenger';
import { CronjobControllerMessenger } from '@metamask/snaps-controllers';
import { getCronjobControllerMessenger } from './cronjob-controller-messenger';

type RootMessenger = Messenger<
  MockAnyNamespace,
  MessengerActions<CronjobControllerMessenger>,
  MessengerEvents<CronjobControllerMessenger>
>;

const getRootMessenger = (): RootMessenger =>
  new Messenger<MockAnyNamespace, never, never>({
    namespace: MOCK_ANY_NAMESPACE,
  });

describe('getCronjobControllerMessenger', () => {
  it('returns a messenger', () => {
    const rootMessenger = getRootMessenger();

    const cronjobControllerMessenger =
      getCronjobControllerMessenger(rootMessenger);

    expect(cronjobControllerMessenger).toBeInstanceOf(Messenger);
  });
});
