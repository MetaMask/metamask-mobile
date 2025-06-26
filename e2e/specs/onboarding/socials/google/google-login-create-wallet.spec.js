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


describe(Regression('Create Wallet -> Google login -> new user'), () => {
  const TEST_SPECIFIC_MOCK_SERVER_PORT = 8000;
  let mockServer;
  beforeAll(async () => {

    const testSpecificMock = [
      SeedlessOnboardingTestUtilts.getInstance().generateMockOAuthLoginResponse({
        authConnection: 'google',
        idToken: 'mock-id-token',
        clientId: 'mock-byoa-client-id',
      }),
      SeedlessOnboardingTestUtilts.getInstance().generateMockSeedlessAuthenticateResponse({
        type: 'success',
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

  it('should login with google and create new user', async () => {
    await OnboardingCarouselView.tapOnGetStartedButton();
    await acceptTermOfUse();
    await OnboardingView.tapCreateWallet();
    await OnboardingBottomSheetView.tapGoogleButton();
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
    await TestHelpers.relaunchApp();
    await Assertions.checkIfVisible(LoginView.container);
    await LoginView.enterPassword('123456789');
    await Assertions.checkIfVisible(WalletView.container);
  });

});

describe(Regression('Create Wallet -> Google login -> existing user'), () => {
  const TEST_SPECIFIC_MOCK_SERVER_PORT = 8000;
  let mockServer;
  beforeAll(async () => {

    const testSpecificMock = [
      SeedlessOnboardingTestUtilts.getInstance().generateMockOAuthLoginResponse({
        authConnection: 'google',
        idToken: 'mock-id-token',
        clientId: 'mock-byoa-client-id',
      }),
      SeedlessOnboardingTestUtilts.getInstance().generateMockSeedlessAuthenticateResponse({
        type: 'success',
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