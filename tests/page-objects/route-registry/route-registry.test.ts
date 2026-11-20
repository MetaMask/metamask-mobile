import Routes from '../../../app/constants/navigation/Routes';
import {
  flattenRouteDefinitions,
  getRouteCoverage,
  NOT_A_SCREEN,
  ROUTE_PAGE_OBJECT_REGISTRY,
} from '.';

describe('route page object registry', () => {
  it('contains every route value from Routes.ts', () => {
    const report = getRouteCoverage(
      flattenRouteDefinitions(Routes),
      ROUTE_PAGE_OBJECT_REGISTRY,
    );

    expect(report.summary.unregistered).toBe(0);
    expect(report.summary.staleEntries).toBe(0);
  });

  it('excludes navigator hosts from the coverage denominator', () => {
    const report = getRouteCoverage(
      flattenRouteDefinitions(Routes),
      ROUTE_PAGE_OBJECT_REGISTRY,
    );

    expect(report.summary.notAScreen).toBeGreaterThan(0);
    expect(report.summary.coveragePercentage).toBeLessThanOrEqual(100);
  });

  it('uses the exported sentinel for non-screen routes', () => {
    expect(NOT_A_SCREEN).toBe('not-a-screen');
    expect(ROUTE_PAGE_OBJECT_REGISTRY.Main).toBe(NOT_A_SCREEN);
  });
});
