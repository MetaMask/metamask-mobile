import { NavigationProp, ParamListBase } from '@react-navigation/native';
import DevLogger from '../../../SDKConnect/utils/DevLogger';
import { DeeplinkParams } from '../ActionRegistry';
import { createDefaultParams } from '../testUtils';
import {
  navigateWithLogging,
  constructUrl,
  validateRequiredParams,
  createSimpleNavigationHandler,
  createDelegatingHandler,
  extractAddressFromPath,
  withErrorHandling,
  NavigationConfig,
} from './actionHelpers';

jest.mock('../../../SDKConnect/utils/DevLogger');

describe('actionHelpers', () => {
  const mockNavigation = {
    navigate: jest.fn(),
  } as unknown as NavigationProp<ParamListBase>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('navigateWithLogging', () => {
    it('navigates with logging when navigation is provided', () => {
      const config: NavigationConfig = {
        view: 'TestView',
        screen: 'TestScreen',
        params: { test: 'value' },
      };

      navigateWithLogging(mockNavigation, config, 'TestAction');

      expect(DevLogger.log).toHaveBeenCalledWith(
        'TestAction: Navigating to TestView',
        config,
      );
      expect(mockNavigation.navigate).toHaveBeenCalledWith('TestView', {
        screen: 'TestScreen',
        test: 'value',
      });
    });

    it('logs when navigation is not available', () => {
      const config: NavigationConfig = {
        view: 'TestView',
      };

      navigateWithLogging(undefined, config, 'TestAction');

      expect(DevLogger.log).toHaveBeenCalledWith(
        'TestAction: Navigating to TestView',
        config,
      );
      expect(DevLogger.log).toHaveBeenCalledWith(
        'TestAction: No navigation object available',
      );
      expect(mockNavigation.navigate).not.toHaveBeenCalled();
    });
  });

  describe('constructUrl', () => {
    it('constructs traditional metamask URL', () => {
      const url = constructUrl('send', '/0x123', 'metamask:');
      expect(url).toBe('metamask://send/0x123');
    });

    it('constructs universal link URL', () => {
      const url = constructUrl('buy', '/eth', 'https:');
      expect(url).toBe('https://link.metamask.io/buy/eth');
    });

    it('handles empty paths', () => {
      const url = constructUrl('swap', '', 'metamask:');
      expect(url).toBe('metamask://swap');
    });
  });

  describe('validateRequiredParams', () => {
    it('validates all required params are present', () => {
      const params: DeeplinkParams = {
        action: 'test',
        path: '/test',
        params: {
          pubkey: 'test-pubkey',
          channelId: 'test-channel',
          uri: '',
          redirect: '',
          comm: '',
          hr: false,
        },
        originalUrl: 'test://url',
        scheme: 'test:',
      };

      expect(() =>
        validateRequiredParams(params, ['pubkey', 'channelId'], 'TestAction'),
      ).not.toThrow();
    });

    it('throws error when required params are missing', () => {
      const params: DeeplinkParams = {
        action: 'test',
        path: '/test',
        params: {
          pubkey: '',
          channelId: '',
          uri: '',
          redirect: '',
          comm: '',
          hr: false,
        },
        originalUrl: 'test://url',
        scheme: 'test:',
      };

      expect(() =>
        validateRequiredParams(params, ['pubkey', 'channelId'], 'TestAction'),
      ).toThrow('TestAction: Missing required parameters: pubkey, channelId');

      expect(DevLogger.log).toHaveBeenCalledWith(
        'TestAction: Missing required parameters: pubkey, channelId',
      );
    });
  });

  describe('createSimpleNavigationHandler', () => {
    it('creates handler with static navigation config', async () => {
      const config: NavigationConfig = {
        view: 'TestView',
        screen: 'TestScreen',
      };

      const handler = createSimpleNavigationHandler('TestAction', config);
      const params: DeeplinkParams = {
        action: 'test',
        path: '/test',
        params: createDefaultParams(),
        originalUrl: 'test://url',
        scheme: 'test:',
        navigation: mockNavigation,
      };

      await handler(params);

      expect(DevLogger.log).toHaveBeenCalledWith(
        'TestAction: Handling action',
        {
          path: '/test',
          queryParams: params.params,
        },
      );
      expect(mockNavigation.navigate).toHaveBeenCalledWith('TestView', {
        screen: 'TestScreen',
      });
    });

    it('creates handler with dynamic navigation config', async () => {
      const configFn = jest.fn().mockReturnValue({
        view: 'DynamicView',
        params: { dynamic: true },
      });

      const handler = createSimpleNavigationHandler('TestAction', configFn);
      const params: DeeplinkParams = {
        action: 'test',
        path: '/test',
        params: createDefaultParams(),
        originalUrl: 'test://url',
        scheme: 'test:',
        navigation: mockNavigation,
      };

      await handler(params);

      expect(configFn).toHaveBeenCalledWith(params);
      expect(mockNavigation.navigate).toHaveBeenCalledWith('DynamicView', {
        dynamic: true,
      });
    });
  });

  describe('createDelegatingHandler', () => {
    it('creates handler that delegates to another function', async () => {
      const mockDelegate = jest.fn().mockResolvedValue(undefined);
      const mockOptionsBuilder = jest.fn().mockReturnValue({ test: 'options' });

      const handler = createDelegatingHandler(
        'TestAction',
        mockDelegate,
        mockOptionsBuilder,
      );

      const params: DeeplinkParams = {
        action: 'test',
        path: '/test',
        params: createDefaultParams(),
        originalUrl: 'test://url',
        scheme: 'test:',
      };

      await handler(params);

      expect(DevLogger.log).toHaveBeenCalledWith(
        'TestAction: Handling action',
        {
          path: '/test',
          queryParams: params.params,
        },
      );
      expect(mockOptionsBuilder).toHaveBeenCalledWith(params);
      expect(mockDelegate).toHaveBeenCalledWith({ test: 'options' });
    });
  });

  describe('extractAddressFromPath', () => {
    it('extracts address from path with single segment', () => {
      const address = extractAddressFromPath('/0x123456789');
      expect(address).toBe('0x123456789');
    });

    it('extracts address from path with multiple segments', () => {
      const address = extractAddressFromPath('/0x123456789/transfer/params');
      expect(address).toBe('0x123456789');
    });

    it('returns empty string for empty path', () => {
      const address = extractAddressFromPath('');
      expect(address).toBe('');
    });

    it('returns empty string for path without segments', () => {
      const address = extractAddressFromPath('/');
      expect(address).toBe('');
    });
  });

  describe('withErrorHandling', () => {
    it('executes handler successfully', async () => {
      const mockHandler = jest.fn().mockResolvedValue(undefined);
      const wrappedHandler = withErrorHandling(mockHandler, 'TestAction');

      const params: DeeplinkParams = {
        action: 'test',
        path: '/test',
        params: createDefaultParams(),
        originalUrl: 'test://url',
        scheme: 'test:',
      };

      await wrappedHandler(params);

      expect(mockHandler).toHaveBeenCalledWith(params);
      expect(DevLogger.log).not.toHaveBeenCalledWith(
        expect.stringContaining('Error'),
        expect.any(Error),
      );
    });

    it('catches and logs errors', async () => {
      const error = new Error('Test error');
      const mockHandler = jest.fn().mockRejectedValue(error);
      const wrappedHandler = withErrorHandling(mockHandler, 'TestAction');

      const params: DeeplinkParams = {
        action: 'test',
        path: '/test',
        params: createDefaultParams(),
        originalUrl: 'test://url',
        scheme: 'test:',
      };

      await expect(wrappedHandler(params)).rejects.toThrow('Test error');

      expect(DevLogger.log).toHaveBeenCalledWith(
        'TestAction: Error handling action',
        error,
      );
    });
  });
});
