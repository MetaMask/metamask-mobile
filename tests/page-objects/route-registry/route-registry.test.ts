import Routes from '../../../app/constants/navigation/Routes';
import {
  flattenRouteDefinitions,
  getRouteCoverage,
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

  it('does not require a page object for every route', () => {
    const report = getRouteCoverage(
      flattenRouteDefinitions(Routes),
      ROUTE_PAGE_OBJECT_REGISTRY,
    );

    expect(report.summary.withoutPageObject).toBeGreaterThan(0);
  });

  it('excludes navigator hosts from the coverage denominator', () => {
    const report = getRouteCoverage(
      flattenRouteDefinitions(Routes),
      ROUTE_PAGE_OBJECT_REGISTRY,
    );

    expect(report.summary.notAScreen).toBeGreaterThan(0);
    expect(report.summary.coveragePercentage).toBeLessThanOrEqual(100);
  });
});
