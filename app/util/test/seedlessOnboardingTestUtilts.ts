import { HandleOAuthLoginResult, LoginHandlerResult } from '../../core/OAuthService/OAuthInterface';

export class SeedlessOnboardingTestUtilts {
  public static instance: SeedlessOnboardingTestUtilts | null = null;

  public static getInstance(): SeedlessOnboardingTestUtilts {
    if (!SeedlessOnboardingTestUtilts.instance) {
      SeedlessOnboardingTestUtilts.instance = new SeedlessOnboardingTestUtilts();
    }
    return SeedlessOnboardingTestUtilts.instance;
  }

  public static resetInstance(): void {
    SeedlessOnboardingTestUtilts.instance = null;
  }

  // These are not real urls, they are used to mock the OAuthService.handleSeedlessAuthenticate and OAuthService.handleOAuthLogin methods
  readonly #mockClipboardTextURL = 'https://mock-clipboard-text';
  readonly #mockOAuthServiceLoginURL = 'https://mock-oauth-service-login';
  readonly #mockControllerAuthenticateURL =
    'https://mock-controller-authenticate';
  readonly #mockCreateToprfKeyAndBackupSeedPhraseURL =
    'https://mock-create-toprf-key-and-backup-seed-phrase';

  public async getMockedClipboardTextResponse(): Promise<string> {
    const response = await fetch(this.#mockClipboardTextURL, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    const data = await response.json();
    return data.clipboardText;
  }

  public async getMockedOAuthLoginResponse(): Promise<LoginHandlerResult> {
    const response = await fetch(this.#mockOAuthServiceLoginURL, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return await response.json();
  }

  public async getMockedSeedlessAuthenticateResponse(): Promise<HandleOAuthLoginResult> {
    const response = await fetch(this.#mockControllerAuthenticateURL, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return await response.json();
  }

  public async getMockedCreateToprfKeyAndBackupSeedPhraseResponse(): Promise<{ ignore: boolean }> {
    const response = await fetch(this.#mockCreateToprfKeyAndBackupSeedPhraseURL, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return await response.json();
  }

  public generateMockOAuthLoginResponse(response: LoginHandlerResult) {
    return {
      urlEndpoint: this.#mockOAuthServiceLoginURL,
      response,
      responseCode: 200,
    };
  }

  public generateMockSeedlessAuthenticateResponse(
    response: HandleOAuthLoginResult,
  ) {
    return {
      urlEndpoint: this.#mockControllerAuthenticateURL,
      response,
      responseCode: 200,
    };
  }

  public generateMockCreateToprfKeyAndBackupSeedPhraseResponse(
    response: { ignore: boolean },
  ) {
    return {
      urlEndpoint: this.#mockCreateToprfKeyAndBackupSeedPhraseURL,
      response,
      responseCode: 200,
    };
  }
}
