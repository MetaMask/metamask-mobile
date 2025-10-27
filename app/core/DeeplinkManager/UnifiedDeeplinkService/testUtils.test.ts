import {
  createMockNavigation,
  createDefaultParams,
  createDeeplinkParams,
  NavigationTestCase,
  runNavigationTest,
  createActionTests,
  setupHandlerMocks,
} from './testUtils';

describe('testUtils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createMockNavigation', () => {
    it('creates a mock navigation object with all required methods', () => {
      const mockNavigation = createMockNavigation();

      expect(mockNavigation).toHaveProperty('navigate');
      expect(mockNavigation).toHaveProperty('goBack');
      expect(mockNavigation).toHaveProperty('dispatch');
      expect(mockNavigation).toHaveProperty('reset');
      expect(mockNavigation).toHaveProperty('setParams');
      expect(mockNavigation).toHaveProperty('setOptions');
      expect(mockNavigation).toHaveProperty('isFocused');
      expect(mockNavigation).toHaveProperty('canGoBack');
      expect(mockNavigation).toHaveProperty('getParent');
      expect(mockNavigation).toHaveProperty('getState');
      expect(mockNavigation).toHaveProperty('addListener');
      expect(mockNavigation).toHaveProperty('removeListener');
      expect(mockNavigation).toHaveProperty('getId');

      // All methods should be jest mock functions
      expect(jest.isMockFunction(mockNavigation.navigate)).toBe(true);
      expect(jest.isMockFunction(mockNavigation.goBack)).toBe(true);
    });
  });

  describe('createDefaultParams', () => {
    it('creates default DeeplinkUrlParams', () => {
      const params = createDefaultParams();

      expect(params).toEqual({
        pubkey: '',
        uri: '',
        redirect: '',
        v: '',
        sdkVersion: '',
        rpc: '',
        originatorInfo: '',
        channelId: '',
        comm: '',
        attributionId: '',
        utm_source: '',
        utm_medium: '',
        utm_campaign: '',
        utm_term: '',
        utm_content: '',
        hr: false,
      });
    });

    it('creates default params with overrides', () => {
      const params = createDefaultParams({
        pubkey: 'test-pubkey',
        channelId: 'test-channel',
        hr: true,
      });

      expect(params.pubkey).toBe('test-pubkey');
      expect(params.channelId).toBe('test-channel');
      expect(params.hr).toBe(true);
      expect(params.uri).toBe(''); // Default value
    });
  });

  describe('createDeeplinkParams', () => {
    it('creates default DeeplinkParams', () => {
      const params = createDeeplinkParams();

      expect(params).toMatchObject({
        action: 'test-action',
        path: '',
        originalUrl: 'metamask://test',
        scheme: 'metamask:',
        origin: 'deeplink',
      });
      expect(params.params).toBeDefined();
      expect(params.navigation).toBeDefined();
    });

    it('creates DeeplinkParams with overrides', () => {
      const customNavigation = createMockNavigation();
      const params = createDeeplinkParams({
        action: 'custom-action',
        path: '/custom/path',
        originalUrl: 'https://link.metamask.io/custom',
        scheme: 'https:',
        navigation: customNavigation,
        origin: 'browser',
      });

      expect(params.action).toBe('custom-action');
      expect(params.path).toBe('/custom/path');
      expect(params.originalUrl).toBe('https://link.metamask.io/custom');
      expect(params.scheme).toBe('https:');
      expect(params.navigation).toBe(customNavigation);
      expect(params.origin).toBe('browser');
    });
  });

  describe('runNavigationTest', () => {
    it('runs navigation test with expected view', async () => {
      const mockHandler = jest.fn().mockImplementation(async (params) => {
        params.navigation?.navigate(
          params.expectedView || 'TestView',
          undefined,
        );
      });
      const testCase: NavigationTestCase = {
        name: 'test navigation',
        params: {
          action: 'test-action',
          path: '/test',
        },
        expectedView: 'TestView',
      };

      await runNavigationTest(mockHandler, testCase);

      expect(mockHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'test-action',
          path: '/test',
        }),
      );
    });

    it('runs navigation test with expected params', async () => {
      const mockHandler = jest.fn().mockImplementation(async (params) => {
        params.navigation?.navigate(params.expectedView || 'TestView', {
          screen: 'TestScreen',
          params: { id: '123' },
        });
      });
      const testCase: NavigationTestCase = {
        name: 'test navigation with params',
        params: {
          action: 'test-action',
          path: '/test',
        },
        expectedView: 'TestView',
        expectedParams: {
          screen: 'TestScreen',
          params: { id: '123' },
        },
      };

      await runNavigationTest(mockHandler, testCase);

      expect(mockHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'test-action',
          path: '/test',
        }),
      );
    });
  });

  describe('createActionTests', () => {
    it('creates parameterized tests for navigation', () => {
      // Just verify that createActionTests is a function that can be called
      expect(typeof createActionTests).toBe('function');

      // We can't actually test describe.each behavior in a unit test
      // as it would create nested describe blocks which jest doesn't allow
    });
  });

  describe('setupHandlerMocks', () => {
    it('creates mocks for common handlers', () => {
      const mocks = setupHandlerMocks();

      expect(mocks).toHaveProperty('DevLogger');
      expect(mocks).toHaveProperty('handleCreateAccountUrl');
      expect(mocks).toHaveProperty('handleRewardsUrl');

      expect(jest.isMockFunction(mocks.DevLogger.log)).toBe(true);
      expect(jest.isMockFunction(mocks.handleCreateAccountUrl)).toBe(true);
      expect(jest.isMockFunction(mocks.handleRewardsUrl)).toBe(true);
    });
  });
});
