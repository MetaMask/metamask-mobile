import React from 'react';
import {
  NavigationContainer,
  createNavigationContainerRef,
} from '@react-navigation/native';
import { render } from '@testing-library/react-native';
import VbaOnboardingNavigator from './VbaOnboardingNavigator';
import {
  VbaIdentityVerificationRoutes,
  VbaOnboardingRoutes,
  type VbaOnboardingParamList,
} from './routes';
import {
  VBA_DETAILS_SCREEN_IDS,
  VBA_FLOW_SCREEN_IDS,
  VBA_IDENTITY_ROUTE_SCREEN_IDS,
  VBA_MODAL_SCREEN_IDS,
  VBA_ONBOARDING_ROUTE_SCREEN_IDS,
} from './vbaScreenPerformance';

jest.mock('../../../KYC/Views/EmailAdapter', () => () => null);
jest.mock('../../../KYC/Views/SumSub/IdentityVerification', () => () => null);
jest.mock('./modules/VbaStatusAdapters', () => ({
  VbaAccountProvisioningErrorAdapter: () => null,
  VbaErrorAdapter: () => null,
  VbaIdentityVerifiedAdapter: () => null,
  VbaKycPendingAdapter: () => null,
  VbaKycRejectedAdapter: () => null,
}));
jest.mock('./modules/AccountCreateErrorAdapter', () => () => null);
jest.mock('./modules/VbaVendorTermsAdapter', () => () => null);
jest.mock('./VbaOnboardingLoading', () => () => null);
jest.mock('./VbaChooseCurrency', () => () => null);
jest.mock('../../../../../hooks/useScreenPerformance', () => ({
  ...jest.requireActual('../../../../../hooks/useScreenPerformance'),
  withScreenPerformance: (Component: React.ComponentType) => Component,
}));

describe('VBA screen performance coverage', () => {
  beforeEach(() => {
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('maps every registered onboarding route to visible screen ids', () => {
    const navigationRef =
      createNavigationContainerRef<VbaOnboardingParamList>();
    render(
      <NavigationContainer ref={navigationRef}>
        <VbaOnboardingNavigator />
      </NavigationContainer>,
    );

    const routeNames = navigationRef.getRootState().routeNames;

    expect(routeNames.length).toBeGreaterThan(0);
    expect(Object.keys(VBA_ONBOARDING_ROUTE_SCREEN_IDS).sort()).toEqual(
      [...routeNames].sort(),
    );
    expect(Object.values(VbaOnboardingRoutes).sort()).toEqual(
      [...routeNames].sort(),
    );
  });

  it('maps every nested identity route to a visible screen id', () => {
    expect(Object.keys(VBA_IDENTITY_ROUTE_SCREEN_IDS).sort()).toEqual(
      Object.values(VbaIdentityVerificationRoutes).sort(),
    );
  });

  it('accounts for every declared VBA screen id exactly once', () => {
    const onboardingScreenIds = Object.values(
      VBA_ONBOARDING_ROUTE_SCREEN_IDS,
    ).flat();
    const mappedScreenIds = [
      ...onboardingScreenIds,
      ...VBA_DETAILS_SCREEN_IDS,
      ...VBA_MODAL_SCREEN_IDS,
    ];

    expect(new Set(mappedScreenIds)).toEqual(new Set(VBA_FLOW_SCREEN_IDS));
    expect(mappedScreenIds).toHaveLength(VBA_FLOW_SCREEN_IDS.length);
  });
});
