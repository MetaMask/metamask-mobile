'use strict';
import { Mockttp } from 'mockttp';

import FixtureBuilder from '../../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../../framework/fixtures/FixtureHelper';
import { SmokeSeedlessOnboarding } from '../../../tags';
import { createOAuthMockttpService } from '../../../api-mocking/seedless-onboarding';
import { E2EOAuthHelpers } from '../../../module-mocking/oauth';
import { setupRemoteFeatureFlagsMock } from '../../../api-mocking/helpers/remoteFeatureFlagsHelper';
import { remoteFeaturePredictGtmOnboardingModalDisabled } from '../../../api-mocking/mock-responses/feature-flags-mocks';
import { googleLoginNewUserAnalyticsExpectations } from '../../../helpers/analytics/expectations/google-login.analytics';
import { completeGoogleNewUserOnboarding } from '../utils';

describe(
  SmokeSeedlessOnboarding('Analytics - Google Social Login New User'),
  () => {
    beforeAll(async () => {
      jest.setTimeout(300000);
    });

    beforeEach(async () => {
      E2EOAuthHelpers.reset();
      E2EOAuthHelpers.configureGoogleNewUser();
    });

    it('tracks analytics events during Google social login onboarding', async () => {
      await withFixtures(
        {
          fixture: new FixtureBuilder({ onboarding: true }).build(),
          restartDevice: true,
          testSpecificMock: async (mockServer: Mockttp) => {
            const oAuthMockttpService = createOAuthMockttpService();
            oAuthMockttpService.configureGoogleNewUser();
            await oAuthMockttpService.setup(mockServer);
            await setupRemoteFeatureFlagsMock(
              mockServer,
              remoteFeaturePredictGtmOnboardingModalDisabled(),
            );
          },
          analyticsExpectations: googleLoginNewUserAnalyticsExpectations,
        },
        async () => {
          await completeGoogleNewUserOnboarding();
        },
      );
    });
  },
);
