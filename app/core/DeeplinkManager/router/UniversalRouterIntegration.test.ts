import { UniversalRouterIntegration } from './UniversalRouterIntegration';
import { UniversalRouter } from './UniversalRouter';
import DeeplinkManager from '../DeeplinkManager';
import ReduxService from '../../redux';
import { selectRemoteFeatureFlags } from '../../../selectors/featureFlagController';

jest.mock('./UniversalRouter');
jest.mock('../../redux');
jest.mock('../../../selectors/featureFlagController');
jest.mock('../../../util/Logger');

describe('UniversalRouterIntegration', () => {
  let mockRouter: jest.Mocked<UniversalRouter>;
  let mockDeeplinkManager: DeeplinkManager;

  beforeEach(() => {
    jest.clearAllMocks();

    mockRouter = {
      initialize: jest.fn(),
      route: jest.fn(),
      getRegistry: jest.fn(),
      reset: jest.fn(),
    } as unknown as jest.Mocked<UniversalRouter>;

    (UniversalRouter.getInstance as jest.Mock).mockReturnValue(mockRouter);

    mockDeeplinkManager = {
      navigation: { navigate: jest.fn() },
      dispatch: jest.fn(),
    } as unknown as DeeplinkManager;

    const mockStore = { getState: jest.fn() };
    (ReduxService as unknown as { store: typeof mockStore }).store = mockStore;
  });

  describe('shouldUseNewRouter', () => {
    it('returns true when feature flag is enabled', () => {
      (ReduxService.store.getState as jest.Mock).mockReturnValue({
        some: 'state',
      });
      (selectRemoteFeatureFlags as unknown as jest.Mock).mockReturnValue({
        MM_UNIVERSAL_ROUTER: true,
      });

      expect(UniversalRouterIntegration.shouldUseNewRouter()).toBe(true);
    });

    it('returns false when feature flag is disabled', () => {
      (ReduxService.store.getState as jest.Mock).mockReturnValue({
        some: 'state',
      });
      (selectRemoteFeatureFlags as unknown as jest.Mock).mockReturnValue({
        MM_UNIVERSAL_ROUTER: false,
      });

      expect(UniversalRouterIntegration.shouldUseNewRouter()).toBe(false);
    });
  });

  describe('processWithNewRouter', () => {
    it('processes link through new router when enabled', async () => {
      (ReduxService.store.getState as jest.Mock).mockReturnValue({
        some: 'state',
      });
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

    it('skips new router when disabled', async () => {
      (ReduxService.store.getState as jest.Mock).mockReturnValue({
        some: 'state',
      });
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

    it('returns false when router throws error', async () => {
      const routeError = new Error('Router initialization failed');
      (ReduxService.store.getState as jest.Mock).mockReturnValue({
        some: 'state',
      });
      (selectRemoteFeatureFlags as unknown as jest.Mock).mockReturnValue({
        MM_UNIVERSAL_ROUTER: true,
      });
      mockRouter.route.mockRejectedValue(routeError);

      const result = await UniversalRouterIntegration.processWithNewRouter(
        'metamask://swap',
        'test',
        mockDeeplinkManager,
      );

      expect(result).toBe(false);
    });
  });
});
