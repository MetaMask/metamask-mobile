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

  it('does not associate similarly named page objects with unrelated routes', () => {
    expect(ROUTE_PAGE_OBJECT_REGISTRY.RampVbaOnboarding).toBeNull();
    expect(ROUTE_PAGE_OBJECT_REGISTRY.RewardsSettingsView).toBeNull();
    expect(ROUTE_PAGE_OBJECT_REGISTRY.CardOnboardingSignUp).toBeNull();
    expect(ROUTE_PAGE_OBJECT_REGISTRY.AccountSelector).toBeNull();
    expect(ROUTE_PAGE_OBJECT_REGISTRY.PerpsTrendingView).toBeNull();
  });

  it('keeps product root screens eligible for page-object coverage', () => {
    expect(ROUTE_PAGE_OBJECT_REGISTRY.ProSubscription).toBeNull();
    expect(ROUTE_PAGE_OBJECT_REGISTRY.ProHub).toBeNull();
    expect(ROUTE_PAGE_OBJECT_REGISTRY.ProSubscription).not.toBe('NOT_A_SCREEN');
    expect(ROUTE_PAGE_OBJECT_REGISTRY.ProHub).not.toBe('NOT_A_SCREEN');
  });
});
