/**
 * E2E Bridge - Dynamic Mock Injection
 *
 * This bridge allows production code to conditionally use E2E mocks
 * without direct dependencies on E2E files. The bridge automatically
 * configures itself when the isE2E flag is detected.
 */

import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';
import { isE2E } from '../../../../util/test/utils';

// Global bridge for E2E mock injection
export interface E2EBridgePerpsStreaming {
  mockStreamManager?: unknown;
  applyControllerMocks?: (controller: unknown) => void;
}

// Global bridge instance
let e2eBridgePerps: E2EBridgePerpsStreaming = {};

/**
 * Auto-configure E2E bridge when isE2E is true
 */
function autoConfigureE2EBridge(): void {
  if (!isE2E || e2eBridgePerps.mockStreamManager) {
    return; // Already configured or not in E2E mode
  }

  try {
    // Dynamically import E2E modules to avoid build-time dependencies
    // This will only work in E2E environment where these files exist

    // Try to require the modules directly - if they don't exist, this will throw
    /* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires */
    const {
      PerpsE2EMockService,
    } = require('../../../../../e2e/api-mocking/mock-responses/perps-e2e-mocks');
    const {
      applyE2EPerpsControllerMocks,
      createE2EMockStreamManager,
    } = require('../../../../../e2e/api-mocking/mock-config/perps-controller-mixin');
    /* eslint-enable @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires */

    // Initialize mock service
    const mockService = PerpsE2EMockService.getInstance();
    mockService.reset();

    // Create mock stream manager
    const mockStreamManager = createE2EMockStreamManager();

    // Configure bridge
    e2eBridgePerps = {
      mockStreamManager,
      applyControllerMocks: applyE2EPerpsControllerMocks,
    };

    DevLogger.log('E2E Bridge auto-configured successfully');
    DevLogger.log('Mock state:', {
      accountBalance: mockService.getMockAccountState().availableBalance,
      positionsCount: mockService.getMockPositions().length,
      marketsCount: mockService.getMockMarkets().length,
    });
    DevLogger.log(
      'Mock markets:',
      mockService
        .getMockMarkets()
        .map(
          (m: { symbol: string; volume: string }) => `${m.symbol}: ${m.volume}`,
        ),
    );
  } catch (error) {
    // This is expected in production builds where E2E files don't exist
    // or when running in environments that don't have the e2e directory
    DevLogger.log(
      'E2E files not found (expected in production) - skipping mock setup',
    );
  }
}

/**
 * Set E2E bridge from external test setup (legacy support)
 */
export function setE2EBridge(bridge: E2EBridgePerpsStreaming): void {
  if (isE2E) {
    e2eBridgePerps = bridge;
    DevLogger.log('E2E Bridge manually configured:', Object.keys(bridge));
  }
}

/**
 * Get mock stream manager if available
 */
export function getE2EMockStreamManager(): unknown {
  if (isE2E) {
    autoConfigureE2EBridge();
    DevLogger.log(
      'E2E Bridge: Returning mock stream manager:',
      !!e2eBridgePerps.mockStreamManager,
    );
    return e2eBridgePerps.mockStreamManager;
  }
  return null;
}

/**
 * Apply controller mocks if available
 */
export function applyE2EControllerMocks(controller: unknown): void {
  if (isE2E) {
    autoConfigureE2EBridge();
    if (e2eBridgePerps.applyControllerMocks) {
      e2eBridgePerps.applyControllerMocks(controller);
    }
  }
}

export default {
  setE2EBridge,
  getE2EMockStreamManager,
  applyE2EControllerMocks,
};
