import { BaanxService, CardApiError } from '../services/BaanxService';
import { CardProviderErrorCode, type CardAuthSession } from '../provider-types';
import { BaanxProvider } from './BaanxProvider';

const session = (): CardAuthSession => ({
  id: 'initiate-token',
  currentStep: { type: 'email_password' },
  _metadata: {
    initiateToken: 'initiate-token',
    location: 'international',
    state: 'oauth-state',
    codeVerifier: 'verifier',
  },
});

const createProvider = () => {
  const post = jest.fn();
  const request = jest.fn();
  const provider = new BaanxProvider({
    service: {
      post,
      request,
      apiKey: 'test-api-key',
      setLocation: jest.fn(),
    } as unknown as BaanxService,
  });
  return { provider, post, request };
};

const mockTokenExchange = (request: jest.Mock) => {
  request
    .mockResolvedValueOnce({
      state: 'oauth-state',
      url: 'https://example.com',
      code: 'auth-code',
    })
    .mockResolvedValueOnce({
      access_token: 'session-access',
      token_type: 'bearer',
      expires_in: 3600,
      refresh_token: 'session-refresh',
      refresh_token_expires_in: 7200,
    });
};

describe('BaanxProvider auth', () => {
  it('keeps password login on /v1/auth/login and exchanges the session', async () => {
    const { provider, post, request } = createProvider();
    post.mockResolvedValue({
      accessToken: 'login-access',
      userId: 'user-1',
      isOtpRequired: false,
      phase: null,
      phoneNumber: null,
      verificationState: 'VERIFIED',
      isLinked: true,
    });
    mockTokenExchange(request);

    const result = await provider.submitCredentials(session(), {
      type: 'email_password',
      email: 'user@example.com',
      password: 'secret',
    });

    expect(post).toHaveBeenCalledWith('/v1/auth/login', {
      email: 'user@example.com',
      password: 'secret',
    });
    expect(request).toHaveBeenCalledWith(
      '/v1/auth/oauth/authorize',
      expect.objectContaining({
        headers: { Authorization: 'Bearer login-access' },
      }),
    );
    expect(result.done).toBe(true);
    expect(result.tokenSet?.accessToken).toBe('session-access');
  });

  it('requests an email login code', async () => {
    const { provider, post } = createProvider();
    post.mockResolvedValue({ success: true });

    await provider.requestEmailLoginCode('user@example.com');

    expect(post).toHaveBeenCalledWith('/v1/auth/login/email-code/request', {
      email: 'user@example.com',
    });
  });

  it('maps a failed email code request', async () => {
    const { provider, post } = createProvider();
    post.mockRejectedValue(
      new CardApiError(500, '/v1/auth/login/email-code/request', 'down'),
    );

    await expect(
      provider.requestEmailLoginCode('user@example.com'),
    ).rejects.toMatchObject({ code: CardProviderErrorCode.ServerError });
  });

  it('exchanges an email-code access token for a card session', async () => {
    const { provider, post, request } = createProvider();
    post.mockResolvedValue({
      accessToken: 'login-access',
      userId: 'user-1',
      isOtpRequired: false,
      phase: null,
      phoneNumber: null,
      verificationState: 'VERIFIED',
      isLinked: true,
    });
    mockTokenExchange(request);

    const result = await provider.submitCredentials(session(), {
      type: 'email_code',
      email: 'user@example.com',
      code: '123456',
    });

    expect(post).toHaveBeenCalledWith('/v1/auth/login/email-code', {
      email: 'user@example.com',
      code: '123456',
    });
    expect(result.done).toBe(true);
    expect(result.tokenSet?.refreshToken).toBe('session-refresh');
  });

  it('returns an SMS challenge and sends the code on the step action', async () => {
    const { provider, post } = createProvider();
    const authSession = session();
    post.mockResolvedValue({
      isOtpRequired: true,
      otpMode: 'SMS',
      userId: 'user-1',
      phoneNumber: '+445*****225',
      phase: null,
      accessToken: null,
      verificationState: 'VERIFIED',
      isLinked: false,
    });

    const result = await provider.submitCredentials(authSession, {
      type: 'email_code',
      email: 'user@example.com',
      code: '123456',
    });

    expect(result).toStrictEqual({
      done: false,
      nextStep: {
        type: 'otp',
        destination: '+445*****225',
        mode: 'SMS',
      },
    });

    post.mockResolvedValue({ success: true });
    await provider.executeStepAction(authSession);

    expect(post).toHaveBeenLastCalledWith('/v1/auth/login/otp', {
      userId: 'user-1',
    });
  });

  it('replays the email code with the second factor', async () => {
    const { provider, post, request } = createProvider();
    post.mockResolvedValue({
      accessToken: 'login-access',
      userId: 'user-1',
      isOtpRequired: false,
      phase: null,
      phoneNumber: null,
      verificationState: 'VERIFIED',
      isLinked: true,
    });
    mockTokenExchange(request);

    await provider.submitCredentials(session(), {
      type: 'email_code',
      email: 'user@example.com',
      code: '123456',
      otpCode: '319044',
    });

    expect(post).toHaveBeenCalledWith('/v1/auth/login/email-code', {
      email: 'user@example.com',
      code: '123456',
      otpCode: '319044',
    });
  });

  it('does not send an SMS code for a TOTP challenge', async () => {
    const { provider, post } = createProvider();
    const authSession = session();
    post.mockResolvedValue({
      isOtpRequired: true,
      otpMode: 'TOTP',
      userId: 'user-1',
      phoneNumber: '+502*******8',
      phase: null,
      accessToken: null,
      verificationState: 'VERIFIED',
      isLinked: false,
    });

    const result = await provider.submitCredentials(authSession, {
      type: 'email_code',
      email: 'user@example.com',
      code: '123456',
    });
    post.mockClear();
    await provider.executeStepAction(authSession);

    expect(result.nextStep).toStrictEqual({
      type: 'otp',
      destination: '+502*******8',
      mode: 'TOTP',
    });
    expect(post).not.toHaveBeenCalled();
  });

  it('returns unfinished onboarding without exchanging a token', async () => {
    const { provider, post, request } = createProvider();
    post.mockResolvedValue({
      userId: 'user-1',
      phase: 'PERSONAL_INFORMATION',
      isOtpRequired: false,
      phoneNumber: null,
      accessToken: null,
      verificationState: 'UNVERIFIED',
      isLinked: false,
    });

    const result = await provider.submitCredentials(session(), {
      type: 'email_code',
      email: 'user@example.com',
      code: '123456',
    });

    expect(result.onboardingRequired).toStrictEqual({
      sessionId: 'user-1',
      phase: 'PERSONAL_INFORMATION',
    });
    expect(request).not.toHaveBeenCalled();
  });

  it('sends SMS for a password challenge that has no otp mode', async () => {
    const { provider, post } = createProvider();
    const authSession = session();
    post.mockResolvedValueOnce({
      isOtpRequired: true,
      userId: 'user-1',
      phoneNumber: '+1555****90',
      phase: null,
      accessToken: '',
      verificationState: 'VERIFIED',
      isLinked: false,
    });

    await provider.submitCredentials(authSession, {
      type: 'email_password',
      email: 'user@example.com',
      password: 'secret',
    });
    post.mockResolvedValueOnce({ success: true });
    await provider.executeStepAction(authSession);

    expect(post).toHaveBeenLastCalledWith('/v1/auth/login/otp', {
      userId: 'user-1',
    });
  });

  it('maps a rejected email code to invalid credentials', async () => {
    const { provider, post } = createProvider();
    post.mockRejectedValue(
      new CardApiError(404, '/v1/auth/login/email-code', 'not found'),
    );

    await expect(
      provider.submitCredentials(session(), {
        type: 'email_code',
        email: 'user@example.com',
        code: '123456',
      }),
    ).rejects.toMatchObject({ code: CardProviderErrorCode.InvalidCredentials });
  });
});
