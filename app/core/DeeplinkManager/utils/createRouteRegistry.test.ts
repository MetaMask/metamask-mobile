import { createRouteRegistry } from './createRouteRegistry';

describe('createRouteRegistry', () => {
  it.each([
    ['/social', '/SOCIAL'],
    ['/social/*', '/social/alice'],
    ['/social/*/whatever', '/SOCIAL/ALICE/WHATEVER'],
    ['/social/*/whatever', '/social/alice%2Fbob/whatever'],
    ['/social/*/*/whatever', '/social/alice/posts/whatever'],
    ['/social.v1/*', '/social.v1/alice'],
    ['/social/', '/social/'],
    ['/social//posts', '/social//posts'],
    ['/', '/'],
  ])('matches %s against %s', (pattern, pathname) => {
    const registry = createRouteRegistry();
    const route = { pathname: pattern };
    registry.addRoute(route);

    const result = registry.matchRoute(pathname);

    expect(result).toBe(route);
  });

  it.each([
    ['/social', '/social/'],
    ['/social', '/social/alice'],
    ['/social', '/socially'],
    ['/social/*', '/social'],
    ['/social/*', '/social/'],
    ['/social/*', '/social/alice/'],
    ['/social/*', '/social/alice/posts'],
    ['/social/*/whatever', '/social//whatever'],
    ['/social/*/whatever', '/social/alice/bob/whatever'],
    ['/social/*/whatever', '/social/alice/whatever/extra'],
    ['/social.v1/*', '/socialXv1/alice'],
    ['/*', '/'],
  ])('does not match %s against %s', (pattern, pathname) => {
    const registry = createRouteRegistry();
    registry.addRoute({ pathname: pattern });

    const result = registry.matchRoute(pathname);

    expect(result).toBeUndefined();
  });

  it.each([
    ['/social/*/posts', '/social/admin/posts'],
    ['/social/admin/posts', '/social/*/posts'],
    ['/social/*/posts', '/social/admin/settings'],
    ['/social/admin/settings', '/social/*/posts'],
  ])('rejects %s followed by %s', (existing, added) => {
    const registry = createRouteRegistry();
    registry.addRoute({ pathname: existing });

    const register = () => registry.addRoute({ pathname: added });

    expect(register).toThrow('conflicts at segment');
  });

  it('rejects case-insensitive duplicates without replacing the route', () => {
    const registry = createRouteRegistry();
    const route = { pathname: '/home' };
    registry.addRoute(route);

    const register = () => registry.addRoute({ pathname: '/HOME' });

    expect(register).toThrow('already exists');
    expect(registry.matchRoute('/home')).toBe(route);
  });

  it.each([true, false])(
    'allows parent and child routes with parent first: %s',
    (parentFirst) => {
      const registry = createRouteRegistry();
      const parent = { pathname: '/social' };
      const child = { pathname: '/social/*' };
      const routes = parentFirst ? [parent, child] : [child, parent];

      routes.forEach(registry.addRoute);

      expect(registry.matchRoute('/social')).toBe(parent);
      expect(registry.matchRoute('/social/alice')).toBe(child);
    },
  );

  it('reuses wildcard prefixes with different suffixes', () => {
    const registry = createRouteRegistry();
    const posts = { pathname: '/social/*/posts' };
    const profile = { pathname: '/social/*/profile' };

    [posts, profile].forEach(registry.addRoute);

    expect(registry.matchRoute('/social/alice/posts')).toBe(posts);
    expect(registry.matchRoute('/social/bob/profile')).toBe(profile);
  });

  it('returns undefined for an empty registry', () => {
    const registry = createRouteRegistry();

    const result = registry.matchRoute('/unknown');

    expect(result).toBeUndefined();
  });
});
