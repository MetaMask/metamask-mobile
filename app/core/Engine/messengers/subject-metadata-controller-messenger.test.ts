import { Messenger, RestrictedMessenger } from '@metamask/base-controller';
import { getSubjectMetadataControllerMessenger } from './subject-metadata-controller-messenger';

describe('getSubjectMetadataControllerMessenger', () => {
  it('returns a restricted messenger', () => {
    const messenger = new Messenger<never, never>();
    const subjectMetadataControllerMessenger =
      getSubjectMetadataControllerMessenger(messenger);

    expect(subjectMetadataControllerMessenger).toBeInstanceOf(
      RestrictedMessenger,
    );
  });
});
