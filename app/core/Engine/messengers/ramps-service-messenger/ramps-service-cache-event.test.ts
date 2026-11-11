import { getRampsServiceMessenger } from './ramps-service-messenger';
import { getRootMessenger } from '../../types';

describe('RampsService cache events', () => {
  it('publishes RampsService:cacheUpdated on the root messenger', () => {
    const rootMessenger = getRootMessenger();
    const serviceMessenger = getRampsServiceMessenger(rootMessenger);
    const listener = jest.fn();
    const payload = {
      hash: 'synthetic-query',
      objectType: 'query' as const,
      type: 'removed' as const,
      state: null,
    };

    rootMessenger.subscribe('RampsService:cacheUpdated', listener);
    serviceMessenger.publish('RampsService:cacheUpdated', payload);

    expect(listener).toHaveBeenCalledWith(payload);
  });
});
