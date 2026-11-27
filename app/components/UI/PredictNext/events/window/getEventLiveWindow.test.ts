import cryptoUpDownDeterminedEvent from '../../contracts/v1/fixtures/crypto-up-down-determined-event.json';
import cryptoUpDownLiveFeed from '../../contracts/v1/fixtures/crypto-up-down-live-feed.json';
import cryptoUpDownSettledEvent from '../../contracts/v1/fixtures/crypto-up-down-settled-event.json';
import {
  parsePredictEvent,
  parsePredictFeed,
} from '../../contracts/v1/marketData';
import { getEventLiveWindow } from './getEventLiveWindow';

jest.mock('../../../../../core/SDKConnect/utils/DevLogger', () => ({
  DevLogger: { log: jest.fn() },
}));

const [liveEvent] = parsePredictFeed(cryptoUpDownLiveFeed).events;

describe('getEventLiveWindow', () => {
  it('returns the window of an Up/Down Event with its clock input', () => {
    const result = getEventLiveWindow(liveEvent);

    expect(result).toMatchObject({
      kind: 'crypto_up_down',
      startsAt: '2026-11-26T23:00:00.000Z',
      endsAt: '2026-11-26T23:15:00.000Z',
    });
    expect(result?.window.coin).toBe('BTC');
    expect(result?.market.id).toBe('KXBTC15M-26NOV261815-15');
  });

  it('returns the window of a settled Event', () => {
    const result = getEventLiveWindow(
      parsePredictEvent(cryptoUpDownSettledEvent),
    );

    expect(result?.window.settledPrice).toBe('60461.27');
  });

  it('returns the window of a determined Event with no settled price yet', () => {
    const result = getEventLiveWindow(
      parsePredictEvent(cryptoUpDownDeterminedEvent),
    );

    expect(result?.window.settledPrice).toBeUndefined();
    expect(result?.market.status).toBe('determined');
  });

  it('returns undefined for a standard Event', () => {
    const { window: _removed, ...standard } = liveEvent;

    expect(getEventLiveWindow(standard)).toBeUndefined();
  });

  it('returns undefined when the window kind was unknown at parse time', () => {
    const event = parsePredictEvent({
      ...cryptoUpDownLiveFeed.events[0],
      window: { kind: 'future_kind' },
    });

    expect(getEventLiveWindow(event)).toBeUndefined();
  });

  it('returns undefined without an open time', () => {
    const { startsAt: _removed, ...withoutStart } = liveEvent;

    expect(getEventLiveWindow(withoutStart)).toBeUndefined();
  });

  it('returns undefined without a close time', () => {
    const { closesAt: _removed, ...withoutClose } = liveEvent;

    expect(getEventLiveWindow(withoutClose)).toBeUndefined();
  });

  it('returns undefined without a Market', () => {
    expect(getEventLiveWindow({ ...liveEvent, markets: [] })).toBeUndefined();
  });
});
