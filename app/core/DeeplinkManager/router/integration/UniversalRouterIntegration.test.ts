import { UniversalRouterIntegration } from './UniversalRouterIntegration';
import { UniversalRouter } from '../UniversalRouter';
import DeeplinkManager from '../../DeeplinkManager';
import ReduxService from '../../../redux';
import { selectRemoteFeatureFlags } from '../../../../selectors/featureFlagController';

jest.mock('../UniversalRouter');
jest.mock('../../../redux');
jest.mock('../../../../selectors/featureFlagController');
jest.mock('../../../../util/Logger');

describe('UniversalRouterIntegration', () => {
  let mockRouter: jest.Mocked<UniversalRouter>;
  let mockDeeplinkManager: DeeplinkManager;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock router instance
    mockRouter = {
      initialize: jest.fn(),
      route: jest.fn(),
      getRegistry: jest.fn(),
      reset: jest.fn(),
    } as unknown as jest.Mocked<UniversalRouter>;

    (UniversalRouter.getInstance as jest.Mock).mockReturnValue(mockRouter);

    // Mock DeeplinkManager
    mockDeeplinkManager = {
      navigation: { navigate: jest.fn() },
      dispatch: jest.fn(),
    } as unknown as DeeplinkManager;

    // Mock Redux store
    const mockStore = {
      getState: jest.fn(),
    };
    (ReduxService as unknown as { store: typeof mockStore }).store = mockStore;
  });

  describe('shouldUseNewRouter', () => {
    it('returns true when feature flag is enabled', () => {
      const mockState = { some: 'state' };
      (ReduxService.store.getState as jest.Mock).mockReturnValue(mockState);
      (selectRemoteFeatureFlags as unknown as jest.Mock).mockReturnValue({
        MM_UNIVERSAL_ROUTER: true,
      });

      const result = UniversalRouterIntegration.shouldUseNewRouter();

      expect(result).toBe(true);
    });

    it('returns false when feature flag is disabled', () => {
      const mockState = { some: 'state' };
      (ReduxService.store.getState as jest.Mock).mockReturnValue(mockState);
      (selectRemoteFeatureFlags as unknown as jest.Mock).mockReturnValue({
        MM_UNIVERSAL_ROUTER: false,
      });

      const result = UniversalRouterIntegration.shouldUseNewRouter();

      expect(result).toBe(false);
    });

    it('returns false when feature flag is missing', () => {
      const mockState = { some: 'state' };
      (ReduxService.store.getState as jest.Mock).mockReturnValue(mockState);
      (selectRemoteFeatureFlags as unknown as jest.Mock).mockReturnValue({});

      const result = UniversalRouterIntegration.shouldUseNewRouter();

      expect(result).toBe(false);
    });

    it('returns false when state is null', () => {
      (ReduxService.store.getState as jest.Mock).mockReturnValue(null);

      const result = UniversalRouterIntegration.shouldUseNewRouter();

      expect(result).toBe(false);
    });

    it('returns false when an error occurs', () => {
      (ReduxService.store.getState as jest.Mock).mockImplementation(() => {
        throw new Error('Redux error');
      });

      const result = UniversalRouterIntegration.shouldUseNewRouter();

      expect(result).toBe(false);
    });
  });

  describe('processWithNewRouter', () => {
    it('returns false when feature flag is disabled', async () => {
      const mockState = { some: 'state' };
      (ReduxService.store.getState as jest.Mock).mockReturnValue(mockState);
      (selectRemoteFeatureFlags as unknown as jest.Mock).mockReturnValue({
        MM_UNIVERSAL_ROUTER: false,
      });

      const result = await UniversalRouterIntegration.processWithNewRouter(
        'metamask://home',
        'test',
        mockDeeplinkManager,
      );

      expect(result).toBe(false);
      expect(mockRouter.initialize).not.toHaveBeenCalled();
    });

    it('initializes router and processes link when flag is enabled', async () => {
      const mockState = { some: 'state' };
      (ReduxService.store.getState as jest.Mock).mockReturnValue(mockState);
      (selectRemoteFeatureFlags as unknown as jest.Mock).mockReturnValue({
        MM_UNIVERSAL_ROUTER: true,
      });
      mockRouter.route.mockResolvedValue({
        handled: true,
        metadata: { action: 'home' },
      });

      const result = await UniversalRouterIntegration.processWithNewRouter(
        'metamask://home',
        'test-source',
        mockDeeplinkManager,
      );

      expect(mockRouter.initialize).toHaveBeenCalled();
      expect(mockRouter.route).toHaveBeenCalledWith(
        'metamask://home',
        'test-source',
        expect.objectContaining({
          navigation: expect.any(Object),
          dispatch: expect.any(Function),
          instance: mockDeeplinkManager,
        }),
      );
      expect(result).toBe(true);
    });

    it('passes browserCallBack to context', async () => {
      const mockState = { some: 'state' };
      (ReduxService.store.getState as jest.Mock).mockReturnValue(mockState);
      (selectRemoteFeatureFlags as unknown as jest.Mock).mockReturnValue({
        MM_UNIVERSAL_ROUTER: true,
      });
      mockRouter.route.mockResolvedValue({ handled: true });

      const browserCallback = jest.fn();
      await UniversalRouterIntegration.processWithNewRouter(
        'metamask://dapp/example.com',
        'test-source',
        mockDeeplinkManager,
        browserCallback,
      );

      expect(mockRouter.route).toHaveBeenCalledWith(
        'metamask://dapp/example.com',
        'test-source',
        expect.objectContaining({
          browserCallBack: browserCallback,
        }),
      );
    });

    it('returns false when router fails to handle', async () => {
      const mockState = { some: 'state' };
      (ReduxService.store.getState as jest.Mock).mockReturnValue(mockState);
      (selectRemoteFeatureFlags as unknown as jest.Mock).mockReturnValue({
        MM_UNIVERSAL_ROUTER: true,
      });
      mockRouter.route.mockResolvedValue({
        handled: false,
        error: new Error('Failed'),
      });

      const result = await UniversalRouterIntegration.processWithNewRouter(
        'metamask://unknown',
        'test-source',
        mockDeeplinkManager,
      );

      expect(result).toBe(false);
    });

    it('returns false when an error is thrown', async () => {
      const mockState = { some: 'state' };
      (ReduxService.store.getState as jest.Mock).mockReturnValue(mockState);
      (selectRemoteFeatureFlags as unknown as jest.Mock).mockReturnValue({
        MM_UNIVERSAL_ROUTER: true,
      });
      mockRouter.route.mockRejectedValue(new Error('Router crashed'));

      const result = await UniversalRouterIntegration.processWithNewRouter(
        'metamask://home',
        'test-source',
        mockDeeplinkManager,
      );

      expect(result).toBe(false);
    });
  });

  describe('getRouter', () => {
    it('returns initialized router instance', () => {
      const router = UniversalRouterIntegration.getRouter();

      expect(router).toBe(mockRouter);
      expect(mockRouter.initialize).toHaveBeenCalled();
    });
  });
});
