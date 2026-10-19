import {
  Messenger,
  MOCK_ANY_NAMESPACE,
  type MockAnyNamespace,
} from '@metamask/messenger';
import { ExtendedMessenger } from '../../../ExtendedMessenger';
import { getCardControllerMessenger } from './index';
import type { RootMessenger } from '../../types';

const getRootMessenger = () =>
  new ExtendedMessenger<MockAnyNamespace, never, never>({
    namespace: MOCK_ANY_NAMESPACE,
  }) as unknown as RootMessenger;

describe('getCardControllerMessenger', () => {
  it('returns a messenger instance', () => {
    const messenger = getCardControllerMessenger(getRootMessenger());

    expect(messenger).toBeInstanceOf(Messenger);
  });

  it('delegates the actions and events the controller uses', () => {
    const rootMessenger = getRootMessenger();
    const delegateSpy = jest.spyOn(rootMessenger, 'delegate');

    getCardControllerMessenger(rootMessenger);

    expect(delegateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        actions: expect.arrayContaining([
          'AuthenticationController:getBearerToken',
          'RemoteFeatureFlagController:getState',
        ]),
        events: expect.arrayContaining([
          'KeyringController:unlock',
          'RemoteFeatureFlagController:stateChange',
        ]),
      }),
    );
  });
});
