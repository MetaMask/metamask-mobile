import { DeeplinkService, DeeplinkServiceOptions } from './DeeplinkService';
import { ActionRegistry, DeeplinkAction } from './ActionRegistry';
import { NavigationProp, ParamListBase } from '@react-navigation/native';
import { ACTIONS } from '../../../constants/deeplinks';
import handleDeepLinkModalDisplay from '../Handlers/handleDeepLinkModalDisplay';
import {
  verifyDeeplinkSignature,
  MISSING,
  VALID,
} from '../ParseManager/utils/verifySignature';
import { DeepLinkModalLinkType } from '../../../components/UI/DeepLinkModal';

// Mock dependencies
jest.mock('../Handlers/handleDeepLinkModalDisplay');
jest.mock('../ParseManager/utils/verifySignature', () => ({
  hasSignature: jest.fn(),
  verifyDeeplinkSignature: jest.fn(),
  VALID: 'VALID',
  INVALID: 'INVALID',
  MISSING: 'MISSING',
}));

const { INVALID } = jest.requireMock('../ParseManager/utils/verifySignature');

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
}));

describe('DeeplinkService', () => {
  let service: DeeplinkService;
  let actionRegistry: ActionRegistry;

  const mockHandleDeepLinkModalDisplay =
    handleDeepLinkModalDisplay as jest.MockedFunction<
      typeof handleDeepLinkModalDisplay
    >;
  const mockVerifyDeeplinkSignature = verifyDeeplinkSignature as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    // Get fresh instances
    service = DeeplinkService.getInstance();
    actionRegistry = ActionRegistry.getInstance();

    // Clear action registry
    actionRegistry.clear();

    // Default mock for modal display - auto-approve
    mockHandleDeepLinkModalDisplay.mockImplementation((params) => {
      if (
        params.linkType === DeepLinkModalLinkType.PUBLIC ||
        params.linkType === DeepLinkModalLinkType.PRIVATE
      ) {
        if ('onContinue' in params) {
          params.onContinue();
        }
      }
    });

    // Default mock for signature verification
    mockVerifyDeeplinkSignature.mockResolvedValue(MISSING);
  });

  describe('singleton pattern', () => {
    it('returns the same instance', () => {
      const instance1 = DeeplinkService.getInstance();
      const instance2 = DeeplinkService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('handleDeeplink', () => {
    const mockBuyHandler = jest.fn().mockResolvedValue(undefined);
    const buyAction: DeeplinkAction = {
      name: ACTIONS.BUY,
      handler: mockBuyHandler,
      supportedSchemes: ['metamask://', 'https://'],
    };

    beforeEach(() => {
      actionRegistry.register(buyAction);
    });

    it('handles traditional deeplink successfully', async () => {
      const url = 'metamask://buy?amount=100';
      const options: DeeplinkServiceOptions = {
        origin: 'test',
      };

      const result = await service.handleDeeplink(url, options);

      expect(result).toEqual({
        success: true,
        action: ACTIONS.BUY,
      });
      expect(mockBuyHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          action: ACTIONS.BUY,
          originalUrl: url,
          scheme: 'metamask:',
        }),
      );
    });

    it('handles universal link successfully', async () => {
      const url = 'https://link.metamask.io/buy?amount=100';
      const result = await service.handleDeeplink(url);

      expect(result).toEqual({
        success: true,
        action: ACTIONS.BUY,
      });
      expect(mockBuyHandler).toHaveBeenCalled();
    });

    it('calls onHandled callback when provided', async () => {
      const onHandled = jest.fn();
      const url = 'metamask://buy';

      await service.handleDeeplink(url, { onHandled });

      expect(onHandled).toHaveBeenCalled();
    });

    it('shows modal for public links', async () => {
      mockHandleDeepLinkModalDisplay.mockImplementation((params) => {
        expect(params.linkType).toBe(DeepLinkModalLinkType.PUBLIC);
        if ('pageTitle' in params) {
          expect(params.pageTitle).toBe('Buy');
        }
        if ('onContinue' in params) {
          params.onContinue();
        }
      });

      const url = 'https://link.metamask.io/buy';
      const result = await service.handleDeeplink(url);

      expect(result.success).toBe(true);
      expect(mockHandleDeepLinkModalDisplay).toHaveBeenCalled();
    });

    it('shows modal for private links with valid signature', async () => {
      mockVerifyDeeplinkSignature.mockResolvedValue(VALID);
      mockHandleDeepLinkModalDisplay.mockImplementation((params) => {
        expect(params.linkType).toBe(DeepLinkModalLinkType.PRIVATE);
        if ('onContinue' in params) {
          params.onContinue();
        }
      });

      const url = 'https://link.metamask.io/buy?sig=valid-signature';
      const result = await service.handleDeeplink(url);

      expect(result.success).toBe(true);
      expect(mockHandleDeepLinkModalDisplay).toHaveBeenCalled();
    });

    it('returns error when user declines modal', async () => {
      mockHandleDeepLinkModalDisplay.mockImplementation((params) => {
        params.onBack();
      });

      const url = 'https://link.metamask.io/buy';
      const result = await service.handleDeeplink(url);

      expect(result).toEqual({
        success: false,
        shouldProceed: false,
      });
      expect(mockBuyHandler).not.toHaveBeenCalled();
    });

    it('shows modal for invalid universal link domains', async () => {
      mockHandleDeepLinkModalDisplay.mockImplementation((params) => {
        expect(params.linkType).toBe(DeepLinkModalLinkType.INVALID);
        params.onBack(); // User declines
      });

      const url = 'https://evil.com/buy';
      const result = await service.handleDeeplink(url);

      expect(result.success).toBe(false);
      expect(result.shouldProceed).toBe(false);
      expect(mockHandleDeepLinkModalDisplay).toHaveBeenCalled();
    });

    it('returns error for traditional deeplink without action', async () => {
      // Traditional deeplink without action should fail validation
      const url = 'metamask://';
      const result = await service.handleDeeplink(url);

      expect(result.success).toBe(false);
      expect(result.error).toContain('No action specified');
      expect(mockHandleDeepLinkModalDisplay).not.toHaveBeenCalled();
    });

    it('returns error for unknown action', async () => {
      // For universal links with unknown actions, it shows an INVALID modal
      mockHandleDeepLinkModalDisplay.mockImplementation((params) => {
        expect(params.linkType).toBe(DeepLinkModalLinkType.INVALID);
        // Call onBack to simulate user clicking back
        params.onBack();
      });

      // Use a valid URL format but with an unregistered action
      const url = 'https://link.metamask.io/unknown-action';
      const result = await service.handleDeeplink(url);

      expect(result.success).toBe(false);
      // When user clicks back on INVALID modal, there's no specific error message
      expect(result.error).toBeUndefined();
      expect(mockHandleDeepLinkModalDisplay).toHaveBeenCalled();
    });

    it('skips modal for whitelisted actions', async () => {
      const wcHandler = jest.fn().mockResolvedValue(undefined);
      actionRegistry.register({
        name: ACTIONS.WC,
        handler: wcHandler,
        supportedSchemes: ['*'],
      });

      const url = 'metamask://wc?uri=wc:connection';
      const result = await service.handleDeeplink(url);

      expect(result.success).toBe(true);
      expect(mockHandleDeepLinkModalDisplay).not.toHaveBeenCalled();
      expect(wcHandler).toHaveBeenCalled();
    });

    it('passes navigation to action handler', async () => {
      const mockNavigation = {
        navigate: jest.fn(),
      } as unknown as NavigationProp<ParamListBase>;
      const url = 'metamask://buy';

      await service.handleDeeplink(url, {
        navigation: mockNavigation,
      });

      expect(mockBuyHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          navigation: mockNavigation,
        }),
      );
    });

    it('passes browserCallBack for dapp action', async () => {
      const dappHandler = jest.fn().mockResolvedValue(undefined);
      actionRegistry.register({
        name: ACTIONS.DAPP,
        handler: dappHandler,
        supportedSchemes: ['*'],
      });

      const mockBrowserCallBack = jest.fn();
      const url = 'dapp://example.com';

      await service.handleDeeplink(url, {
        browserCallBack: mockBrowserCallBack,
      });

      expect(dappHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            browserCallBack: mockBrowserCallBack,
          }),
        }),
      );
    });

    it('handles traditional deeplinks with valid signature without modal', async () => {
      mockVerifyDeeplinkSignature.mockResolvedValue(VALID);

      const url = 'metamask://buy?sig=valid-signature';
      const result = await service.handleDeeplink(url);

      expect(result.success).toBe(true);
      expect(mockHandleDeepLinkModalDisplay).not.toHaveBeenCalled();
      expect(mockBuyHandler).toHaveBeenCalled();
      expect(mockVerifyDeeplinkSignature).toHaveBeenCalled();
    });

    it('handles errors from action handlers gracefully', async () => {
      const error = new Error('Handler failed');
      mockBuyHandler.mockRejectedValue(error);

      const url = 'metamask://buy';
      const result = await service.handleDeeplink(url);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Handler failed');
    });

    it('handles parsing errors gracefully', async () => {
      const url = 'invalid-url';
      const result = await service.handleDeeplink(url);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to parse deeplink');
    });
  });

  describe('modal display logic', () => {
    beforeEach(() => {
      // Register a test action
      actionRegistry.register({
        name: 'test',
        handler: jest.fn().mockResolvedValue(undefined),
        supportedSchemes: ['*'],
      });
    });

    it('shows INVALID modal for unsupported domains', async () => {
      mockHandleDeepLinkModalDisplay.mockImplementation((params) => {
        expect(params.linkType).toBe(DeepLinkModalLinkType.INVALID);
        params.onBack();
      });

      const url = 'https://evil.com/test';
      const result = await service.handleDeeplink(url);

      expect(result.success).toBe(false);
      expect(result.shouldProceed).toBe(false);
      expect(mockHandleDeepLinkModalDisplay).toHaveBeenCalled();
    });

    it('shows UNSUPPORTED modal for unknown action with valid signature', async () => {
      mockVerifyDeeplinkSignature.mockResolvedValue(VALID);
      mockHandleDeepLinkModalDisplay.mockImplementation((params) => {
        expect(params.linkType).toBe(DeepLinkModalLinkType.UNSUPPORTED);
        params.onBack();
      });

      const url = 'https://link.metamask.io/unknown?sig=valid';
      await service.handleDeeplink(url);

      expect(mockHandleDeepLinkModalDisplay).toHaveBeenCalled();
    });

    it('shows PUBLIC modal for supported action without signature', async () => {
      mockHandleDeepLinkModalDisplay.mockImplementation((params) => {
        expect(params.linkType).toBe(DeepLinkModalLinkType.PUBLIC);
        if ('onContinue' in params) {
          params.onContinue();
        }
      });

      const url = 'https://link.metamask.io/test';
      await service.handleDeeplink(url);

      expect(mockHandleDeepLinkModalDisplay).toHaveBeenCalled();
    });

    it('shows PRIVATE modal for supported action with valid signature', async () => {
      mockVerifyDeeplinkSignature.mockResolvedValue(VALID);
      mockHandleDeepLinkModalDisplay.mockImplementation((params) => {
        expect(params.linkType).toBe(DeepLinkModalLinkType.PRIVATE);
        if ('onContinue' in params) {
          params.onContinue();
        }
      });

      const url = 'https://link.metamask.io/test?sig=valid';
      await service.handleDeeplink(url);

      expect(mockHandleDeepLinkModalDisplay).toHaveBeenCalled();
    });
  });

  describe('interstitial whitelist', () => {
    beforeEach(() => {
      // Register perps action
      actionRegistry.register({
        name: ACTIONS.PERPS_ASSET,
        handler: jest.fn().mockResolvedValue(undefined),
        supportedSchemes: ['*'],
      });
    });

    it('skips modal for whitelisted URLs', async () => {
      const url = 'https://link.metamask.io/perps-asset';
      const result = await service.handleDeeplink(url);

      expect(result.success).toBe(true);
      expect(mockHandleDeepLinkModalDisplay).not.toHaveBeenCalled();
    });
  });

  describe('additional edge cases', () => {
    beforeEach(() => {
      // Register test action
      actionRegistry.register({
        name: 'test',
        handler: jest.fn().mockResolvedValue(undefined),
        supportedSchemes: ['*'],
      });
    });

    it('handles universal link with invalid signature', async () => {
      mockVerifyDeeplinkSignature.mockResolvedValue(INVALID);
      mockHandleDeepLinkModalDisplay.mockImplementation((params) => {
        expect(params.linkType).toBe(DeepLinkModalLinkType.PUBLIC);
        if ('onContinue' in params) {
          params.onContinue();
        }
      });

      const url = 'https://link.metamask.io/test?sig=invalid';
      const result = await service.handleDeeplink(url);

      expect(result.success).toBe(true);
      expect(mockVerifyDeeplinkSignature).toHaveBeenCalled();
      expect(mockHandleDeepLinkModalDisplay).toHaveBeenCalled();
    });

    it('handles dapp action with browserCallBack', async () => {
      actionRegistry.register({
        name: ACTIONS.DAPP,
        handler: jest.fn().mockImplementation((params) => {
          expect(params.params.browserCallBack).toBeDefined();
          return Promise.resolve(undefined);
        }),
        supportedSchemes: ['*'],
      });

      const browserCallBack = jest.fn();
      const url = 'metamask://dapp/example.com';
      const result = await service.handleDeeplink(url, {
        browserCallBack,
      });

      expect(result.success).toBe(true);
    });

    it('initializes instance when not initialized', async () => {
      // Reset the singleton
      // @ts-expect-error - Accessing private static member for testing
      DeeplinkService.instance = null;

      const newService = DeeplinkService.getInstance();
      expect(newService).toBeInstanceOf(DeeplinkService);

      // Restore for other tests
      // @ts-expect-error - Accessing private static member for testing
      DeeplinkService.instance = service;
    });

    it('handles signature verification error gracefully', async () => {
      mockVerifyDeeplinkSignature.mockRejectedValue(
        new Error('Verification failed'),
      );
      mockHandleDeepLinkModalDisplay.mockImplementation((params) => {
        expect(params.linkType).toBe(DeepLinkModalLinkType.PUBLIC);
        if ('onContinue' in params) {
          params.onContinue();
        }
      });

      const url = 'https://link.metamask.io/test?sig=error';
      const result = await service.handleDeeplink(url);

      expect(result.success).toBe(true);
      expect(mockVerifyDeeplinkSignature).toHaveBeenCalled();
    });
  });
});
