import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { EMPTY_VBA_ONBOARDING_SNAPSHOT } from '../../../Ramp/Views/VirtualBankAccount/vbaOnboardingSnapshot';
import VbaIdentityVerificationModule, {
  getVbaIdentityVerificationInitialRoute,
  openPartnerTerms,
  resetToProvider,
} from './IdentityVerification';
import { VbaSumSubKycSelectorsIDs } from './SumSubKyc';
import {
  VbaPartnerTermsSelectorsIDs,
  VbaVerifyIdentitySelectorsIDs,
} from './VerifyIdentity.testIds';
import { VbaIdentityVerificationRoutes } from '../../../Ramp/Views/VirtualBankAccount/routes';
import Engine from '../../../../../core/Engine';
import I18n from '../../../../../../locales/i18n';
import { toSumSubLocale } from '../../utils/toSumSubLocale';
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
  // `kycScreenPerformance` re-exports SCREEN_CONTENT_STATE from this module,
  // so the real constants have to survive the mock.
  ...jest.requireActual('../../../../../hooks/useScreenPerformance'),
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

const newSessionRoute = {
  key: 'VbaIdentityVerificationKey',
  params: { snapshot: EMPTY_VBA_ONBOARDING_SNAPSHOT },
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
  // Mounting the navigator pulls in the whole identity-verification module
  // graph, which takes several seconds on a cold worker — more than Jest's
  // 5s default for the first test to render it. Measured at 13s against a
  // cold cache locally, so this leaves real headroom for slower CI machines.
  const NAVIGATOR_RENDER_TIMEOUT_MS = 60_000;

  const catalog = {
    idOS: [
      {
        key: 'idos-privacy',
        version: '1',
        title: 'idOS Privacy Policy',
        url: 'https://idos.example/privacy',
      },
    ],
    kycProvider: [
      {
        key: 'sumsub-terms',
        version: '2',
        title: 'Sumsub Notice of Personal Data Processing',
        url: 'https://sumsub.example/notice',
      },
    ],
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

  it(
    'launches SumSub directly on re-entry with an abandoned provider flow',
    async () => {
      const { queryByTestId } = renderWithProvider(
        <VbaIdentityVerificationModule
          route={abandonedRoute}
          navigation={moduleNavigation}
        />,
      );

      await waitFor(() => {
        expect(mockKycController.launchProviderFlow).toHaveBeenCalledWith({
          locale: toSumSubLocale(I18n.locale),
        });
      });
      expect(
        queryByTestId(VbaSumSubKycSelectorsIDs.CONTAINER),
      ).toBeOnTheScreen();
    },
    NAVIGATOR_RENDER_TIMEOUT_MS,
  );

  it(
    'launches SumSub through the same provider screen when terms are accepted',
    async () => {
      const { getByTestId } = renderWithProvider(
        <VbaIdentityVerificationModule
          route={termsAcceptedRoute}
          navigation={moduleNavigation}
        />,
      );

      await waitFor(() => {
        expect(mockKycController.launchProviderFlow).toHaveBeenCalledWith({
          locale: toSumSubLocale(I18n.locale),
        });
      });
      expect(getByTestId(VbaSumSubKycSelectorsIDs.CONTAINER)).toBeOnTheScreen();
    },
    NAVIGATOR_RENDER_TIMEOUT_MS,
  );

  it(
    'walks a new session from the introduction through the partners page to the provider',
    async () => {
      const { getByTestId, findByTestId } = renderWithProvider(
        <VbaIdentityVerificationModule
          route={newSessionRoute}
          navigation={moduleNavigation}
        />,
      );

      // Page 1 enables its CTA once the catalog lands.
      await waitFor(() => {
        expect(
          getByTestId(VbaVerifyIdentitySelectorsIDs.CONTINUE_BUTTON),
        ).toBeEnabled();
      });
      fireEvent.press(
        getByTestId(VbaVerifyIdentitySelectorsIDs.CONTINUE_BUTTON),
      );

      // Page 2 renders the catalog it was handed, with no fetch of its own.
      const agreeButton = await findByTestId(
        VbaPartnerTermsSelectorsIDs.AGREE_BUTTON,
      );
      expect(agreeButton).toBeDisabled();
      expect(mockKycController.fetchSessionDisclaimers).toHaveBeenCalledTimes(
        1,
      );

      fireEvent(
        getByTestId(VbaPartnerTermsSelectorsIDs.BIOMETRIC_CONSENT_CHECKBOX),
        'change',
        true,
      );
      fireEvent.press(agreeButton);

      await waitFor(() => {
        expect(mockKycController.launchProviderFlow).toHaveBeenCalled();
      });
    },
    NAVIGATOR_RENDER_TIMEOUT_MS,
  );
});

describe('openPartnerTerms', () => {
  it('carries the loaded catalog to the partners page', () => {
    const navigate = jest.fn();
    const disclaimers = [
      {
        id: 'idOS:idos-privacy',
        key: 'idos-privacy',
        version: '1',
        title: 'idOS Privacy Policy',
        url: 'https://idos.example/privacy',
      },
    ];

    openPartnerTerms(
      { navigate } as unknown as Parameters<typeof openPartnerTerms>[0],
      disclaimers,
    );

    expect(navigate).toHaveBeenCalledWith(
      VbaIdentityVerificationRoutes.PARTNER_TERMS,
      { disclaimers },
    );
  });
});

describe('resetToProvider', () => {
  it('leaves the provider as the only route, so closing it exits the module', () => {
    const reset = jest.fn();

    resetToProvider({
      reset,
    } as unknown as Parameters<typeof resetToProvider>[0]);

    expect(reset).toHaveBeenCalledWith({
      index: 0,
      routes: [{ name: VbaIdentityVerificationRoutes.PROVIDER }],
    });
  });
});
