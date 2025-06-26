import OnboardingCarouselView from '../../../../pages/Onboarding/OnboardingCarouselView';
import { acceptTermOfUse } from '../../../../viewHelper';
import { Regression } from '../../../../tags';
import TestHelpers from '../../../../helpers';
import OnboardingView from '../../../../pages/Onboarding/OnboardingView';
import OnboardingBottomSheetView from '../../../../pages/Onboarding/OnboardingBottomSheetView';
import AccountStatusView from '../../../../pages/Onboarding/AccountStatusView';
import CreatePasswordView from '../../../../pages/Onboarding/CreatePasswordView';
import { startMockServer, stopMockServer } from '../../../../api-mocking/mock-server';
import MetaMetricsOptIn from '../../../../pages/Onboarding/MetaMetricsOptInView';
import OnboardingSuccessView from '../../../../pages/Onboarding/OnboardingSuccessView';
import Assertions from '../../../../utils/Assertions';
import LoginView from '../../../../pages/wallet/LoginView';
import WalletView from '../../../../pages/wallet/WalletView';
import { SeedlessOnboardingTestUtilts } from '../../../../../app/util/test/seedlessOnboardingTestUtilts';
import { applyMock } from '../../mocks';
import { AuthConnection } from '@metamask/seedless-onboarding-controller';
import { OAuthLoginResultType } from '../../../../../app/core/OAuthService/OAuthInterface';


describe(Regression('Create Wallet -> Apple login -> new user'), () => {
  const TEST_SPECIFIC_MOCK_SERVER_PORT = 8000;
  let mockServer: any;
  beforeAll(async () => {

    const testSpecificMock = [
      SeedlessOnboardingTestUtilts.getInstance().generateMockOAuthLoginResponse({
        authConnection: AuthConnection.Apple,
        code: 'mock-code',
        clientId: 'mock-byoa-client-id',
        codeVerifier: 'mock-code-verifier',
        redirectUri: 'https://api-develop-torus-byoa.web3auth.io/api/v1/oauth/callback',
      }),
      SeedlessOnboardingTestUtilts.getInstance().generateMockSeedlessAuthenticateResponse({
        type: OAuthLoginResultType.SUCCESS,
        existingUser: false,
        accountName: 'new-account-name',
      }),
      SeedlessOnboardingTestUtilts.getInstance().generateMockCreateToprfKeyAndBackupSeedPhraseResponse({
        ignore: true,
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

  it('should login with apple and create new user', async () => {
    await OnboardingCarouselView.tapOnGetStartedButton();
    await acceptTermOfUse();
    await OnboardingView.tapCreateWallet();
    await OnboardingBottomSheetView.tapAppleButton();
  });

  it('should navigate to Create Password screen', async () => {
    await Assertions.checkIfVisible(CreatePasswordView.container);
    await CreatePasswordView.enterPassword('123456789');
    await CreatePasswordView.reEnterPassword('123456789');
    await CreatePasswordView.tapIUnderstandCheckBox();
    await CreatePasswordView.tapCreatePasswordButton();
  });

  it('should agree to metametrics', async () => {
    await Assertions.checkIfVisible(MetaMetricsOptIn.container);
    await MetaMetricsOptIn.tapAgreeButton();
  });

  it('should dismiss the onboarding success screen', async () => {
    await Assertions.checkIfVisible(OnboardingSuccessView.container);
    await OnboardingSuccessView.tapDone();
  });

  it('should relaunch the app and log in', async () => {
    // Relaunch app
    await device.sendToHome();
    await TestHelpers.relaunchApp();
    await Assertions.checkIfVisible(LoginView.container);
    await LoginView.enterPassword('123456789');
    await Assertions.checkIfVisible(WalletView.container);
  });

});

describe(Regression('Create Wallet -> Apple login -> existing user'), () => {
  const TEST_SPECIFIC_MOCK_SERVER_PORT = 8000;
  let mockServer: any;
  beforeAll(async () => {

    const testSpecificMock = [
      SeedlessOnboardingTestUtilts.getInstance().generateMockOAuthLoginResponse({
        authConnection: AuthConnection.Apple,
        code: 'mock-code',
        clientId: 'mock-byoa-client-id',
        codeVerifier: 'mock-code-verifier',
        redirectUri: 'https://api-develop-torus-byoa.web3auth.io/api/v1/oauth/callback',
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

  it('should login with apple and create existing user', async () => {
    await OnboardingCarouselView.tapOnGetStartedButton();
    await acceptTermOfUse();
    await OnboardingView.tapCreateWallet();
    await OnboardingBottomSheetView.tapAppleButton();
  });

  it('should navigate to Account Status screen', async () => {
    await Assertions.checkIfVisible(AccountStatusView.container);
    await AccountStatusView.tapCreateOrLogInButton();
  });

  it('should open Welcome back screen', async () => {
    await Assertions.checkIfVisible(LoginView.container);
  });

});