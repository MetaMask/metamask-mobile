import { createKalshiAccountLinkAdapter } from './kalshiAccountLinkAdapter';

const mockCreateIntent = jest.fn();
const mockSubmitEmail = jest.fn();
const mockVerifyCode = jest.fn();
const mockConstructor = jest.fn();

jest.mock('../../PredictNext/adapters/remote/KalshiOnboardingClient', () => ({
  KalshiOnboardingClient: jest.fn().mockImplementation((options) => {
    mockConstructor(options);
    return {
      createIntent: mockCreateIntent,
      submitEmail: mockSubmitEmail,
      verifyCode: mockVerifyCode,
    };
  }),
}));

jest.mock('uuid', () => {
  let count = 0;
  return { v4: () => `key-${(count += 1)}` };
});

const mockCall = jest.fn();
const mockGetBearerToken = jest.fn();
jest.mock('../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      AuthenticationController: {
        getBearerToken: (...args: unknown[]) => mockGetBearerToken(...args),
      },
    },
    controllerMessenger: { call: (...args: unknown[]) => mockCall(...args) },
  },
}));

describe('createKalshiAccountLinkAdapter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateIntent.mockResolvedValue({ intentStatus: 'CREATED' });
    mockSubmitEmail.mockResolvedValue(undefined);
    mockVerifyCode.mockResolvedValue({ verified: true });
  });

  describe('startLink', () => {
    it('creates an enrollment intent, then sends the trimmed email', async () => {
      const adapter = createKalshiAccountLinkAdapter();

      await adapter.startLink({ email: '  a@b.co ' });

      expect(mockCreateIntent).toHaveBeenCalledWith(expect.any(String));
      expect(mockSubmitEmail).toHaveBeenCalledWith(
        'a@b.co',
        expect.any(String),
      );
      expect(mockCreateIntent.mock.invocationCallOrder[0]).toBeLessThan(
        mockSubmitEmail.mock.invocationCallOrder[0],
      );
    });

    it('uses a new idempotency key for each call', async () => {
      const adapter = createKalshiAccountLinkAdapter();

      await adapter.startLink({ email: 'a@b.co' });

      expect(mockCreateIntent.mock.calls[0][0]).not.toBe(
        mockSubmitEmail.mock.calls[0][1],
      );
    });

    it('does not send the email when the intent fails', async () => {
      mockCreateIntent.mockRejectedValue(new Error('refused'));
      const adapter = createKalshiAccountLinkAdapter();

      await expect(adapter.startLink({ email: 'a@b.co' })).rejects.toThrow(
        'refused',
      );
      expect(mockSubmitEmail).not.toHaveBeenCalled();
    });
  });

  describe('verifyLink', () => {
    it('verifies the trimmed code', async () => {
      const adapter = createKalshiAccountLinkAdapter();

      const result = await adapter.verifyLink({ code: ' 888888 ' });

      expect(mockVerifyCode).toHaveBeenCalledWith('888888', expect.any(String));
      expect(result).toStrictEqual({});
    });

    it('passes on the step kyc-api returns with a verified code', async () => {
      mockVerifyCode.mockResolvedValue({
        verified: true,
        nextStep: 'confirm_identity',
      });
      const adapter = createKalshiAccountLinkAdapter();

      const result = await adapter.verifyLink({ code: '888888' });

      expect(result).toStrictEqual({ nextStep: 'confirm_identity' });
    });

    it('turns a step this app does not know into error', async () => {
      mockVerifyCode.mockResolvedValue({
        verified: true,
        nextStep: 'brand_new_step',
      });
      const adapter = createKalshiAccountLinkAdapter();

      const result = await adapter.verifyLink({ code: '888888' });

      expect(result).toStrictEqual({ nextStep: 'error' });
    });

    it('passes on the MFA method Kalshi asks for', async () => {
      mockVerifyCode.mockResolvedValue({
        verified: false,
        mfa: { method: 'sms', phoneLast4: '1234' },
      });
      const adapter = createKalshiAccountLinkAdapter();

      const result = await adapter.verifyLink({ code: '888888' });

      expect(result).toStrictEqual({ mfaMethod: 'sms' });
    });
  });

  describe('client', () => {
    it('is not built until the first call', () => {
      createKalshiAccountLinkAdapter();

      expect(mockConstructor).not.toHaveBeenCalled();
    });

    it('is built once, for kyc-api, and reused', async () => {
      const adapter = createKalshiAccountLinkAdapter();

      await adapter.startLink({ email: 'a@b.co' });
      await adapter.verifyLink({ code: '888888' });

      expect(mockConstructor).toHaveBeenCalledTimes(1);
      expect(mockConstructor).toHaveBeenCalledWith(
        expect.objectContaining({
          segments: ['vendors', 'kalshi', 'enrollment'],
          baseUrl: expect.stringContaining('kyc-api'),
        }),
      );
    });

    it('signs with the wallet bearer token and the Predict A2T', async () => {
      mockGetBearerToken.mockResolvedValue('bearer-1');
      mockCall.mockResolvedValue('a2t-1');
      const adapter = createKalshiAccountLinkAdapter();
      await adapter.startLink({ email: 'a@b.co' });
      const options = mockConstructor.mock.calls[0][0];

      expect(await options.getBearerToken()).toBe('bearer-1');
      expect(await options.getA2t()).toBe('a2t-1');
      expect(mockCall).toHaveBeenCalledWith('PredictDeviceAuthService:getA2t');
      options.invalidateA2t();
      expect(mockCall).toHaveBeenCalledWith('PredictDeviceAuthService:clear');
    });
  });
});
