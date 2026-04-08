import {
  getE2EByoaAuthSecret,
  getE2EMockOAuthEmailForQaMock,
} from '../../util/environment';
import { E2E_QA_MOCK_OAUTH_TOKEN_URL } from './OAuthLoginHandlers/constants';
import { OAuthError, OAuthErrorType } from './error';
import { BaseLoginHandler } from './OAuthLoginHandlers/baseHandler';
import {
  OAuthLoginResultType,
  type AuthResponse,
  type HandleOAuthLoginResult,
  type OAuthUserInfo,
} from './OAuthInterface';

export interface QAMockTokenExchangeResult {
  data: AuthResponse;
  userId: string;
  accountName: string;
}

const DEFAULT_E2E_BYOA_AUTH_SECRET = '6SMBaAx6*TG8AEQ+7Ap#zEUAIZ42';

const generateUniqueE2EEmail = (): string => {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${rand}${Date.now()}+e2e@web3auth.io`;
};

export class QAMockOAuthService {
  static async exchangeTokens(
    loginHandler: BaseLoginHandler,
    fetchImpl: typeof fetch = global.fetch,
  ): Promise<QAMockTokenExchangeResult> {
    const byoaSecret = getE2EByoaAuthSecret() ?? DEFAULT_E2E_BYOA_AUTH_SECRET;

    const emailForMock =
      getE2EMockOAuthEmailForQaMock() ?? generateUniqueE2EEmail();

    const response = await fetchImpl(E2E_QA_MOCK_OAUTH_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'byoa-auth-secret': byoaSecret,
      },
      body: JSON.stringify({
        email_id: emailForMock,
        client_id: loginHandler.options.clientId,
        login_provider: loginHandler.authConnection,
        access_type: 'offline',
      }),
    });

    if (!response.ok) {
      throw new OAuthError(
        `QA mock token request failed: ${response.status}`,
        OAuthErrorType.LoginError,
      );
    }

    const rawResponse: unknown = await response.json();
    const data = QAMockOAuthService.parseAuthServiceResponse(rawResponse);

    const jwtPayload = JSON.parse(
      loginHandler.decodeIdToken(data.id_token),
    ) as Partial<OAuthUserInfo>;
    const userId = jwtPayload.sub ?? `e2e-user-${emailForMock}`;
    const accountName = jwtPayload.email ?? emailForMock;

    return { data, userId, accountName };
  }

  static mockSeedlessHandleResult(
    accountName?: string,
  ): HandleOAuthLoginResult {
    return {
      type: OAuthLoginResultType.SUCCESS,
      existingUser: false,
      accountName,
    };
  }

  static parseAuthServiceResponse(raw: unknown): AuthResponse {
    if (raw === null || typeof raw !== 'object') {
      throw new OAuthError(
        'E2E QA mock: invalid response',
        OAuthErrorType.LoginError,
      );
    }
    const root = raw as Record<string, unknown>;
    const dataObj = root.data;
    const tokenBag =
      dataObj !== null &&
      typeof dataObj === 'object' &&
      typeof (dataObj as Record<string, unknown>).tokens === 'object' &&
      (dataObj as Record<string, unknown>).tokens !== null
        ? ((dataObj as Record<string, unknown>).tokens as Record<
            string,
            unknown
          >)
        : root;

    const id_token =
      (typeof tokenBag.jwt_token === 'string'
        ? tokenBag.jwt_token
        : undefined) ??
      (typeof tokenBag.id_token === 'string' ? tokenBag.id_token : undefined);
    const access_token =
      typeof tokenBag.access_token === 'string'
        ? tokenBag.access_token
        : undefined;
    const metadata_access_token =
      typeof tokenBag.metadata_access_token === 'string'
        ? tokenBag.metadata_access_token
        : undefined;
    const refresh_token =
      typeof tokenBag.refresh_token === 'string'
        ? tokenBag.refresh_token
        : undefined;
    const revoke_token =
      typeof tokenBag.revoke_token === 'string'
        ? tokenBag.revoke_token
        : undefined;

    if (!id_token || !access_token || !metadata_access_token) {
      throw new OAuthError(
        'E2E QA mock: missing id/access/metadata tokens',
        OAuthErrorType.LoginError,
      );
    }

    const parsed: AuthResponse = {
      id_token,
      access_token,
      metadata_access_token,
      indexes: Array.isArray(tokenBag.indexes)
        ? (tokenBag.indexes as number[])
        : [],
      endpoints:
        tokenBag.endpoints && typeof tokenBag.endpoints === 'object'
          ? (tokenBag.endpoints as Record<string, string>)
          : {},
    };
    if (refresh_token) {
      parsed.refresh_token = refresh_token;
    }
    if (revoke_token) {
      parsed.revoke_token = revoke_token;
    }
    return parsed;
  }
}
