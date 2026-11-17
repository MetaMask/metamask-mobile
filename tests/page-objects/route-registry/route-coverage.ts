import { NOT_A_SCREEN, type RoutePageObjectRegistry } from './route-registry';
import type { RouteDefinition } from './route-definitions';

export type RouteCoverageStatus =
  | 'page-object'
  | 'no-page-object'
  | 'not-a-screen'
  | 'unregistered';

export interface RouteCoverageEntry {
  route: string;
  keyPaths: string[];
  status: RouteCoverageStatus;
  pageObject?: string;
}

export interface RouteCoverageReport {
  generatedAt: string;
  summary: {
    totalRoutes: number;
    withPageObject: number;
    withoutPageObject: number;
    notAScreen: number;
    unregistered: number;
    staleEntries: number;
    coveragePercentage: number;
  };
  routes: RouteCoverageEntry[];
  aliasedRoutes: string[];
  staleEntries: string[];
}

export function getRouteCoverage(
  routes: readonly RouteDefinition[],
  registry: RoutePageObjectRegistry,
): RouteCoverageReport {
  const routeMap = new Map<string, string[]>();

  for (const route of routes) {
    const keyPaths = routeMap.get(route.value) ?? [];
    keyPaths.push(route.keyPath);
    routeMap.set(route.value, keyPaths);
  }

  const entries = [...routeMap.entries()]
    .map(([route, keyPaths]): RouteCoverageEntry => {
      if (!Object.hasOwn(registry, route)) {
        return { route, keyPaths, status: 'unregistered' };
      }

      const pageObject = registry[route];
      if (pageObject === NOT_A_SCREEN) {
        return { route, keyPaths, status: 'not-a-screen' };
      }

      return pageObject
        ? {
            route,
            keyPaths,
            status: 'page-object',
            pageObject,
          }
        : { route, keyPaths, status: 'no-page-object' };
    })
    .sort((left, right) => left.route.localeCompare(right.route));

  const routeValues = new Set(routeMap.keys());
  const staleEntries = Object.keys(registry).filter(
    (route) => !routeValues.has(route),
  );
  const count = (status: RouteCoverageStatus): number =>
    entries.filter((entry) => entry.status === status).length;
  const withPageObject = count('page-object');
  const notAScreen = count('not-a-screen');
  const screenRoutes = entries.length - notAScreen;
  const aliasedRoutes = entries
    .filter((entry) => entry.keyPaths.length > 1)
    .map((entry) => entry.route);

  return {
    generatedAt: new Date().toISOString(),
    summary: {
      totalRoutes: entries.length,
      withPageObject,
      withoutPageObject: count('no-page-object'),
      notAScreen,
      unregistered: count('unregistered'),
      staleEntries: staleEntries.length,
      coveragePercentage:
        screenRoutes > 0
          ? Math.round((withPageObject / screenRoutes) * 100)
          : 0,
    },
    routes: entries,
    aliasedRoutes,
    staleEntries,
  };
}
