import { deriveStateFromMetadata } from '@metamask/base-controller';
import { Messenger } from '@metamask/messenger';
import type { VenueAccountAdapter } from '../adapters/types';
import { PredictErrorCode } from '../errors';
import { KALSHI_VENUE_ID, type PredictAccountReadiness } from '../types';
import {
  PredictSessionService,
  type PredictSessionServiceActions,
  type PredictSessionServiceEvents,
  type PredictSessionServiceMessenger,
} from './PredictSessionService';

const setupRequired: PredictAccountReadiness = {
  venueId: KALSHI_VENUE_ID,
  status: 'setup_required',
};

const ready: PredictAccountReadiness = {
  venueId: KALSHI_VENUE_ID,
  status: 'ready',
};

const createMessenger = (): PredictSessionServiceMessenger =>
  new Messenger<
    'PredictSessionService',
    PredictSessionServiceActions,
    PredictSessionServiceEvents
  >({ namespace: 'PredictSessionService' });

describe('PredictSessionService', () => {
  let account: jest.Mocked<VenueAccountAdapter>;
  let authenticate: jest.MockedFunction<() => Promise<void>>;
  let messenger: PredictSessionServiceMessenger;
  let service: PredictSessionService;

  beforeEach(() => {
    account = { fetchAccountReadiness: jest.fn() };
    authenticate = jest.fn().mockResolvedValue(undefined);
    messenger = createMessenger();
    service = new PredictSessionService({
      messenger,
      account,
      authenticate,
      venueId: KALSHI_VENUE_ID,
    });
  });

  afterEach(() => service.destroy());

  it('projects a successful readiness response into runtime state', async () => {
    account.fetchAccountReadiness.mockResolvedValue(setupRequired);

    const result = await messenger.call(
      'PredictSessionService:refreshAccountReadiness',
      KALSHI_VENUE_ID,
    );

    expect(result).toEqual(setupRequired);
    expect(authenticate).toHaveBeenCalledTimes(1);
    expect(service.state).toEqual({
      accountReadiness: setupRequired,
      requestStatus: 'success',
    });
  });

  it('continues after readiness is reset during authentication', async () => {
    authenticate.mockImplementationOnce(async () => {
      service.clearAccountReadiness();
    });
    account.fetchAccountReadiness.mockResolvedValue(setupRequired);

    const result = await service.refreshAccountReadiness(KALSHI_VENUE_ID);

    expect(result).toEqual(setupRequired);
    expect(account.fetchAccountReadiness).toHaveBeenCalledTimes(1);
    expect(service.state.accountReadiness).toEqual(setupRequired);
  });

  it('clears readiness and fails closed after a refresh error', async () => {
    account.fetchAccountReadiness
      .mockResolvedValueOnce(setupRequired)
      .mockRejectedValueOnce(new Error('unavailable'));
    await service.refreshAccountReadiness(KALSHI_VENUE_ID);

    await expect(
      service.refreshAccountReadiness(KALSHI_VENUE_ID),
    ).rejects.toThrow('unavailable');

    expect(service.state).toEqual({
      accountReadiness: null,
      requestStatus: 'error',
    });
  });

  it('fails closed while a readiness refresh is in flight', async () => {
    let resolveReadiness: (value: PredictAccountReadiness) => void = () =>
      undefined;
    account.fetchAccountReadiness
      .mockResolvedValueOnce(setupRequired)
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveReadiness = resolve;
          }),
      );
    await service.refreshAccountReadiness(KALSHI_VENUE_ID);

    const refresh = service.refreshAccountReadiness(KALSHI_VENUE_ID);
    await Promise.resolve();

    expect(service.state).toEqual({
      accountReadiness: null,
      requestStatus: 'loading',
    });
    resolveReadiness(setupRequired);
    await refresh;
  });

  it('ignores an obsolete response after readiness is cleared', async () => {
    let resolveReadiness: (value: PredictAccountReadiness) => void = () =>
      undefined;
    account.fetchAccountReadiness.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveReadiness = resolve;
        }),
    );
    const refresh = service.refreshAccountReadiness(KALSHI_VENUE_ID);
    await Promise.resolve();

    service.clearAccountReadiness();
    resolveReadiness(setupRequired);
    await refresh;

    expect(service.state).toEqual({
      accountReadiness: null,
      requestStatus: 'idle',
    });
  });

  it('keeps the latest readiness when concurrent responses arrive out of order', async () => {
    let resolveFirst: (value: PredictAccountReadiness) => void = () =>
      undefined;
    let resolveSecond: (value: PredictAccountReadiness) => void = () =>
      undefined;
    account.fetchAccountReadiness
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFirst = resolve;
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveSecond = resolve;
          }),
      );
    const firstRefresh = service.refreshAccountReadiness(KALSHI_VENUE_ID);
    const secondRefresh = service.refreshAccountReadiness(KALSHI_VENUE_ID);
    await Promise.resolve();

    resolveSecond(ready);
    await secondRefresh;
    resolveFirst(setupRequired);
    await firstRefresh;

    expect(service.state).toEqual({
      accountReadiness: ready,
      requestStatus: 'success',
    });
  });

  it('does not project readiness when cancellation races with a response', async () => {
    const controller = new AbortController();
    account.fetchAccountReadiness.mockImplementationOnce(async () => {
      controller.abort();
      return setupRequired;
    });

    await service.refreshAccountReadiness(KALSHI_VENUE_ID, {
      signal: controller.signal,
    });

    expect(service.state).toEqual({
      accountReadiness: null,
      requestStatus: 'idle',
    });
  });

  it('rejects another Venue without calling the account capability', async () => {
    await expect(
      service.refreshAccountReadiness('other' as typeof KALSHI_VENUE_ID),
    ).rejects.toMatchObject({ code: PredictErrorCode.UNSUPPORTED_VENUE });

    expect(account.fetchAccountReadiness).not.toHaveBeenCalled();
  });

  it('keeps readiness state out of persistence, logs, and debug snapshots', () => {
    expect(
      deriveStateFromMetadata(service.state, service.metadata, 'persist'),
    ).toEqual({});
    expect(
      deriveStateFromMetadata(
        service.state,
        service.metadata,
        'includeInStateLogs',
      ),
    ).toEqual({});
    expect(
      deriveStateFromMetadata(
        service.state,
        service.metadata,
        'includeInDebugSnapshot',
      ),
    ).toEqual({});
  });

  it('removes the readiness action on destroy', () => {
    service.destroy();

    expect(() =>
      messenger.call(
        'PredictSessionService:refreshAccountReadiness',
        KALSHI_VENUE_ID,
      ),
    ).toThrow();
  });
});
