import { HomeHandler } from './HomeHandler';
import { CoreUniversalLink } from '../../types/CoreUniversalLink';
import { HandlerContext } from '../../types/UniversalHandler';
import DeeplinkManager from '../../DeeplinkManager';
import { navigateToHomeUrl } from '../handleHomeUrl';

// Mock the navigation function
jest.mock('../handleHomeUrl', () => ({
  navigateToHomeUrl: jest.fn(),
}));

describe('HomeHandler', () => {
  let handler: HomeHandler;
  let mockContext: HandlerContext;

  beforeEach(() => {
    handler = new HomeHandler();
    mockContext = {
      deeplinkManager: {} as DeeplinkManager,
      origin: 'test',
    };
    jest.clearAllMocks();
  });

  it('has correct configuration', () => {
    expect(handler.id).toBe('home-handler');
    expect(handler.supportedActions).toEqual(['home']);
    expect(handler.requiresAuth).toBe(false);
    expect(handler.bypassModal).toBe(true);
  });

  it('handles simple home navigation', () => {
    const link: CoreUniversalLink = {
      originalUrl: 'metamask://home',
      normalizedUrl: 'https://link.metamask.io/home',
      protocol: 'metamask',
      action: 'home',
      hostname: 'link.metamask.io',
      pathname: '/home',
      params: {},
      metadata: {
        source: 'test',
        timestamp: Date.now(),
        needsAuth: false,
        isSDKAction: false,
      },
    };

    const result = handler.handle(link, mockContext);

    expect(result.handled).toBe(true);
    expect(navigateToHomeUrl).toHaveBeenCalledWith({ homePath: '' });
  });

  it('handles home navigation with path', () => {
    const link: CoreUniversalLink = {
      originalUrl: 'metamask://home/settings/security',
      normalizedUrl: 'https://link.metamask.io/home/settings/security',
      protocol: 'metamask',
      action: 'home',
      hostname: 'link.metamask.io',
      pathname: '/home/settings/security',
      params: {},
      metadata: {
        source: 'test',
        timestamp: Date.now(),
        needsAuth: false,
        isSDKAction: false,
      },
    };

    const result = handler.handle(link, mockContext);

    expect(result.handled).toBe(true);
    expect(navigateToHomeUrl).toHaveBeenCalledWith({
      homePath: 'settings/security',
    });
  });

  it('handles home navigation with query parameters', () => {
    const link: CoreUniversalLink = {
      originalUrl: 'metamask://home/wallet?tab=tokens',
      normalizedUrl: 'https://link.metamask.io/home/wallet?tab=tokens',
      protocol: 'metamask',
      action: 'home',
      hostname: 'link.metamask.io',
      pathname: '/home/wallet',
      params: {
        tab: 'tokens',
      },
      metadata: {
        source: 'test',
        timestamp: Date.now(),
        needsAuth: false,
        isSDKAction: false,
      },
    };

    const result = handler.handle(link, mockContext);

    expect(result.handled).toBe(true);
    expect(navigateToHomeUrl).toHaveBeenCalledWith({
      homePath: 'wallet?tab=tokens',
    });
  });

  it('handles query parameters without path', () => {
    const link: CoreUniversalLink = {
      originalUrl: 'metamask://home?modal=settings',
      normalizedUrl: 'https://link.metamask.io/home?modal=settings',
      protocol: 'metamask',
      action: 'home',
      hostname: 'link.metamask.io',
      pathname: '/home',
      params: {
        modal: 'settings',
      },
      metadata: {
        source: 'test',
        timestamp: Date.now(),
        needsAuth: false,
        isSDKAction: false,
      },
    };

    const result = handler.handle(link, mockContext);

    expect(result.handled).toBe(true);
    expect(navigateToHomeUrl).toHaveBeenCalledWith({
      homePath: '?modal=settings',
    });
  });
});
