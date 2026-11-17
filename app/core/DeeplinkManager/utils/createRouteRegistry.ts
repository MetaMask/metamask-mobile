export interface DeeplinkRoutePattern {
  pathname: string;
}

export function createRouteRegistry<Route extends DeeplinkRoutePattern>() {
  interface RouteNode {
    children: Map<string, RouteNode>;
    route?: Route;
  }

  const root: RouteNode = { children: new Map() };

  const addRoute = (route: Route): void => {
    let node = root;

    for (const segment of route.pathname.toLowerCase().split('/')) {
      const hasWildcard = node.children.has('*');
      if (
        (segment === '*' && !hasWildcard && node.children.size > 0) ||
        (segment !== '*' && hasWildcard)
      ) {
        throw new Error(
          `Route with pathname "${route.pathname}" conflicts at segment "${segment}".`,
        );
      }

      let child = node.children.get(segment);
      if (!child) {
        child = { children: new Map() };
        node.children.set(segment, child);
      }
      node = child;
    }

    if (node.route) {
      throw new Error(
        `Route with pathname "${route.pathname}" already exists.`,
      );
    }
    node.route = route;
  };

  const matchRoute = (pathname: string): Route | undefined => {
    let node = root;

    for (const segment of pathname.toLowerCase().split('/')) {
      const child =
        node.children.get(segment) ??
        (segment ? node.children.get('*') : undefined);
      if (!child) {
        return undefined;
      }
      node = child;
    }

    return node.route;
  };

  return { addRoute, matchRoute };
}
