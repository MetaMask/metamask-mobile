import { Messenger, MOCK_ANY_NAMESPACE } from '@metamask/messenger';
import { getRewardsMoneyControllerMessenger } from './index';
import type { RootMessenger } from '../../types';

describe('getRewardsMoneyControllerMessenger', () => {
  it('returns a messenger instance', () => {
    const rootMessenger = new Messenger({
      namespace: MOCK_ANY_NAMESPACE,
    }) as unknown as RootMessenger;

    const messenger = getRewardsMoneyControllerMessenger(rootMessenger);

    expect(messenger).toBeInstanceOf(Messenger);
  });
});
