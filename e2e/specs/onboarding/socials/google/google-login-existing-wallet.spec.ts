import OnboardingCarouselView from '../../../../pages/Onboarding/OnboardingCarouselView';
import { acceptTermOfUse } from '../../../../viewHelper';
import { Regression } from '../../../../tags';
import TestHelpers from '../../../../helpers';
import OnboardingView from '../../../../pages/Onboarding/OnboardingView';
import OnboardingBottomSheetView from '../../../../pages/Onboarding/OnboardingBottomSheetView';
import AccountStatusView from '../../../../pages/Onboarding/AccountStatusView';
import { startMockServer, stopMockServer } from '../../../../api-mocking/mock-server';
import Assertions from '../../../../utils/Assertions';
import LoginView from '../../../../pages/wallet/LoginView';
import { SeedlessOnboardingTestUtilts } from '../../../../../app/util/test/seedlessOnboardingTestUtilts';
import { applyMock } from '../../mocks';
import { AuthConnection } from '@metamask/seedless-onboarding-controller';
import { OAuthLoginResultType } from '../../../../../app/core/OAuthService/OAuthInterface';

describe(Regression('Existing Wallet -> Google login'), () => {
  const TEST_SPECIFIC_MOCK_SERVER_PORT = 8000;
  let mockServer: any;
  beforeAll(async () => {

    const testSpecificMock = [
      SeedlessOnboardingTestUtilts.getInstance().generateMockOAuthLoginResponse({
        authConnection: AuthConnection.Google,
        idToken: 'mock-id-token',
        clientId: 'mock-byoa-client-id',
      }),
      SeedlessOnboardingTestUtilts.getInstance().generateMockSeedlessAuthenticateResponse({
        type: OAuthLoginResultType.SUCCESS,
        existingUser: true,
        accountName: 'existing-account-name',
      }),
    ];
    await TestHelpers.reverseServerPort();

    mockServer = await startMockServer({}, TEST_SPECIFIC_MOCK_SERVER_PORT);
    applyMock(mockServer, testSpecificMock);

    await TestHelpers.launchApp({
      newInstance: true,
      delete: true,
      launchArgs: { mockServerPort: String(TEST_SPECIFIC_MOCK_SERVER_PORT) },
    });
  });

  afterAll(async () => {
    if (mockServer) {
      await stopMockServer(mockServer);
    }
  });

  it('should login with google and create existing user', async () => {
    await OnboardingCarouselView.tapOnGetStartedButton();
    await acceptTermOfUse();
    await OnboardingView.tapCreateWallet();
    await OnboardingBottomSheetView.tapGoogleButton();
  });

  it('should navigate to Account Status screen', async () => {
    await Assertions.checkIfVisible(AccountStatusView.container);
    await AccountStatusView.tapCreateOrLogInButton();
  });

  it('should open Welcome back screen', async () => {
    await Assertions.checkIfVisible(LoginView.container);
  });

});