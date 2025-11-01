import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
  type MockAnyNamespace,
  MOCK_ANY_NAMESPACE,
} from '@metamask/messenger';
import { SubjectMetadataControllerMessenger } from '@metamask/permission-controller';
import { getSubjectMetadataControllerMessenger } from './subject-metadata-controller-messenger';

type RootMessenger = Messenger<
  MockAnyNamespace,
  MessengerActions<SubjectMetadataControllerMessenger>,
  MessengerEvents<SubjectMetadataControllerMessenger>
>;

const getRootMessenger = (): RootMessenger =>
  new Messenger({
    namespace: MOCK_ANY_NAMESPACE,
  });
describe('getSubjectMetadataControllerMessenger', () => {
  it('returns a messenger', () => {
    const messenger = getRootMessenger();
    const subjectMetadataControllerMessenger =
      getSubjectMetadataControllerMessenger(messenger);

    expect(subjectMetadataControllerMessenger).toBeInstanceOf(Messenger);
  });
});
