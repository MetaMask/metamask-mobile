import {
  getRouteCoverage,
  NOT_A_SCREEN,
  type RoutePageObjectRegistry,
} from '.';

describe('getRouteCoverage', () => {
  it('reports page objects, gaps, non-screens, unregistered routes, and stale entries', () => {
    const registry: RoutePageObjectRegistry = {
      WalletView: 'WalletView',
      Settings: null,
      Main: NOT_A_SCREEN,
      RemovedRoute: null,
    };

    const report = getRouteCoverage(
      [
        { value: 'WalletView', keyPath: 'WALLET_VIEW' },
        { value: 'Settings', keyPath: 'SETTINGS.ROOT' },
        { value: 'Main', keyPath: 'MAIN_FLOW' },
        { value: 'NewRoute', keyPath: 'NEW_ROUTE' },
      ],
      registry,
    );

    expect(report.summary).toEqual({
      totalRoutes: 4,
      withPageObject: 1,
      withoutPageObject: 1,
      notAScreen: 1,
      unregistered: 1,
      staleEntries: 1,
      coveragePercentage: 33,
    });
    expect(report.routes).toEqual([
      {
        route: 'WalletView',
        keyPaths: ['WALLET_VIEW'],
        status: 'page-object',
        pageObject: 'WalletView',
      },
      {
        route: 'Settings',
        keyPaths: ['SETTINGS.ROOT'],
        status: 'no-page-object',
      },
      {
        route: 'Main',
        keyPaths: ['MAIN_FLOW'],
        status: 'not-a-screen',
      },
      {
        route: 'NewRoute',
        keyPaths: ['NEW_ROUTE'],
        status: 'unregistered',
      },
    ]);
    expect(report.staleEntries).toEqual(['RemovedRoute']);
  });

  it('preserves all key paths when route values are aliases', () => {
    const report = getRouteCoverage(
      [
        { value: 'SharedScreen', keyPath: 'FIRST.SHARED' },
        { value: 'SharedScreen', keyPath: 'SECOND.SHARED' },
      ],
      { SharedScreen: 'SharedScreen' },
    );

    expect(report.routes).toEqual([
      {
        route: 'SharedScreen',
        keyPaths: ['FIRST.SHARED', 'SECOND.SHARED'],
        status: 'page-object',
        pageObject: 'SharedScreen',
      },
    ]);
  });
});
