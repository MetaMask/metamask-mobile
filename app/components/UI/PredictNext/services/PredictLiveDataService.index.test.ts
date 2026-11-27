import { Messenger } from '@metamask/messenger';
import type { PredictLiveDataClient } from '../adapters/remote/PredictLiveDataClient';
import type {
  PredictIndexError,
  PredictIndexLive,
  PredictIndexSnapshot,
} from '../contracts/v1/liveData';
import type {
  PredictEntityId,
  PredictTimestamp,
  PredictVenueId,
} from '../types';
import {
  PREDICT_LIVE_DATA_SERVICE_NAME,
  PredictLiveDataService,
  type PredictLiveDataServiceMessenger,
  type PredictLiveDataTransportCallbacks,
} from './PredictLiveDataService';

const venueId = 'kalshi' as PredictVenueId;
const eventId = 'KXBTC15M-26NOV261815' as PredictEntityId;
const START = Date.parse('2026-11-26T23:00:00.000Z');

const iso = (seconds: number) => new Date(START + seconds * 1000).toISOString();

const tick = (seconds: number, average = `${60000 + seconds}.00`) =>
  ({
    venueId,
    eventId,
    coin: 'BTC',
    average60s: average,
    observedAt: iso(seconds),
  }) as PredictIndexLive;

const snapshot = (seconds: number, pointSeconds: number[] = [0, 5]) =>
  ({
    ...tick(seconds),
    points: pointSeconds.map((time) => ({
      time: iso(time) as PredictTimestamp,
      value: `${60000 + time}.00`,
    })),
  }) as PredictIndexSnapshot;

const NAME = PREDICT_LIVE_DATA_SERVICE_NAME;

const setup = (released: readonly PredictEntityId[] = []) => {
  const messenger: PredictLiveDataServiceMessenger = new Messenger({
    namespace: NAME,
  });
  const client = {
    subscribe: jest.fn(),
    unsubscribe: jest.fn(() => released),
    destroy: jest.fn(),
  } as unknown as PredictLiveDataClient;
  let callbacks!: PredictLiveDataTransportCallbacks;
  const service = new PredictLiveDataService({
    messenger,
    createClient: (value) => {
      callbacks = value;
      return client;
    },
    resolveEvent: jest.fn(),
    venueId,
  });

  const snapshots: PredictIndexSnapshot[] = [];
  const ticks: PredictIndexLive[] = [];
  const failures: PredictIndexError[] = [];
  const releases: { venueId: PredictVenueId; eventId: PredictEntityId }[] = [];
  messenger.subscribe(`${NAME}:indexSnapshotUpdated`, (value) =>
    snapshots.push(value),
  );
  messenger.subscribe(`${NAME}:indexUpdated`, (value) => ticks.push(value));
  messenger.subscribe(`${NAME}:indexFailed`, (value) => failures.push(value));
  messenger.subscribe(`${NAME}:indexReleased`, (value) => releases.push(value));

  return {
    service,
    messenger,
    client,
    callbacks: () => callbacks,
    snapshots,
    ticks,
    failures,
    releases,
    watch: () => messenger.call(`${NAME}:watchIndex`, venueId, [eventId]),
    unwatch: () => messenger.call(`${NAME}:unwatchIndex`, venueId, [eventId]),
  };
};

describe('PredictLiveDataService index topic', () => {
  it('subscribes the Event on the index topic once for several watchers', () => {
    const { client, watch, unwatch } = setup([eventId]);

    watch();
    watch();

    expect(client.subscribe).toHaveBeenCalledTimes(2);
    expect(client.subscribe).toHaveBeenCalledWith('index', venueId, [eventId]);

    unwatch();
    unwatch();

    expect(client.unsubscribe).toHaveBeenCalledWith('index', venueId, [
      eventId,
    ]);
  });

  it('publishes a snapshot and ticks for a watched Event', () => {
    const { watch, callbacks, snapshots, ticks } = setup();
    watch();

    callbacks().onIndexSnapshot(snapshot(3));
    callbacks().onIndexUpdate(tick(4));

    expect(snapshots).toEqual([snapshot(3)]);
    expect(ticks).toEqual([tick(4)]);
  });

  it('ignores frames for an Event nobody watches', () => {
    const { callbacks, snapshots, ticks, failures } = setup();

    callbacks().onIndexSnapshot(snapshot(3));
    callbacks().onIndexUpdate(tick(4));
    callbacks().onIndexError({
      venueId,
      eventId,
      code: 'upstream_stale',
      message: 'behind',
    });

    expect(snapshots).toEqual([]);
    expect(ticks).toEqual([]);
    expect(failures).toEqual([]);
  });

  it('ignores frames of another Venue', () => {
    const { watch, callbacks, ticks } = setup();
    watch();

    callbacks().onIndexUpdate({
      ...tick(4),
      venueId: 'other' as PredictVenueId,
    });

    expect(ticks).toEqual([]);
  });

  it('drops a tick that is older than the last one', () => {
    const { watch, callbacks, ticks } = setup();
    watch();

    callbacks().onIndexUpdate(tick(10));
    callbacks().onIndexUpdate(tick(8));

    expect(ticks).toEqual([tick(10)]);
  });

  it('publishes an index error for a watched Event', () => {
    const { watch, callbacks, failures } = setup();
    watch();
    const error = {
      venueId,
      eventId,
      code: 'no_live_data',
      message: 'No index feed for this Event.',
    };

    callbacks().onIndexError(error);

    expect(failures).toEqual([error]);
  });

  describe('last-value cache', () => {
    it('replays the last snapshot, with the ticks since, to a late watcher', () => {
      const { watch, callbacks, snapshots } = setup();
      watch();
      callbacks().onIndexSnapshot(snapshot(3, [0, 5]));
      callbacks().onIndexUpdate(tick(10));
      snapshots.length = 0;

      watch();

      expect(snapshots).toHaveLength(1);
      expect(snapshots[0]).toMatchObject({
        average60s: '60010.00',
        observedAt: iso(10),
      });
      expect(snapshots[0].points.map(({ time }) => time)).toEqual([
        iso(0),
        iso(5),
        iso(10),
      ]);
    });

    it('replays nothing before a first frame', () => {
      const { watch, snapshots } = setup();

      watch();
      watch();

      expect(snapshots).toEqual([]);
    });

    it('builds the replay from ticks when no snapshot came', () => {
      const { watch, callbacks, snapshots } = setup();
      watch();
      callbacks().onIndexUpdate(tick(1));

      watch();

      expect(snapshots[0].points).toEqual([
        { time: iso(1), value: '60001.00' },
      ]);
    });

    it('does not let a replay change what an earlier watcher holds', () => {
      const { watch, callbacks, snapshots } = setup();
      watch();
      callbacks().onIndexSnapshot(snapshot(3, [0, 5]));
      watch();
      const replayed = snapshots[snapshots.length - 1];

      callbacks().onIndexUpdate(tick(10));

      expect(replayed.points).toHaveLength(2);
    });

    it('thins and trims the cached series like the hook series', () => {
      const { watch, callbacks, snapshots } = setup();
      watch();
      callbacks().onIndexSnapshot(snapshot(0, [0]));

      for (let seconds = 1; seconds <= 12; seconds += 1) {
        callbacks().onIndexUpdate(tick(seconds));
      }
      snapshots.length = 0;
      watch();

      expect(snapshots[0].points.map(({ time }) => time)).toEqual([
        iso(0),
        iso(5),
        iso(10),
      ]);
    });

    it('drops the cache when the last watcher leaves', () => {
      const { watch, unwatch, callbacks, snapshots } = setup([eventId]);
      watch();
      callbacks().onIndexSnapshot(snapshot(3));
      unwatch();
      snapshots.length = 0;

      watch();

      expect(snapshots).toEqual([]);
    });

    it('keeps the cache while another watcher remains', () => {
      const { watch, unwatch, callbacks, snapshots } = setup([]);
      watch();
      watch();
      callbacks().onIndexSnapshot(snapshot(3));
      unwatch();
      snapshots.length = 0;

      watch();

      expect(snapshots).toHaveLength(1);
    });

    it('ignores a snapshot that is older than the cached value', () => {
      const { watch, callbacks, snapshots } = setup();
      watch();
      callbacks().onIndexUpdate(tick(20));

      callbacks().onIndexSnapshot(snapshot(5));

      expect(snapshots).toEqual([]);
    });
  });

  describe('released by the server', () => {
    it('drops every watcher and the cache, and says so once', () => {
      const { watch, callbacks, snapshots, releases } = setup();
      watch();
      watch();
      callbacks().onIndexSnapshot(snapshot(3));

      callbacks().onIndexReleased([eventId]);
      callbacks().onIndexReleased([eventId]);
      snapshots.length = 0;
      watch();

      expect(releases).toEqual([{ venueId, eventId }]);
      expect(snapshots).toEqual([]);
    });

    it('ignores frames for the Event after the release', () => {
      const { watch, callbacks, ticks, failures } = setup();
      watch();
      callbacks().onIndexReleased([eventId]);

      callbacks().onIndexUpdate(tick(4));
      callbacks().onIndexError({
        venueId,
        eventId,
        code: 'upstream_stale',
        message: 'behind',
      });

      expect(ticks).toEqual([]);
      expect(failures).toEqual([]);
    });

    it('ignores a release for an Event nobody watches', () => {
      const { callbacks, releases } = setup();

      callbacks().onIndexReleased([eventId]);

      expect(releases).toEqual([]);
    });

    it('lets a late unwatch from a hook pass without an error', () => {
      const { watch, unwatch, callbacks } = setup();
      watch();
      callbacks().onIndexReleased([eventId]);

      expect(() => unwatch()).not.toThrow();
    });
  });

  it('throws for another Venue', () => {
    const { messenger } = setup();

    expect(() =>
      messenger.call(`${NAME}:watchIndex`, 'other' as PredictVenueId, [
        eventId,
      ]),
    ).toThrow();
  });

  it('removes its handlers and cache on destroy', () => {
    const { service, client, messenger, watch } = setup();
    watch();

    service.destroy();

    expect(client.destroy).toHaveBeenCalled();
    expect(() =>
      messenger.call(`${NAME}:watchIndex`, venueId, [eventId]),
    ).toThrow();
  });
});
