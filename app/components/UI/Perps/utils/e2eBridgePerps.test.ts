/**
 * Verify E2E bridge wiring without UI:
 * - Forces isE2E=true
 * - Applies controller mocks
 * - Asserts calculateLiquidationPrice returns entryPrice (0.0% distance scenario)
 */

// Force E2E mode for this test
jest.mock('../../../../util/test/utils', () => ({
  isE2E: true,
}));

import {
  applyE2EControllerMocks,
  getE2EMockStreamManager,
} from './e2eBridgePerps';

// Minimal controller stub with update()
class DummyPerpsController {
  public state: Record<string, unknown> = {};

  update(mutator: (s: Record<string, unknown>) => void) {
    mutator(this.state);
  }
}

describe('e2eBridgePerps (no UI)', () => {
  it('applies controller mocks and returns entryPrice as liquidation price', async () => {
    const controller = new DummyPerpsController() as unknown as Record<
      string,
      unknown
    >;

    // Act: apply E2E overrides
    applyE2EControllerMocks(controller);

    // Assert: method added by overrides
    expect(typeof controller.calculateLiquidationPrice).toBe('function');

    const result = await (
      controller.calculateLiquidationPrice as (p: {
        entryPrice: number;
        leverage: number;
        direction: 'long' | 'short';
        asset: string;
      }) => Promise<string>
    )({
      entryPrice: 45000,
      leverage: 10,
      direction: 'long',
      asset: 'BTC',
    });

    expect(result).toBe('45000.00');
  });

  it('exposes a mock stream manager in E2E', () => {
    const stream = getE2EMockStreamManager();
    expect(stream).toBeTruthy();
  });
});
