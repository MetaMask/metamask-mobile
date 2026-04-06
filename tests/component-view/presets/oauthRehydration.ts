import { AuthConnection } from '@metamask/seedless-onboarding-controller';
import { createStateFixture } from '../stateFixture';

export const initialStateOAuthRehydration = () =>
  createStateFixture().withOverrides({
    engine: {
      backgroundState: {
        SeedlessOnboardingController: {
          authConnection: AuthConnection.Google,
        },
      },
    },
  });
