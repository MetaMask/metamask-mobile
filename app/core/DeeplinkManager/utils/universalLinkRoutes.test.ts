import { ACTIONS } from '../../../constants/deeplinks';
import { createRouteRegistry } from './createRouteRegistry';
import {
  matchUniversalLinkRoute,
  SUPPORTED_ACTIONS,
  UNIVERSAL_LINK_ROUTES,
  type UniversalLinkRoute,
} from './universalLinkRoutes';

describe('universal link production registry', () => {
  it('registers every production route without conflicts', () => {
    const registry = createRouteRegistry<UniversalLinkRoute>();

    const register = () => UNIVERSAL_LINK_ROUTES.forEach(registry.addRoute);

    expect(register).not.toThrow();
    UNIVERSAL_LINK_ROUTES.forEach((route) => {
      expect(registry.matchRoute(route.pathname)).toBe(route);
    });
  });

  it.each(Object.values(SUPPORTED_ACTIONS))(
    'registers the existing %s action',
    (action) => {
      const pathname = `/${action}`;

      const result = matchUniversalLinkRoute(pathname);

      expect(result?.action).toBe(action);
    },
  );

  it.each([true, false])(
    'rejects a social wildcard with production routes registered first: %s',
    (productionFirst) => {
      const registry = createRouteRegistry<UniversalLinkRoute>();
      const wildcard: UniversalLinkRoute = {
        pathname: '/social/*',
        action: ACTIONS.SOCIAL,
      };
      const routes = productionFirst
        ? [...UNIVERSAL_LINK_ROUTES, wildcard]
        : [wildcard, ...UNIVERSAL_LINK_ROUTES];

      const register = () => routes.forEach(registry.addRoute);

      expect(register).toThrow('conflicts at segment');
    },
  );

  it('uses supported whole-segment wildcard patterns', () => {
    const patterns = UNIVERSAL_LINK_ROUTES.map(({ pathname }) => pathname);

    const unsupported = patterns.filter(
      (pathname) =>
        !pathname.startsWith('/') ||
        /\/\*\/+$/u.test(pathname) ||
        pathname
          .split('/')
          .some((segment) => segment !== '*' && segment.includes('*')),
    );

    expect(unsupported).toEqual([]);
  });

  it.each(['/social/profile', '/SOCIAL/PROFILE/POSITION', '/social/post'])(
    'matches the explicit nested route %s',
    (pathname) => {
      const result = matchUniversalLinkRoute(pathname);

      expect(result?.action).toBe(ACTIONS.SOCIAL);
    },
  );

  it.each([
    '/home/',
    '/home/extra',
    '/social/unknown',
    '/social/profile/extra',
  ])('rejects the unregistered pathname %s', (pathname) => {
    const result = matchUniversalLinkRoute(pathname);

    expect(result).toBeUndefined();
  });

  it.each([
    ['/dapp/example.com/a/b', ACTIONS.DAPP],
    ['/DAPP/https://example.com/CaseSensitive', ACTIONS.DAPP],
    ['/send/0x123@1/transfer', ACTIONS.SEND],
    ['/on-ramp/return', ACTIONS.ON_RAMP],
  ])(
    'preserves the mobile payload or callback route %s',
    (pathname, action) => {
      const result = matchUniversalLinkRoute(pathname);

      expect(result?.action).toBe(action);
    },
  );
});
