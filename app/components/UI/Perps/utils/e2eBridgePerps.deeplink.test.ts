/**
 * Quick test to verify deep link command wiring for pushing prices in E2E mode.
 * - Forces isE2E=true
 * - Mocks Linking and E2E modules
 * - Triggers a deep link and asserts mockPushPrice is called with expected args
 */

// Force E2E mode
jest.mock('../../../../util/test/utils', () => ({ isE2E: true }));

// Capture Linking listeners
const urlListeners: ((e: { url: string }) => void)[] = [];
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    Linking: {
      addEventListener: jest.fn(
        (event: string, cb: (e: { url: string }) => void) => {
          if (event === 'url') urlListeners.push(cb);
          return { remove: jest.fn() } as unknown as void;
        },
      ),
    },
  };
});

// Mock E2E modules dynamically imported by the bridge
const mockPushPrice = jest.fn().mockReturnValue(true);
jest.mock(
  '../../../../../e2e/api-mocking/mock-responses/perps-e2e-mocks',
  () => ({
    PerpsE2EMockService: {
      getInstance: () => ({
        reset: jest.fn(),
        getMockAccountState: () => ({ availableBalance: '10000.00' }),
        getMockPositions: () => [],
        getMockMarkets: () => [],
        mockPushPrice,
      }),
    },
  }),
);

jest.mock(
  '../../../../../e2e/api-mocking/mock-config/perps-controller-mixin',
  () => ({
    applyE2EPerpsControllerMocks: jest.fn(),
    createE2EMockStreamManager: jest.fn(() => ({ prices: {}, positions: {} })),
  }),
);

import { Linking } from 'react-native';
import { getE2EMockStreamManager } from './e2eBridgePerps';

describe('e2eBridgePerps deep-link price push (no UI)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    urlListeners.splice(0, urlListeners.length);
  });

  it('invokes mockPushPrice when receiving e2e://perps/push-price', () => {
    // Trigger auto-configuration (registers deep link handler)
    expect(getE2EMockStreamManager()).toBeTruthy();

    // Retrieve handler from mock calls (robust across RN versions)
    const add = Linking.addEventListener as unknown as jest.Mock;
    expect(add).toHaveBeenCalled();
    const call = add.mock.calls.find((c: unknown[]) => c[0] === 'url');
    const handler = call?.[1] as (e: { url: string }) => void;
    expect(typeof handler).toBe('function');

    // Simulate deep link
    handler({ url: 'e2e://perps/push-price?symbol=BTC&price=50000.00' });

    expect(mockPushPrice).toHaveBeenCalledWith('BTC', '50000.00');
  });
});
