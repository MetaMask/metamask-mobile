import {
  planLiveSubscriptions,
  selectVisibleKeys,
  type MeasuredCard,
} from './planLiveSubscriptions';
import type { SocialLivePriceKey } from './types';

const spotKey = (index: number): SocialLivePriceKey =>
  `spot:eip155:1/erc20:0x${index.toString(16).padStart(40, '0')}`;

describe('planLiveSubscriptions', () => {
  it('splits keys into spot asset ids and perp symbols', () => {
    const plan = planLiveSubscriptions([
      'spot:eip155:1/slip44:60',
      'perp:BTC',
      'perp:xyz:NVDA',
    ]);

    expect(plan).toStrictEqual({
      spotAssetIds: ['eip155:1/slip44:60'],
      perpSymbols: ['BTC', 'xyz:NVDA'],
    });
  });

  it('caps spot channels, keeping the ones highest on screen', () => {
    const keys = Array.from({ length: 5 }, (_, index) => spotKey(index));

    const plan = planLiveSubscriptions(keys, 3);

    expect(plan.spotAssetIds).toStrictEqual(
      keys.slice(0, 3).map((key) => key.slice('spot:'.length)),
    );
  });

  it('dedupes repeated assets', () => {
    const plan = planLiveSubscriptions(['perp:BTC', 'perp:BTC']);

    expect(plan.perpSymbols).toStrictEqual(['BTC']);
  });
});

describe('selectVisibleKeys', () => {
  const viewport = { width: 400, height: 800 };
  const card = (key: SocialLivePriceKey, y: number, x = 0): MeasuredCard => ({
    key,
    x,
    y,
    width: 360,
    height: 100,
  });

  it('keeps cards in the viewport and buffer, ordered top to bottom', () => {
    const keys = selectVisibleKeys(
      [
        card('perp:SOL', 1200),
        card('perp:BTC', 100),
        card('perp:ETH', -300),
        card('perp:DOGE', 2000),
      ],
      viewport,
      800,
    );

    expect(keys).toStrictEqual(['perp:ETH', 'perp:BTC', 'perp:SOL']);
  });

  it('skips cards on other pager pages', () => {
    const keys = selectVisibleKeys(
      [card('perp:BTC', 100, 400), card('perp:ETH', 100, -400)],
      viewport,
      0,
    );

    expect(keys).toStrictEqual([]);
  });

  it('skips unmeasured cards', () => {
    const keys = selectVisibleKeys(
      [{ key: 'perp:BTC', x: 0, y: 0, width: 0, height: 0 }],
      viewport,
      0,
    );

    expect(keys).toStrictEqual([]);
  });

  it('lists an asset once even when several cards show it', () => {
    const keys = selectVisibleKeys(
      [card('perp:BTC', 100), card('perp:BTC', 300)],
      viewport,
      0,
    );

    expect(keys).toStrictEqual(['perp:BTC']);
  });
});
