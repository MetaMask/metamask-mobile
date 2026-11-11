import { getNeoBankServiceMessenger } from '../neo-bank-service-messenger/neo-bank-service-messenger';
import { getTransakServiceMessenger } from '../transak-service-messenger/transak-service-messenger';
import { getRootMessenger } from '../../types';
import { getRampsServiceMessenger } from './ramps-service-messenger';

const removedQuery = {
  objectType: 'query' as const,
  type: 'removed' as const,
  state: null,
};

const granularEvent = <
  Name extends 'RampsService' | 'TransakService' | 'NeoBankService',
>(
  name: Name,
): `${Name}:cacheUpdated:${string}` => `${name}:cacheUpdated:synthetic-entry`;

type RootMessenger = ReturnType<typeof getRootMessenger>;

const cacheCases = [
  {
    event: 'RampsService:cacheUpdated',
    publish: (root: RootMessenger) => {
      const payload = { ...removedQuery, hash: 'synthetic-query' };
      getRampsServiceMessenger(root).publish(
        'RampsService:cacheUpdated',
        payload,
      );
      return payload;
    },
  },
  {
    event: 'RampsService:cacheUpdated:synthetic-entry',
    publish: (root: RootMessenger) => {
      getRampsServiceMessenger(root).publish(
        granularEvent('RampsService'),
        removedQuery,
      );
      return removedQuery;
    },
  },
  {
    event: 'TransakService:cacheUpdated',
    publish: (root: RootMessenger) => {
      const payload = { ...removedQuery, hash: 'synthetic-query' };
      getTransakServiceMessenger(root).publish(
        'TransakService:cacheUpdated',
        payload,
      );
      return payload;
    },
  },
  {
    event: 'TransakService:cacheUpdated:synthetic-entry',
    publish: (root: RootMessenger) => {
      getTransakServiceMessenger(root).publish(
        granularEvent('TransakService'),
        removedQuery,
      );
      return removedQuery;
    },
  },
  {
    event: 'NeoBankService:cacheUpdated',
    publish: (root: RootMessenger) => {
      const payload = { ...removedQuery, hash: 'synthetic-query' };
      getNeoBankServiceMessenger(root).publish(
        'NeoBankService:cacheUpdated',
        payload,
      );
      return payload;
    },
  },
  {
    event: 'NeoBankService:cacheUpdated:synthetic-entry',
    publish: (root: RootMessenger) => {
      getNeoBankServiceMessenger(root).publish(
        granularEvent('NeoBankService'),
        removedQuery,
      );
      return removedQuery;
    },
  },
] as const;

describe('ramps service cache events', () => {
  it.each(cacheCases)(
    'publishes $event on the root messenger',
    ({ event, publish }) => {
      const rootMessenger = getRootMessenger();
      const listener = jest.fn();

      rootMessenger.subscribe(event, listener);
      const payload = publish(rootMessenger);

      expect(listener).toHaveBeenCalledWith(payload);
    },
  );
});
