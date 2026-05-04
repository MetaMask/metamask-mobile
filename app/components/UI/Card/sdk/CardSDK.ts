import {
  CardFeatureFlag,
  SupportedToken,
} from '../../../../selectors/featureFlagController/card';
import { SUPPORTED_ASSET_NETWORKS } from '../constants';
import Logger from '../../../../util/Logger';
import {
  EmailVerificationSendRequest,
  EmailVerificationSendResponse,
  EmailVerificationVerifyRequest,
  EmailVerificationVerifyResponse,
  PhoneVerificationSendRequest,
  PhoneVerificationSendResponse,
  PhoneVerificationVerifyRequest,
  RegisterPersonalDetailsRequest,
  RegisterUserResponse,
  RegisterPhysicalAddressRequest,
  RegisterAddressResponse,
  RegistrationSettingsResponse,
  StartUserVerificationResponse,
  CreateOnboardingConsentRequest,
  CreateOnboardingConsentResponse,
  LinkUserToConsentRequest,
  LinkUserToConsentResponse,
  UserResponse,
  StartUserVerificationRequest,
  CardError,
  CardErrorType,
  CardLocation,
  CardNetwork,
  DelegationSettingsResponse,
  GetOnboardingConsentResponse,
  CreateOrderRequest,
  CreateOrderResponse,
  GetOrderStatusResponse,
} from '../types';
import { getDefaultBaanxApiBaseUrlForMetaMaskEnv } from '../util/mapBaanxApiUrl';
import { getCardBaanxToken } from '../util/cardTokenVault';
import { CaipChainId } from '@metamask/utils';

// Default timeout for all API requests (10 seconds)
const DEFAULT_REQUEST_TIMEOUT_MS = 10000;

// The CardSDK class provides HTTP helpers for Card onboarding and related flows
// used by hooks under the CardSDKProvider. Authenticated card operations (freeze,
// cashback, provisioning, etc.) are handled by CardController / BaanxProvider.
export class CardSDK {
  private cardFeatureFlag: CardFeatureFlag;
  private enableLogs: boolean;
  private cardBaanxApiBaseUrl: string;
  private cardBaanxApiKey: string | undefined;
  private userCardLocation: CardLocation;

  constructor({
    cardFeatureFlag,
    userCardLocation,
    enableLogs = false,
  }: {
    cardFeatureFlag: CardFeatureFlag;
    userCardLocation?: CardLocation | null;
    enableLogs?: boolean;
  }) {
    this.cardFeatureFlag = cardFeatureFlag;
    this.enableLogs = enableLogs;
    this.cardBaanxApiBaseUrl = this.getBaanxApiBaseUrl();
    this.cardBaanxApiKey = process.env.MM_CARD_BAANX_API_CLIENT_KEY;
    this.userCardLocation = userCardLocation ?? 'international';
  }

  getSupportedTokensByChainId(
    caipChainId: CaipChainId = 'eip155:59144',
  ): SupportedToken[] {
    const tokens = this.cardFeatureFlag.chains?.[caipChainId]?.tokens;

    if (!tokens) {
      return [];
    }

    return tokens.filter(
      (token): token is SupportedToken =>
        token && typeof token.address === 'string' && token.enabled !== false,
    );
  }

  private logDebugInfo(fnName: string, data: unknown) {
    if (this.enableLogs) {
      Logger.log(
        `CardSDK Debug Log - ${fnName}`,
        JSON.stringify(data, null, 2),
      );
    }
  }

  /**
   * Determines the Sentry context name based on the operation type.
   */
  private getContextName(operation: string): string {
    const lowerOp = operation.toLowerCase();
    if (
      lowerOp.includes('delegation') ||
      lowerOp.includes('allowance') ||
      lowerOp.includes('walletpriority')
    ) {
      return 'card_delegation';
    }
    if (
      lowerOp.includes('verification') ||
      lowerOp.includes('register') ||
      lowerOp.includes('consent') ||
      lowerOp.includes('onboarding')
    ) {
      return 'card_onboarding';
    }
    if (
      lowerOp.includes('login') ||
      lowerOp.includes('auth') ||
      lowerOp.includes('token') ||
      lowerOp.includes('authorize')
    ) {
      return 'card_auth';
    }
    if (lowerOp.includes('cashback')) {
      return 'card_cashback';
    }
    return 'card_api_request';
  }

  private logAndCreateError(
    type: CardErrorType,
    message: string,
    operation: string,
    endpoint: string,
    httpStatus?: number,
    extras?: Record<string, unknown>,
  ): CardError {
    const error = new CardError(type, message);

    Logger.error(error, {
      tags: {
        feature: 'card',
        operation,
        errorType: type.toLowerCase(),
      },
      context: {
        name: this.getContextName(operation),
        data: {
          endpoint,
          ...(httpStatus !== undefined && { httpStatus }),
          ...extras,
        },
      },
    });

    return error;
  }

  private async parseResponseBody(
    response: Response,
  ): Promise<Record<string, unknown> | null> {
    try {
      return await response.json();
    } catch {
      return null;
    }
  }

  private async handleApiResponse<T>(
    response: Response,
    operation: string,
    endpoint: string,
    defaultErrorMessage: string,
  ): Promise<T> {
    if (response.ok) {
      return response.json() as Promise<T>;
    }

    const responseBody = await this.parseResponseBody(response);
    const message =
      (responseBody?.message as string) ||
      `${defaultErrorMessage}: ${response.status} ${response.statusText}`;

    let errorType: CardErrorType;
    if (response.status === 401 || response.status === 403) {
      errorType = CardErrorType.INVALID_CREDENTIALS;
    } else if (response.status >= 400 && response.status < 500) {
      errorType = CardErrorType.CONFLICT_ERROR;
    } else {
      errorType = CardErrorType.SERVER_ERROR;
    }

    throw this.logAndCreateError(
      errorType,
      message,
      operation,
      endpoint,
      response.status,
    );
  }

  private async withErrorHandling<T>(
    operation: string,
    endpoint: string,
    defaultErrorMessage: string,
    fn: () => Promise<T>,
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (error instanceof CardError) {
        throw error;
      }

      throw this.logAndCreateError(
        CardErrorType.UNKNOWN_ERROR,
        defaultErrorMessage,
        operation,
        endpoint,
        undefined,
        { originalError: (error as Error).message },
      );
    }
  }

  private getBaanxApiBaseUrl() {
    if (process.env.BAANX_API_URL) return process.env.BAANX_API_URL;
    return getDefaultBaanxApiBaseUrlForMetaMaskEnv(
      process.env.METAMASK_ENVIRONMENT,
    );
  }

  private async makeRequest(
    endpoint: string,
    {
      fetchOptions = {},
      authenticated = false,
      location = this.userCardLocation,
      timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS,
    }: {
      fetchOptions?: RequestInit & { query?: string };
      authenticated?: boolean;
      location?: CardLocation;
      timeoutMs?: number;
    } = {},
  ): Promise<Response> {
    const apiKey = this.cardBaanxApiKey;

    if (!apiKey) {
      throw new CardError(
        CardErrorType.API_KEY_MISSING,
        'Card API key is not configured',
      );
    }

    const isUSEnv = location === 'us';
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'x-us-env': String(isUSEnv),
      'x-client-key': apiKey,
    };

    try {
      if (authenticated) {
        const tokenResult = await getCardBaanxToken();
        if (tokenResult.success && tokenResult.tokenData?.accessToken) {
          headers.Authorization = `Bearer ${tokenResult.tokenData.accessToken}`;
        }
      }
    } catch (error) {
      Logger.error(error as Error, {
        tags: { feature: 'card', operation: 'makeRequest' },
        context: {
          name: 'card_auth',
          data: { action: 'retrieveBearerToken' },
        },
      });
    }

    const url = `${this.cardBaanxApiBaseUrl}${endpoint}${
      fetchOptions.query ? `?${fetchOptions.query}` : ''
    }`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, timeoutMs);

    try {
      const response = await fetch(url, {
        credentials: 'omit',
        ...fetchOptions,
        headers: {
          ...headers,
          ...fetchOptions.headers,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        throw new CardError(
          CardErrorType.TIMEOUT_ERROR,
          'Request timed out. Please check your connection.',
          error,
        );
      }

      if (error instanceof Error) {
        throw new CardError(
          CardErrorType.NETWORK_ERROR,
          'Network error. Please check your connection.',
          error,
        );
      }

      throw new CardError(
        CardErrorType.UNKNOWN_ERROR,
        'An unexpected error occurred.',
        error instanceof Error ? error : undefined,
      );
    }
  }

  getUserDetails = async (): Promise<UserResponse> => {
    const response = await this.makeRequest('/v1/user', {
      fetchOptions: { method: 'GET' },
      authenticated: true,
    });

    return this.handleApiResponse<UserResponse>(
      response,
      'getUserDetails',
      'user',
      'Failed to get user details',
    );
  };

  /**
   * Get delegation settings for a specific network (optional)
   * This fetches chain IDs, token contract addresses, and delegation contract addresses.
   * This needs to be cached at hook level to avoid unnecessary API calls.
   */
  getDelegationSettings = async (
    network?: CardNetwork,
  ): Promise<DelegationSettingsResponse> =>
    this.withErrorHandling(
      'getDelegationSettings',
      'delegation/chain/config',
      'Failed to get delegation settings. Please try again.',
      async () => {
        const queryParams = network ? `?network=${network}` : '';
        const response = await this.makeRequest(
          `/v1/delegation/chain/config${queryParams}`,
          {
            fetchOptions: { method: 'GET' },
            authenticated: true,
          },
        );

        if (!response.ok) {
          throw this.logAndCreateError(
            CardErrorType.SERVER_ERROR,
            'Failed to get delegation settings. Please try again.',
            'getDelegationSettings',
            'delegation/chain/config',
            response.status,
            { network },
          );
        }

        const responseData = await response.json();
        this.logDebugInfo('getDelegationSettings', {
          source: 'api',
          network,
          responseData,
        });

        this.validateDelegationSettings(responseData);

        return responseData;
      },
    );

  private validateDelegationSettings = (
    responseData: DelegationSettingsResponse,
  ): void => {
    if (!responseData.networks || !Array.isArray(responseData.networks)) {
      throw new CardError(
        CardErrorType.VALIDATION_ERROR,
        'Invalid delegation settings: networks array is missing or invalid',
      );
    }

    for (const network of responseData.networks) {
      if (!SUPPORTED_ASSET_NETWORKS.includes(network.network as CardNetwork)) {
        continue;
      }

      if (!network.chainId || !network.delegationContract) {
        throw new CardError(
          CardErrorType.VALIDATION_ERROR,
          `Invalid delegation settings for ${network.network}: missing chainId or delegationContract`,
        );
      }

      if (!network.tokens) {
        throw new CardError(
          CardErrorType.VALIDATION_ERROR,
          `Invalid delegation settings for ${network.network}: tokens object is missing`,
        );
      }

      for (const [tokenSymbol, token] of Object.entries(network.tokens)) {
        if (
          !token?.address ||
          !token.symbol ||
          typeof token.decimals !== 'number'
        ) {
          throw new CardError(
            CardErrorType.VALIDATION_ERROR,
            `Invalid delegation settings for ${network.network}: ${tokenSymbol} token is missing or invalid`,
          );
        }
      }
    }
  };

  emailVerificationSend = async (
    request: EmailVerificationSendRequest,
  ): Promise<EmailVerificationSendResponse> => {
    this.logDebugInfo('emailVerificationSend', { email: request.email });

    return this.withErrorHandling(
      'emailVerificationSend',
      'auth/register/email/send',
      'Failed to send email verification',
      async () => {
        const response = await this.makeRequest(
          '/v1/auth/register/email/send',
          {
            fetchOptions: {
              method: 'POST',
              body: JSON.stringify(request),
            },
            authenticated: false,
          },
        );

        return this.handleApiResponse<EmailVerificationSendResponse>(
          response,
          'emailVerificationSend',
          'auth/register/email/send',
          'Email verification send failed',
        );
      },
    );
  };

  emailVerificationVerify = async (
    request: EmailVerificationVerifyRequest,
  ): Promise<EmailVerificationVerifyResponse> => {
    this.logDebugInfo('emailVerificationVerify', {
      email: request.email,
      contactVerificationId: request.contactVerificationId,
      countryOfResidence: request.countryOfResidence,
      userExternalId: request.userExternalId,
    });

    return this.withErrorHandling(
      'emailVerificationVerify',
      'auth/register/email/verify',
      'Failed to verify email verification',
      async () => {
        const response = await this.makeRequest(
          '/v1/auth/register/email/verify',
          {
            fetchOptions: {
              method: 'POST',
              body: JSON.stringify(request),
            },
            authenticated: false,
          },
        );

        return this.handleApiResponse<EmailVerificationVerifyResponse>(
          response,
          'emailVerificationVerify',
          'auth/register/email/verify',
          'Email verification verify failed',
        );
      },
    );
  };

  phoneVerificationSend = async (
    request: PhoneVerificationSendRequest,
  ): Promise<PhoneVerificationSendResponse> => {
    this.logDebugInfo('phoneVerificationSend', {
      phoneNumber: request.phoneNumber,
    });

    return this.withErrorHandling(
      'phoneVerificationSend',
      'auth/register/phone/send',
      'Failed to send phone verification',
      async () => {
        const response = await this.makeRequest(
          '/v1/auth/register/phone/send',
          {
            fetchOptions: {
              method: 'POST',
              body: JSON.stringify(request),
            },
            authenticated: false,
          },
        );

        return this.handleApiResponse<PhoneVerificationSendResponse>(
          response,
          'phoneVerificationSend',
          'auth/register/phone/send',
          'Phone verification send failed',
        );
      },
    );
  };

  phoneVerificationVerify = async (
    request: PhoneVerificationVerifyRequest,
  ): Promise<RegisterUserResponse> => {
    this.logDebugInfo('phoneVerificationVerify', {
      phoneNumber: request.phoneNumber,
    });

    return this.withErrorHandling(
      'phoneVerificationVerify',
      'auth/register/phone/verify',
      'Failed to verify phone verification',
      async () => {
        const response = await this.makeRequest(
          '/v1/auth/register/phone/verify',
          {
            fetchOptions: {
              method: 'POST',
              body: JSON.stringify(request),
            },
            authenticated: false,
          },
        );

        return this.handleApiResponse<RegisterUserResponse>(
          response,
          'phoneVerificationVerify',
          'auth/register/phone/verify',
          'Phone verification verify failed',
        );
      },
    );
  };

  startUserVerification = async (
    request: StartUserVerificationRequest,
  ): Promise<StartUserVerificationResponse> => {
    this.logDebugInfo('startUserVerification', request);

    return this.withErrorHandling(
      'startUserVerification',
      'auth/register/verification',
      'Failed to start user verification',
      async () => {
        const response = await this.makeRequest(
          '/v1/auth/register/verification',
          {
            fetchOptions: {
              method: 'POST',
              body: JSON.stringify(request),
            },
            authenticated: false,
          },
        );

        return this.handleApiResponse<StartUserVerificationResponse>(
          response,
          'startUserVerification',
          'auth/register/verification',
          'Failed to start user verification',
        );
      },
    );
  };

  registerPersonalDetails = async (
    request: RegisterPersonalDetailsRequest,
  ): Promise<RegisterUserResponse> => {
    this.logDebugInfo('registerPersonalDetails', {
      onboardingId: request.onboardingId,
    });

    return this.withErrorHandling(
      'registerPersonalDetails',
      'auth/register/personal-details',
      'Failed to register personal details',
      async () => {
        const response = await this.makeRequest(
          '/v1/auth/register/personal-details',
          {
            fetchOptions: {
              method: 'POST',
              body: JSON.stringify(request),
            },
            authenticated: false,
          },
        );

        return this.handleApiResponse<RegisterUserResponse>(
          response,
          'registerPersonalDetails',
          'auth/register/personal-details',
          'Personal details registration failed',
        );
      },
    );
  };

  registerPhysicalAddress = async (
    request: RegisterPhysicalAddressRequest,
  ): Promise<RegisterAddressResponse> => {
    this.logDebugInfo('registerPhysicalAddress', {
      onboardingId: request.onboardingId,
    });

    return this.withErrorHandling(
      'registerPhysicalAddress',
      'auth/register/address',
      'Failed to register address',
      async () => {
        const response = await this.makeRequest('/v1/auth/register/address', {
          fetchOptions: {
            method: 'POST',
            body: JSON.stringify(request),
          },
          authenticated: false,
        });

        return this.handleApiResponse<RegisterAddressResponse>(
          response,
          'registerPhysicalAddress',
          'auth/register/address',
          'Address registration failed',
        );
      },
    );
  };

  getRegistrationSettings = async (): Promise<RegistrationSettingsResponse> =>
    this.withErrorHandling(
      'getRegistrationSettings',
      'auth/settings',
      'Failed to get registration settings',
      async () => {
        const response = await this.makeRequest('/v1/auth/settings', {
          fetchOptions: { method: 'GET' },
          authenticated: false,
        });

        const data = await this.handleApiResponse<RegistrationSettingsResponse>(
          response,
          'getRegistrationSettings',
          'auth/settings',
          'Failed to get registration settings',
        );

        this.logDebugInfo('getRegistrationSettings response', data);
        return data;
      },
    );

  getRegistrationStatus = async (
    onboardingId: string,
    location?: CardLocation,
  ): Promise<UserResponse> =>
    this.withErrorHandling(
      'getRegistrationStatus',
      'auth/register',
      'Failed to get registration status',
      async () => {
        const response = await this.makeRequest(
          `/v1/auth/register?onboardingId=${onboardingId}`,
          {
            fetchOptions: { method: 'GET' },
            authenticated: false,
            ...(location && { location }),
          },
        );

        const data = await this.handleApiResponse<UserResponse>(
          response,
          'getRegistrationStatus',
          'auth/register',
          'Failed to get registration status',
        );

        this.logDebugInfo('getRegistrationStatus response', data);
        return data;
      },
    );

  getConsentSetByOnboardingId = async (
    onboardingId: string,
  ): Promise<GetOnboardingConsentResponse | null> =>
    this.withErrorHandling(
      'getConsentSetByOnboardingId',
      'consent/onboarding',
      'Failed to get consent set by onboarding id',
      async () => {
        const response = await this.makeRequest(
          `/v2/consent/onboarding/${onboardingId}`,
          {
            fetchOptions: { method: 'GET' },
            authenticated: false,
          },
        );

        if (response.status === 404) {
          return null;
        }

        if (!response.ok) {
          throw this.logAndCreateError(
            response.status >= 500
              ? CardErrorType.SERVER_ERROR
              : CardErrorType.CONFLICT_ERROR,
            'Failed to get consent set by onboarding id',
            'getConsentSetByOnboardingId',
            'consent/onboarding',
            response.status,
          );
        }

        const data = await response.json();
        this.logDebugInfo('getConsentSetByOnboardingId response', data);
        return data;
      },
    );

  createOnboardingConsent = async (
    request: Omit<CreateOnboardingConsentRequest, 'tenantId'>,
  ): Promise<CreateOnboardingConsentResponse> => {
    this.logDebugInfo('createOnboardingConsent', { request });
    const requestBody = {
      ...request,
      tenantId: this.cardBaanxApiKey || 'tenant_baanx_global',
    } as CreateOnboardingConsentRequest;

    return this.withErrorHandling(
      'createOnboardingConsent',
      'consent/onboarding',
      'Failed to create onboarding consent',
      async () => {
        const response = await this.makeRequest('/v2/consent/onboarding', {
          fetchOptions: {
            method: 'POST',
            body: JSON.stringify(requestBody),
            headers: {
              'x-secret-key': this.cardBaanxApiKey || '',
            },
          },
          authenticated: false,
        });

        const data =
          await this.handleApiResponse<CreateOnboardingConsentResponse>(
            response,
            'createOnboardingConsent',
            'consent/onboarding',
            'Failed to create onboarding consent',
          );

        this.logDebugInfo('createOnboardingConsent response', data);
        return data;
      },
    );
  };

  linkUserToConsent = async (
    consentSetId: string,
    request: LinkUserToConsentRequest,
  ): Promise<LinkUserToConsentResponse> => {
    this.logDebugInfo('linkUserToConsent', {
      consentSetId,
      request,
    });

    return this.withErrorHandling(
      'linkUserToConsent',
      'consent/onboarding',
      'Failed to link user to consent',
      async () => {
        const response = await this.makeRequest(
          `/v2/consent/onboarding/${consentSetId}`,
          {
            fetchOptions: {
              method: 'PATCH',
              body: JSON.stringify(request),
              headers: {
                'x-secret-key': this.cardBaanxApiKey || '',
              },
            },
            authenticated: false,
          },
        );

        const data = await this.handleApiResponse<LinkUserToConsentResponse>(
          response,
          'linkUserToConsent',
          'consent/onboarding',
          'Failed to link user to consent',
        );

        this.logDebugInfo('linkUserToConsent response', data);
        return data;
      },
    );
  };

  /**
   * Creates a new order for a product (e.g., premium account upgrade, metal card)
   * POST /v1/order
   */
  createOrder = async (): Promise<CreateOrderResponse> => {
    const request: CreateOrderRequest = {
      productId: 'PREMIUM_SUBSCRIPTION',
      paymentMethod: 'CRYPTO_EXTERNAL_DAIMO',
    };
    this.logDebugInfo('createOrder', request);

    return this.withErrorHandling(
      'createOrder',
      'order',
      'Failed to create order',
      async () => {
        const response = await this.makeRequest('/v1/order', {
          fetchOptions: {
            method: 'POST',
            body: JSON.stringify(request),
          },
          authenticated: true,
        });

        const data = await this.handleApiResponse<CreateOrderResponse>(
          response,
          'createOrder',
          'order',
          'Failed to create order',
        );

        this.logDebugInfo('createOrder response', data);
        return data;
      },
    );
  };

  /**
   * Fetches the status of an order by ID
   * GET /v1/order/:orderId
   */
  getOrderStatus = async (orderId: string): Promise<GetOrderStatusResponse> => {
    this.logDebugInfo('getOrderStatus', { orderId });

    return this.withErrorHandling(
      'getOrderStatus',
      `order/${orderId}`,
      'Failed to get order status',
      async () => {
        const response = await this.makeRequest(`/v1/order/${orderId}`, {
          fetchOptions: {
            method: 'GET',
          },
          authenticated: true,
        });

        if (response.status === 404) {
          throw new CardError(
            CardErrorType.NOT_FOUND,
            `Order not found: ${orderId}`,
          );
        }

        const data = await this.handleApiResponse<GetOrderStatusResponse>(
          response,
          'getOrderStatus',
          `order/${orderId}`,
          'Failed to get order status',
        );

        this.logDebugInfo('getOrderStatus response', data);
        return data;
      },
    );
  };
}
