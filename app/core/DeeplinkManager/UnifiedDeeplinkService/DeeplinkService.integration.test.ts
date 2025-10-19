import { DeeplinkService } from './DeeplinkService';
import { ActionRegistry } from './ActionRegistry';
import { registerAllActions } from './actions';
import { ACTIONS } from '../../../constants/deeplinks';

// Mock dependencies
jest.mock('../Handlers/handleDeepLinkModalDisplay');
jest.mock('../ParseManager/utils/verifySignature', () => ({
  hasSignature: jest.fn(() => false),
  verifyDeeplinkSignature: jest.fn(),
  VALID: 'VALID',
  INVALID: 'INVALID',
  MISSING: 'MISSING',
}));

// Mock AppConstants
jest.mock('../../AppConstants', () => ({
  MM_UNIVERSAL_LINK_HOST: 'metamask.app.link',
  MM_IO_UNIVERSAL_LINK_HOST: 'link.metamask.io',
  MM_IO_UNIVERSAL_LINK_TEST_HOST: 'link-test.metamask.io',
  BUNDLE_IDS: {
    ANDROID: 'io.metamask',
    IOS: 'io.metamask.MetaMask',
  },
  DEEPLINKS: {
    ORIGIN_DEEPLINK: 'deeplink',
    ORIGIN_QR_CODE: 'qr-code',
  },
  WALLET_CONNECT: {
    PROJECT_ID: 'test-project-id',
  },
}));

// Mock navigation
const mockNavigation = {
  navigate: jest.fn(),
};

// Mock handlers
jest.mock('../Handlers/handleRampUrl');
jest.mock('../Handlers/handleSwapUrl');
jest.mock('../Handlers/handleRewardsUrl');
jest.mock('../Handlers/handleDepositCashUrl');
jest.mock('../Handlers/handleHomeUrl');
jest.mock('../Handlers/handleCreateAccountUrl');
jest.mock('../Handlers/handlePerpsUrl');
jest.mock('../Handlers/handleBrowserUrl');
jest.mock('../Handlers/handleEthereumUrl');
jest.mock('../../SDKConnect/SDKConnect');
jest.mock('../../SDKConnect/handlers/handleDeeplink');
jest.mock('../../WalletConnect/WalletConnectV2');
jest.mock('../parseOriginatorInfo');
jest.mock('../../../util/Logger');
jest.mock('../../SDKConnect/utils/DevLogger');
jest.mock('../../../constants/navigation/Routes');

describe('DeeplinkService Integration Tests', () => {
  jest.setTimeout(10000); // Increase timeout for integration tests
  let service: DeeplinkService;
  let registry: ActionRegistry;

  beforeEach(async () => {
    jest.clearAllMocks();

    // Get fresh instances
    service = DeeplinkService.getInstance();
    registry = ActionRegistry.getInstance();
    registry.clear();

    // Register all actions directly instead of using registerDefaultActions
    // which has a dynamic import
    registerAllActions(registry);

    // Wait a bit for any async operations
    await new Promise((resolve) => setTimeout(resolve, 100));
  });

  describe('URL scheme parity', () => {
    const testCases = [
      {
        name: 'buy action',
        traditional: 'metamask://buy?amount=100&chainId=1',
        universal: 'https://link.metamask.io/buy?amount=100&chainId=1',
        expectedAction: ACTIONS.BUY,
      },
      {
        name: 'sell action',
        traditional: 'metamask://sell?amount=50',
        universal: 'https://link.metamask.io/sell?amount=50',
        expectedAction: ACTIONS.SELL,
      },
      {
        name: 'swap action',
        traditional: 'metamask://swap',
        universal: 'https://link.metamask.io/swap',
        expectedAction: ACTIONS.SWAP,
      },
      {
        name: 'rewards action',
        traditional: 'metamask://rewards?referral=ABC123',
        universal: 'https://link.metamask.io/rewards?referral=ABC123',
        expectedAction: ACTIONS.REWARDS,
      },
    ];

    test.each(testCases)(
      '$name - both URL schemes produce same result',
      async ({ traditional, universal, expectedAction }) => {
        // Test traditional deeplink
        const traditionalResult = await service.handleDeeplink(traditional, {
          navigation: mockNavigation,
          origin: 'test',
        });

        expect(traditionalResult).toEqual({
          success: true,
          action: expectedAction,
        });

        // Reset mocks
        jest.clearAllMocks();

        // Test universal link
        const universalResult = await service.handleDeeplink(universal, {
          navigation: mockNavigation,
          origin: 'test',
        });

        expect(universalResult).toEqual({
          success: true,
          action: expectedAction,
        });

        // Both should have called navigation with same parameters
        expect(mockNavigation.navigate).toHaveBeenCalledTimes(2);
        expect(mockNavigation.navigate.mock.calls[0]).toEqual(
          mockNavigation.navigate.mock.calls[1],
        );
      },
    );
  });

  describe('action registration', () => {
    it('registers all expected actions', () => {
      const registeredActions = registry.getAllActions();
      const actionNames = registeredActions.map((a) => a.name);

      // Verify key actions are registered
      expect(actionNames).toContain(ACTIONS.BUY);
      expect(actionNames).toContain(ACTIONS.BUY_CRYPTO);
      expect(actionNames).toContain(ACTIONS.SELL);
      expect(actionNames).toContain(ACTIONS.SELL_CRYPTO);
      expect(actionNames).toContain(ACTIONS.SWAP);
      expect(actionNames).toContain(ACTIONS.REWARDS);
      expect(actionNames).toContain(ACTIONS.PERPS);
      expect(actionNames).toContain(ACTIONS.CREATE_ACCOUNT);
      expect(actionNames).toContain(ACTIONS.DEPOSIT);
      expect(actionNames).toContain(ACTIONS.HOME);
      expect(actionNames).toContain(ACTIONS.WC);
      expect(actionNames).toContain(ACTIONS.CONNECT);
      expect(actionNames).toContain(ACTIONS.MMSDK);
      expect(actionNames).toContain(ACTIONS.ANDROID_SDK);
    });

    it('all actions support both URL schemes where appropriate', () => {
      const registeredActions = registry.getAllActions();

      // Actions that should support both schemes
      const dualSchemeActions = [
        ACTIONS.BUY,
        ACTIONS.SELL,
        ACTIONS.SWAP,
        ACTIONS.REWARDS,
        ACTIONS.PERPS,
        ACTIONS.CREATE_ACCOUNT,
      ];

      dualSchemeActions.forEach((actionName) => {
        const action = registeredActions.find((a) => a.name === actionName);
        expect(action).toBeDefined();
        if (action) {
          expect(action.supportedSchemes).toContain('metamask://');
          expect(action.supportedSchemes).toContain('https://');
        }
      });
    });
  });

  describe('error handling', () => {
    it('handles unknown actions consistently', async () => {
      const traditionalResult = await service.handleDeeplink(
        'metamask://unknown-action',
        { navigation: mockNavigation },
      );

      // Note: Traditional deeplinks without valid action fail validation
      expect(traditionalResult.success).toBe(false);
      expect(traditionalResult.error).toContain('No action specified');

      const universalResult = await service.handleDeeplink(
        'https://link.metamask.io/unknown-action',
        { navigation: mockNavigation },
      );

      expect(universalResult.success).toBe(false);
      expect(universalResult.error).toContain('No handler found');
    });

    it('handles invalid URLs consistently', async () => {
      const result1 = await service.handleDeeplink('not-a-url', {
        navigation: mockNavigation,
      });

      expect(result1.success).toBe(false);
      expect(result1.error).toContain('Failed to parse deeplink');

      const result2 = await service.handleDeeplink('', {
        navigation: mockNavigation,
      });

      expect(result2.success).toBe(false);
      expect(result2.error).toContain('Failed to parse deeplink');
    });
  });
});
