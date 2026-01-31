import DaimoPayService, {
  DAIMO_WEBVIEW_BASE_URL,
  DaimoPayEvent,
} from './DaimoPayService';
import { CardErrorType } from '../types';
import { getDaimoEnvironment } from '../util/getDaimoEnvironment';

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('DaimoPayService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
  });

  describe('getDaimoEnvironment helper', () => {
    it('returns demo when isDaimoDemo is true', () => {
      expect(getDaimoEnvironment(true)).toBe('demo');
    });

    it('returns production when isDaimoDemo is false', () => {
      expect(getDaimoEnvironment(false)).toBe('production');
    });
  });

  describe('createPayment', () => {
    describe('demo mode (isDaimoDemo: true)', () => {
      it('creates a payment successfully with demo config ($0.25 USD)', async () => {
        const mockPayId = 'test-pay-id-123';
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ id: mockPayId }),
        });

        const result = await DaimoPayService.createPayment({
          isDaimoDemo: true,
        });

        expect(result.payId).toBe(mockPayId);
        expect(mockFetch).toHaveBeenCalledWith(
          'https://pay.daimo.com/api/payment',
          expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({
              'Content-Type': 'application/json',
              'Api-Key': 'pay-demo',
            }),
          }),
        );

        // Verify the request body contains demo config
        const fetchCall = mockFetch.mock.calls[0];
        const requestBody = JSON.parse(fetchCall[1].body);
        expect(requestBody.display.paymentValue).toBe('0.25');
        expect(requestBody.display.currency).toBe('USD');
        expect(requestBody.display.intent).toBe(
          'MetaMask Metal Card Purchase (Test)',
        );
      });

      it('throws CardError on API error', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 500,
          text: () => Promise.resolve('Internal Server Error'),
        });

        await expect(
          DaimoPayService.createPayment({ isDaimoDemo: true }),
        ).rejects.toMatchObject({
          type: CardErrorType.SERVER_ERROR,
        });
      });

      it('throws CardError when response is missing payId', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({}),
        });

        await expect(
          DaimoPayService.createPayment({ isDaimoDemo: true }),
        ).rejects.toMatchObject({
          type: CardErrorType.SERVER_ERROR,
          message: expect.stringContaining('missing payment ID'),
        });
      });

      it('throws CardError on network error', async () => {
        mockFetch.mockRejectedValueOnce(new Error('Network error'));

        await expect(
          DaimoPayService.createPayment({ isDaimoDemo: true }),
        ).rejects.toMatchObject({
          type: CardErrorType.NETWORK_ERROR,
        });
      });
    });

    describe('production mode (isDaimoDemo: false)', () => {
      it('throws error when cardSDK is not provided', async () => {
        await expect(
          DaimoPayService.createPayment({ isDaimoDemo: false }),
        ).rejects.toMatchObject({
          type: CardErrorType.VALIDATION_ERROR,
          message: expect.stringContaining('CardSDK is required'),
        });
      });

      it('uses production mode by default when isDaimoDemo is not specified', async () => {
        await expect(DaimoPayService.createPayment()).rejects.toMatchObject({
          type: CardErrorType.VALIDATION_ERROR,
          message: expect.stringContaining('CardSDK is required'),
        });
      });
    });
  });

  describe('pollPaymentStatus', () => {
    describe('demo mode (isDaimoDemo: true)', () => {
      it('returns pending status in demo mode', async () => {
        const result = await DaimoPayService.pollPaymentStatus('test-pay-id', {
          isDaimoDemo: true,
        });

        expect(result.status).toBe('pending');
      });
    });

    describe('production mode (isDaimoDemo: false)', () => {
      it('throws error when cardSDK is not provided for polling', async () => {
        await expect(
          DaimoPayService.pollPaymentStatus('test-pay-id', {
            isDaimoDemo: false,
          }),
        ).rejects.toMatchObject({
          type: CardErrorType.VALIDATION_ERROR,
          message: expect.stringContaining('CardSDK is required'),
        });
      });

      it('uses production mode by default when isDaimoDemo is not specified', async () => {
        await expect(
          DaimoPayService.pollPaymentStatus('test-pay-id'),
        ).rejects.toMatchObject({
          type: CardErrorType.VALIDATION_ERROR,
          message: expect.stringContaining('CardSDK is required'),
        });
      });
    });
  });

  describe('buildWebViewUrl', () => {
    it('builds URL with default payment options', () => {
      const url = DaimoPayService.buildWebViewUrl('test-pay-id');

      expect(url).toBe(
        `${DAIMO_WEBVIEW_BASE_URL}?payId=test-pay-id&paymentOptions=Metamask`,
      );
    });

    it('builds URL with custom payment options', () => {
      const url = DaimoPayService.buildWebViewUrl('test-pay-id', 'AllWallets');

      expect(url).toBe(
        `${DAIMO_WEBVIEW_BASE_URL}?payId=test-pay-id&paymentOptions=AllWallets`,
      );
    });

    it('encodes special characters in payId', () => {
      const url = DaimoPayService.buildWebViewUrl('pay-id-with spaces&special');

      expect(url).toContain('payId=pay-id-with%20spaces%26special');
    });
  });

  describe('parseWebViewEvent', () => {
    it('parses valid Daimo Pay event', () => {
      const eventData: DaimoPayEvent = {
        source: 'daimo-pay',
        version: 1,
        type: 'paymentCompleted',
        payload: {
          paymentId: 'test-id',
          txHash: '0x123',
          chainId: 59144,
        },
      };

      const result = DaimoPayService.parseWebViewEvent(
        JSON.stringify(eventData),
      );

      expect(result).toEqual(eventData);
    });

    it('returns null for non-Daimo event', () => {
      const result = DaimoPayService.parseWebViewEvent(
        JSON.stringify({ source: 'other', type: 'test' }),
      );

      expect(result).toBeNull();
    });

    it('returns null for invalid JSON', () => {
      const result = DaimoPayService.parseWebViewEvent('invalid json');

      expect(result).toBeNull();
    });

    it('returns null for empty string', () => {
      const result = DaimoPayService.parseWebViewEvent('');

      expect(result).toBeNull();
    });
  });

  describe('shouldLoadInWebView', () => {
    it('returns true for Daimo miniapp URLs', () => {
      const result = DaimoPayService.shouldLoadInWebView(
        'https://miniapp.daimo.com/metamask/embed?payId=123',
      );

      expect(result).toBe(true);
    });

    it('returns true for other Daimo miniapp paths', () => {
      const result = DaimoPayService.shouldLoadInWebView(
        'https://miniapp.daimo.com/other/path',
      );

      expect(result).toBe(true);
    });

    it('returns false for external wallet URLs', () => {
      const result = DaimoPayService.shouldLoadInWebView(
        'https://metamask.io/download',
      );

      expect(result).toBe(false);
    });

    it('returns false for deep link URLs', () => {
      const result = DaimoPayService.shouldLoadInWebView('metamask://connect');

      expect(result).toBe(false);
    });
  });
});
