import {
  Messenger,
  MOCK_ANY_NAMESPACE,
  type MockAnyNamespace,
} from '@metamask/messenger';
import type { RootMessenger } from '../../types';
import { getRewardsMoneyControllerMessenger } from '.';

function getRootMessenger(): RootMessenger {
  return new Messenger<MockAnyNamespace, never, never>({
    namespace: MOCK_ANY_NAMESPACE,
  }) as unknown as RootMessenger;
}

describe('getRewardsMoneyControllerMessenger', () => {
  it('returns a restricted messenger', () => {
    const rootMessenger = getRootMessenger();

    const messenger = getRewardsMoneyControllerMessenger(rootMessenger);

    expect(messenger).toBeInstanceOf(Messenger);
  });

  it('delegates every data-service action the controller calls', () => {
    const rootMessenger = getRootMessenger();
    const delegateSpy = jest.spyOn(rootMessenger, 'delegate');

    getRewardsMoneyControllerMessenger(rootMessenger);

    expect(delegateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        actions: [
          'RewardsMoneyDataService:getReferralMe',
          'RewardsMoneyDataService:getEarningsSummary',
          'RewardsMoneyDataService:getEarningsLedger',
          'RewardsMoneyDataService:initiateClaim',
        ],
        events: [],
      }),
    );
  });
});
