import React from 'react';
import { waitFor } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { EMPTY_VBA_ONBOARDING_SNAPSHOT } from '../../../Ramp/Views/VirtualBankAccount/vbaOnboardingSnapshot';
import VbaIdentityVerificationModule, {
  getVbaIdentityVerificationInitialRoute,
  replaceProviderTermsWithProvider,
} from './IdentityVerification';
import { VbaSumSubKycSelectorsIDs } from './SumSubKyc';
import { VbaIdentityVerificationRoutes } from '../../../Ramp/Views/VirtualBankAccount/routes';
import Engine from '../../../../../core/Engine';
import type { KycProviderFlowStatus } from '@metamask/kyc-controller';

jest.mock('../../../../../core/Engine', () => ({
  context: {
    KycController: {
      fetchSessionDisclaimers: jest.fn(),
      recordSessionDisclaimers: jest.fn(),
      launchProviderFlow: jest.fn(),
    },
    KycService: {
      getGeoCountry: jest.fn(),
    },
  },
}));

jest.mock('../../../../../util/Logger', () => ({
  __esModule: true,
  default: {
    log: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('../../../../../hooks/useScreenPerformance', () => ({
  useScreenPerformance: jest.fn(),
  withScreenPerformance: (Component: React.ComponentType) => Component,
}));

const mockKycController = Engine.context.KycController as unknown as {
  fetchSessionDisclaimers: jest.Mock<Promise<unknown>, [unknown]>;
  recordSessionDisclaimers: jest.Mock<Promise<void>, [unknown]>;
  launchProviderFlow: jest.Mock<Promise<KycProviderFlowStatus>, [unknown]>;
};
const mockKycService = Engine.context.KycService as unknown as {
  getGeoCountry: jest.Mock<Promise<string>, []>;
};

const abandonedSnapshot = {
  ...EMPTY_VBA_ONBOARDING_SNAPSHOT,
  sessionDisclaimersComplete: true,
  providerFlowStatus: 'abandoned' as const,
};

const abandonedRoute = {
  key: 'VbaIdentityVerificationKey',
  params: { snapshot: abandonedSnapshot },
} as React.ComponentProps<typeof VbaIdentityVerificationModule>['route'];

// Terms were accepted earlier, on Verify Identity; re-entry lands on the
// provider screen without an abandoned flow behind it.
const termsAcceptedSnapshot = {
  ...EMPTY_VBA_ONBOARDING_SNAPSHOT,
  sessionDisclaimersComplete: true,
};

const termsAcceptedRoute = {
  key: 'VbaIdentityVerificationKey',
  params: { snapshot: termsAcceptedSnapshot },
} as React.ComponentProps<typeof VbaIdentityVerificationModule>['route'];

const moduleNavigation = {} as React.ComponentProps<
  typeof VbaIdentityVerificationModule
>['navigation'];

describe('getVbaIdentityVerificationInitialRoute', () => {
  it('resumes at the first incomplete internal step', () => {
    expect({
      newSession: getVbaIdentityVerificationInitialRoute(
        EMPTY_VBA_ONBOARDING_SNAPSHOT,
      ),
      providerTermsAccepted: getVbaIdentityVerificationInitialRoute({
        ...EMPTY_VBA_ONBOARDING_SNAPSHOT,
        sessionDisclaimersComplete: true,
      }),
    }).toMatchInlineSnapshot(`
      {
        "newSession": "VbaIdentityVerificationProviderTerms",
        "providerTermsAccepted": "VbaIdentityVerificationProvider",
      }
    `);
  });

  it('launches SumSub directly when re-entering with an abandoned provider flow', () => {
    expect(getVbaIdentityVerificationInitialRoute(abandonedSnapshot)).toBe(
      VbaIdentityVerificationRoutes.PROVIDER,
    );
  });
});

describe('VbaIdentityVerificationModule', () => {
  const catalog = {
    idOS: [{ key: 'idos-privacy', version: '1' }],
    kycProvider: [{ key: 'sumsub-terms', version: '2' }],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockKycService.getGeoCountry.mockResolvedValue('BRA');
    mockKycController.fetchSessionDisclaimers.mockResolvedValue(catalog);
    mockKycController.recordSessionDisclaimers.mockResolvedValue(undefined);
    // Never resolves: the assertions are on the launch happening at all,
    // so the flow outcome is irrelevant to this suite.
    mockKycController.launchProviderFlow.mockReturnValue(
      new Promise(() => undefined),
    );
  });

  it('launches SumSub directly on re-entry with an abandoned provider flow', async () => {
    const { queryByTestId } = renderWithProvider(
      <VbaIdentityVerificationModule
        route={abandonedRoute}
        navigation={moduleNavigation}
      />,
    );

    await waitFor(() => {
      expect(mockKycController.launchProviderFlow).toHaveBeenCalledWith({});
    });
    expect(queryByTestId(VbaSumSubKycSelectorsIDs.CONTAINER)).toBeOnTheScreen();
  });

  it('launches SumSub through the same provider screen when terms are accepted', async () => {
    const { getByTestId } = renderWithProvider(
      <VbaIdentityVerificationModule
        route={termsAcceptedRoute}
        navigation={moduleNavigation}
      />,
    );

    await waitFor(() => {
      expect(mockKycController.launchProviderFlow).toHaveBeenCalledWith({});
    });
    expect(getByTestId(VbaSumSubKycSelectorsIDs.CONTAINER)).toBeOnTheScreen();
  });
});

describe('replaceProviderTermsWithProvider', () => {
  it('replaces provider terms instead of adding another back route', () => {
    const replace = jest.fn();

    replaceProviderTermsWithProvider({
      replace,
    } as unknown as Parameters<typeof replaceProviderTermsWithProvider>[0]);

    expect(replace).toHaveBeenCalledWith(
      VbaIdentityVerificationRoutes.PROVIDER,
    );
  });
});
