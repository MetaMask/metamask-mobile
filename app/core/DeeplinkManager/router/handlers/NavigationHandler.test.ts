import { NavigationHandler } from './NavigationHandler';
import { CoreUniversalLink } from '../../types/CoreUniversalLink';
import { HandlerContext } from '../interfaces/UniversalLinkHandler';
import { ACTIONS } from '../../../../constants/deeplinks';
import Routes from '../../../../constants/navigation/Routes';

jest.mock('../../../../util/Logger');

describe('NavigationHandler', () => {
  let handler: NavigationHandler;
  let mockContext: HandlerContext;

  beforeEach(() => {
    handler = new NavigationHandler();
    mockContext = {
      navigation: { navigate: jest.fn() },
      dispatch: jest.fn(),
      instance: {},
    };
  });

  const createLink = (action: string, params = {}): CoreUniversalLink => ({
    action,
    protocol: 'metamask',
    params,
    requiresAuth: false,
    source: 'test',
    timestamp: Date.now(),
    originalUrl: `metamask://${action}`,
    normalizedUrl: `metamask://${action}`,
    isValid: true,
    isSupportedAction: true,
    isPrivateLink: false,
  });

  describe('handle', () => {
    it('navigates to home for HOME action', async () => {
      const link = createLink(ACTIONS.HOME);

      const result = await handler.handle(link, mockContext);

      expect(result.handled).toBe(true);
      expect(mockContext.navigation.navigate).toHaveBeenCalledWith(
        Routes.MODAL.ROOT_MODAL_FLOW,
        undefined,
      );
    });

    it('navigates to create account for CREATE_ACCOUNT action', async () => {
      const link = createLink(ACTIONS.CREATE_ACCOUNT);

      const result = await handler.handle(link, mockContext);

      expect(result.handled).toBe(true);
      expect(mockContext.navigation.navigate).toHaveBeenCalledWith(
        Routes.MODAL.ROOT_MODAL_FLOW,
        { screen: Routes.MODAL.MODAL_CONFIRMATION },
      );
    });

    it('navigates to rewards screen with params', async () => {
      const link = createLink(ACTIONS.REWARDS, { code: 'TEST123' });

      const result = await handler.handle(link, mockContext);

      expect(result.handled).toBe(true);
      expect(mockContext.navigation.navigate).toHaveBeenCalledWith(
        'RewardsScreen',
        { code: 'TEST123' },
      );
    });

    it('navigates to perps with path', async () => {
      const link = createLink(ACTIONS.PERPS, { perpsPath: '/trade' });

      const result = await handler.handle(link, mockContext);

      expect(result.handled).toBe(true);
      expect(mockContext.navigation.navigate).toHaveBeenCalledWith(
        'PerpsScreen',
        { path: '/trade' },
      );
    });

    it('uses default path for perps markets', async () => {
      const link = createLink(ACTIONS.PERPS_MARKETS);

      await handler.handle(link, mockContext);

      expect(mockContext.navigation.navigate).toHaveBeenCalledWith(
        'PerpsScreen',
        { path: '/markets' },
      );
    });

    it('returns error for unsupported action', async () => {
      const link = createLink('unknown');

      const result = await handler.handle(link, mockContext);

      expect(result.handled).toBe(false);
      expect(result.error?.message).toContain('Unsupported navigation action');
    });
  });

  describe('supportedActions', () => {
    it('supports expected actions', () => {
      expect(handler.supportedActions).toEqual([
        ACTIONS.HOME,
        ACTIONS.CREATE_ACCOUNT,
        ACTIONS.REWARDS,
        ACTIONS.PREDICT,
        ACTIONS.PERPS,
        ACTIONS.PERPS_MARKETS,
        ACTIONS.PERPS_ASSET,
      ]);
    });
  });

  describe('priority', () => {
    it('has standard priority', () => {
      expect(handler.priority).toBe(10);
    });
  });
});
