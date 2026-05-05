/**
 * Layer 1 for PerpsMini — behaviour + fixture verification.
 *
 * The "fixtures" suite re-runs a representative scenario through the real
 * controller and diffs `state` against committed JSON. CV tests downstream
 * import the same JSON. If the controller's emitted shape changes, the
 * diff fails in PR. To regenerate intentionally: UPDATE_FIXTURES=1 npm test
 */
import * as fs from 'fs';
import * as path from 'path';
import { PerpsMini } from '../src/PerpsMini';
import { assertPerpsMiniState } from './perpsMiniContract';

const FIXTURE_DIR = path.join(__dirname, '__fixtures__');

describe('PerpsMini — behaviour', () => {
  it('opens a long position with currentPrice', async () => {
    const perps = new PerpsMini();
    await perps.placeOrder({
      symbol: 'BTC',
      isBuy: true,
      size: 1,
      orderType: 'market',
      currentPrice: 50_000,
    });
    expect(perps.state.positions.BTC).toEqual({
      side: 'long',
      size: 1,
      markPrice: 50_000,
    });
  });

  it('rejects a market order with no currentPrice', async () => {
    const perps = new PerpsMini();
    await expect(
      perps.placeOrder({ symbol: 'BTC', isBuy: true, size: 1, orderType: 'market' }),
    ).rejects.toThrow('ORDER_PRICE_REQUIRED');
  });

  it('accepts a limit order using its limit price as fallback', async () => {
    const perps = new PerpsMini();
    await perps.placeOrder({
      symbol: 'BTC',
      isBuy: true,
      size: 1,
      orderType: 'limit',
      price: 49_000,
    });
    expect(perps.state.positions.BTC?.markPrice).toBe(49_000);
  });
});

describe('PerpsMini — fixtures (single source of truth for component tests)', () => {
  beforeAll(() => fs.mkdirSync(FIXTURE_DIR, { recursive: true }));

  it('emits the documented state for "BTC 1x long opened"', async () => {
    const perps = new PerpsMini();
    await perps.placeOrder({
      symbol: 'BTC',
      isBuy: true,
      size: 1,
      orderType: 'market',
      currentPrice: 50_000,
    });

    const fixturePath = path.join(FIXTURE_DIR, 'perpsBtcLong.json');
    const actual = JSON.parse(JSON.stringify(perps.state));

    // Belt-and-suspenders: the fixture must always satisfy the contract
    // that downstream CV tests will check against.
    assertPerpsMiniState(actual);

    if (process.env.UPDATE_FIXTURES === '1' || !fs.existsSync(fixturePath)) {
      fs.writeFileSync(fixturePath, JSON.stringify(actual, null, 2) + '\n');
    }

    const committed = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'));
    expect(actual).toEqual(committed);
  });
});
