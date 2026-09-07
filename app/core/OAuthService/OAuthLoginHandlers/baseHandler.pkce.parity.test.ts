import {
  AuthConnection,
  AuthRequestParams,
  HandleFlowParams,
  LoginHandlerResult,
} from '../OAuthInterface';
import { BaseLoginHandler } from './baseHandler';
import { Web3AuthNetwork } from '@metamask/seedless-onboarding-controller';

// react-native-quick-crypto is a native module and cannot run inside Jest.
// Delegate `randomBytes`/`createHash` to Node's `crypto` implementation so
// PKCE output is byte-exact against RFC 7636's published known-answer
// vector — the same OpenSSL backend react-native-quick-crypto 1.x wraps
// natively.
jest.mock('react-native-quick-crypto', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('../../../util/test/nodeQuickCryptoMock'),
);

// Concrete subclass exposing the protected PKCE generator for testing,
// mirroring the `MockLoginHandler` pattern used by baseHandler.test.ts.
class MockLoginHandler extends BaseLoginHandler {
  getAuthTokenRequestData(): AuthRequestParams {
    return {} as AuthRequestParams;
  }

  get authConnection(): AuthConnection {
    return AuthConnection.Google;
  }

  get scope(): string[] {
    return ['openid', 'email', 'profile'];
  }

  get authServerPath(): string {
    return 'auth/google';
  }

  async login(): Promise<LoginHandlerResult> {
    return {
      authConnection: AuthConnection.Google,
      code: 'mock-auth-code',
      clientId: 'mock-client-id',
      redirectUri: 'mock-redirect-uri',
      codeVerifier: 'mock-code-verifier',
    };
  }

  public exposedGenerateCodeVerifierChallenge() {
    return this.generateCodeVerifierChallenge();
  }
}

const mockBaseHandlerParams = {
  authServerUrl: 'https://auth.example.com',
  clientId: 'mock-client-id',
  web3AuthNetwork: Web3AuthNetwork.Mainnet,
};

describe('BaseLoginHandler PKCE parity', () => {
  it('derives the RFC 7636 Appendix B code_challenge from randomBytes-sourced code_verifier', async () => {
    // Raw bytes that base64url-decode to the RFC 7636 Appendix B
    // code_verifier ("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk").
    // https://www.rfc-editor.org/rfc/rfc7636#appendix-B
    const rfcVerifierBytes = Buffer.from(
      '7418dfb49799e0254ffa607dd8adbbba16d4254d69d6bff05b58055853848d79',
      'hex',
    );
    const QuickCrypto = jest.requireMock<{
      default: { randomBytes: jest.Mock };
    }>('react-native-quick-crypto').default;
    jest
      .spyOn(QuickCrypto, 'randomBytes')
      .mockReturnValueOnce(rfcVerifierBytes);

    const handler = new MockLoginHandler(mockBaseHandlerParams);
    const { codeVerifier, challenge } =
      handler.exposedGenerateCodeVerifierChallenge();

    expect(codeVerifier).toBe('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk');
    expect(challenge).toBe('E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM');
  });
});
