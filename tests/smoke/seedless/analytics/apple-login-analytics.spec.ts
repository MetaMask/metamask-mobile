'use strict';
import { Mockttp } from 'mockttp';

import FixtureBuilder from '../../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../../framework/fixtures/FixtureHelper';
import { SmokeSeedlessAnalytics } from '../../../tags';
import { createOAuthMockttpService } from '../../../api-mocking/seedless-onboarding';
import { E2EOAuthHelpers } from '../../../module-mocking/oauth';
import { appleLoginNewUserAnalyticsExpectations } from '../../../helpers/analytics/expectations/apple-login-new-user.analytics';
import { completeAppleNewUserOnboarding } from '../utils';

describe(
  SmokeSeedlessAnalytics('Analytics - Apple Social Login New User'),
  () => {
    beforeAll(async () => {
      jest.setTimeout(300000);
    });

    beforeEach(async () => {
      E2EOAuthHelpers.reset();
      E2EOAuthHelpers.configureAppleNewUser();
    });

    it('tracks analytics events during Apple social login onboarding', async () => {
      await withFixtures(
        {
          fixture: new FixtureBuilder({ onboarding: true }).build(),
          restartDevice: true,
          testSpecificMock: async (mockServer: Mockttp) => {
            const oAuthMockttpService = createOAuthMockttpService();
            oAuthMockttpService.configureAppleNewUser();
            await oAuthMockttpService.setup(mockServer);
          },
          analyticsExpectations: appleLoginNewUserAnalyticsExpectations,
        },
        async () => {
          await completeAppleNewUserOnboarding();
        },
      );
    });
  },
);
