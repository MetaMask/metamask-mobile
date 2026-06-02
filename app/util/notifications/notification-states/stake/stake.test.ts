import state from './stake';
import {
  createMockNotificationRocketPoolStakeCompleted,
  createMockNotificationRocketPoolUnStakeCompleted,
  createMockNotificationLidoStakeCompleted,
  createMockNotificationLidoWithdrawalCompleted,
} from '../../../../components/UI/Notification/__mocks__/mock_notifications';

describe('stake handler', () => {
  const mockFactories = [
    {
      name: 'RocketPool stake',
      factory: createMockNotificationRocketPoolStakeCompleted,
    },
    {
      name: 'RocketPool unstake',
      factory: createMockNotificationRocketPoolUnStakeCompleted,
    },
    { name: 'Lido stake', factory: createMockNotificationLidoStakeCompleted },
    {
      name: 'Lido withdrawal completed',
      factory: createMockNotificationLidoWithdrawalCompleted,
    },
  ];

  describe('createMenuItem title', () => {
    mockFactories.forEach(({ name, factory }) => {
      it(`returns a non-empty string (${name})`, () => {
        const item = state.createMenuItem(factory());
        expect(typeof item.title).toBe('string');
        expect(item.title.length).toBeGreaterThan(0);
      });
    });
  });
});
