import { addBreadcrumb } from '@sentry/react-native';

import Logger from '../../util/Logger';
import {
  QR_SYNC_SENTRY_FEATURE,
  QrSyncOperations,
  QrSyncSurfaces,
  QrSyncTelemetrySources,
  addQrSyncPhaseBreadcrumb,
  buildQrSyncLoggerErrorOptions,
  reportQrSyncFailure,
  scrubSensitiveQrSyncData,
} from './qrSyncTelemetry';

jest.mock('@sentry/react-native', () => ({
  addBreadcrumb: jest.fn(),
}));

jest.mock('../../util/Logger', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
    log: jest.fn(),
  },
}));

const TEST_MNEMONIC =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
const TEST_ADDRESS = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0';
const TEST_OTP = '123456';
const TEST_MWP_DEEPLINK =
  'metamask://connect/mwp?p=eyJzZXNzaW9uUmVxdWVzdCI6eyJpZCI6InRlc3QifX0';

describe('qrSyncTelemetry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('scrubSensitiveQrSyncData', () => {
    it('redacts sensitive object keys', () => {
      const scrubbed = scrubSensitiveQrSyncData({
        otp: TEST_OTP,
        mnemonic: TEST_MNEMONIC,
        privateKey: '0xabc',
        pendingSecretImports: [{ value: TEST_MNEMONIC }],
        phase: 'displaying-otp',
      }) as Record<string, unknown>;

      expect(scrubbed.otp).toBe('[REDACTED]');
      expect(scrubbed.mnemonic).toBe('[REDACTED]');
      expect(scrubbed.privateKey).toBe('[REDACTED]');
      expect(scrubbed.pendingSecretImports).toBe('[REDACTED]');
      expect(scrubbed.phase).toBe('displaying-otp');
    });

    it('redacts addresses, mnemonics, and deeplinks in strings', () => {
      const scrubbed = scrubSensitiveQrSyncData(
        `fail ${TEST_ADDRESS} seed ${TEST_MNEMONIC} link ${TEST_MWP_DEEPLINK}`,
      ) as string;

      expect(scrubbed).not.toContain(TEST_ADDRESS);
      expect(scrubbed).not.toContain(TEST_MNEMONIC);
      expect(scrubbed).not.toContain(TEST_MWP_DEEPLINK);
      expect(scrubbed).toContain('[REDACTED]');
    });

    it('redacts nested values without dropping safe fields', () => {
      const scrubbed = scrubSensitiveQrSyncData({
        surface: QrSyncSurfaces.SCANNER,
        extras: {
          content: TEST_MWP_DEEPLINK,
          note: 'ok',
        },
      }) as {
        surface: string;
        extras: { content: string; note: string };
      };

      expect(scrubbed.surface).toBe(QrSyncSurfaces.SCANNER);
      expect(scrubbed.extras.note).toBe('ok');
      expect(scrubbed.extras.content).toBe('[REDACTED]');
    });

    it('preserves null, undefined, numbers, booleans, and arrays', () => {
      expect(scrubSensitiveQrSyncData(null)).toBeNull();
      expect(scrubSensitiveQrSyncData(undefined)).toBeUndefined();
      expect(scrubSensitiveQrSyncData(42)).toBe(42);
      expect(scrubSensitiveQrSyncData(true)).toBe(true);
      expect(scrubSensitiveQrSyncData([TEST_ADDRESS, 'safe'])).toEqual([
        '[REDACTED]',
        'safe',
      ]);
    });

    it('stringifies bigint and symbol values', () => {
      expect(scrubSensitiveQrSyncData(10n)).toBe('10');
      expect(scrubSensitiveQrSyncData(Symbol.for('qr-sync'))).toBe(
        'Symbol(qr-sync)',
      );
    });

    it('redacts e2e qr-sync deeplinks', () => {
      const scrubbed = scrubSensitiveQrSyncData(
        'open metamask://e2e/qr-sync/payload?token=abc and e2e://qr-sync/x',
      ) as string;

      expect(scrubbed).not.toContain('e2e/qr-sync');
      expect(scrubbed).toContain('[REDACTED]');
    });

    it('marks unsupported value types', () => {
      expect(scrubSensitiveQrSyncData(() => undefined)).toBe('[unsupported]');
    });
  });

  describe('addQrSyncPhaseBreadcrumb', () => {
    it('emits a phase breadcrumb without secrets', () => {
      addQrSyncPhaseBreadcrumb({
        phaseFrom: 'initializing',
        phaseTo: 'displaying-otp',
      });

      expect(addBreadcrumb).toHaveBeenCalledWith({
        category: 'qr_sync',
        level: 'info',
        message: 'qr_sync.phase initializing->displaying-otp',
        data: {
          phaseFrom: 'initializing',
          phaseTo: 'displaying-otp',
        },
      });
    });

    it('marks failed transitions as error level with errorCode', () => {
      addQrSyncPhaseBreadcrumb({
        phaseFrom: 'displaying-otp',
        phaseTo: 'failed',
        errorCode: 'CHANNEL_DISCONNECTED',
      });

      expect(addBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'error',
          message:
            'qr_sync.phase displaying-otp->failed code=CHANNEL_DISCONNECTED',
          data: expect.objectContaining({
            phaseFrom: 'displaying-otp',
            phaseTo: 'failed',
            errorCode: 'CHANNEL_DISCONNECTED',
          }),
        }),
      );
    });
  });

  describe('buildQrSyncLoggerErrorOptions', () => {
    it('sets feature:qr-sync tags and scrubs injected secrets from extras', () => {
      const options = buildQrSyncLoggerErrorOptions({
        surface: QrSyncSurfaces.IMPORT,
        operation: QrSyncOperations.EXISTING_USER_MNEMONIC_IMPORT,
        error: new Error('vault import failed'),
        errorCode: 'SYNC_FAILED',
        phase: 'reviewing-import',
        source: QrSyncTelemetrySources.COMPLETE_EXISTING_USER_IMPORT,
        extras: {
          mnemonic: TEST_MNEMONIC,
          otp: TEST_OTP,
          address: TEST_ADDRESS,
          scanContent: TEST_MWP_DEEPLINK,
        },
      });

      expect(options.tags).toEqual(
        expect.objectContaining({
          feature: QR_SYNC_SENTRY_FEATURE,
          surface: QrSyncSurfaces.IMPORT,
          operation: QrSyncOperations.EXISTING_USER_MNEMONIC_IMPORT,
          errorCode: 'SYNC_FAILED',
        }),
      );
      expect(JSON.stringify(options.extras)).not.toContain(TEST_MNEMONIC);
      expect(JSON.stringify(options.extras)).not.toContain(TEST_OTP);
      expect(JSON.stringify(options.extras)).not.toContain(TEST_ADDRESS);
      expect(JSON.stringify(options.extras)).not.toContain(TEST_MWP_DEEPLINK);
      expect(JSON.stringify(options.context?.data)).not.toContain(
        TEST_MNEMONIC,
      );
    });
  });

  describe('reportQrSyncFailure', () => {
    it('forwards scrubbed LoggerErrorOptions to Logger.error', () => {
      reportQrSyncFailure(new Error('scan submit failed'), {
        surface: QrSyncSurfaces.SCANNER,
        operation: QrSyncOperations.SUBMIT_SCANNED_PAYLOAD,
        source: QrSyncTelemetrySources.ADD_DEVICE_ON_SCAN_SUCCESS,
        extras: { qrPayload: TEST_MWP_DEEPLINK },
      });

      expect(Logger.error).toHaveBeenCalledTimes(1);
      const [, options] = jest.mocked(Logger.error).mock.calls[0];
      expect(options).toEqual(
        expect.objectContaining({
          tags: expect.objectContaining({
            feature: QR_SYNC_SENTRY_FEATURE,
            surface: QrSyncSurfaces.SCANNER,
          }),
        }),
      );
      expect(JSON.stringify(options)).not.toContain(TEST_MWP_DEEPLINK);
    });

    it('wraps non-Error values', () => {
      reportQrSyncFailure('boom', {
        surface: QrSyncSurfaces.SESSION,
        operation: QrSyncOperations.TERMINATE_WITH_ERROR,
      });

      expect(Logger.error).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          tags: expect.objectContaining({ feature: QR_SYNC_SENTRY_FEATURE }),
        }),
      );
    });

    it('stringifies plain object failures without [object Object]', () => {
      reportQrSyncFailure(
        { code: 'SYNC_FAILED', detail: 'vault' },
        {
          surface: QrSyncSurfaces.SESSION,
          operation: QrSyncOperations.TERMINATE_WITH_ERROR,
        },
      );

      expect(Logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          message: '{"code":"SYNC_FAILED","detail":"vault"}',
        }),
        expect.any(Object),
      );
    });

    it('stringifies primitive non-Error failures', () => {
      reportQrSyncFailure(404, {
        surface: QrSyncSurfaces.SESSION,
        operation: QrSyncOperations.TERMINATE_WITH_ERROR,
      });
      reportQrSyncFailure(true, {
        surface: QrSyncSurfaces.SESSION,
        operation: QrSyncOperations.TERMINATE_WITH_ERROR,
      });
      reportQrSyncFailure(7n, {
        surface: QrSyncSurfaces.SESSION,
        operation: QrSyncOperations.TERMINATE_WITH_ERROR,
      });
      reportQrSyncFailure(null, {
        surface: QrSyncSurfaces.SESSION,
        operation: QrSyncOperations.TERMINATE_WITH_ERROR,
      });

      expect(Logger.error).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ message: '404' }),
        expect.any(Object),
      );
      expect(Logger.error).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ message: 'true' }),
        expect.any(Object),
      );
      expect(Logger.error).toHaveBeenNthCalledWith(
        3,
        expect.objectContaining({ message: '7' }),
        expect.any(Object),
      );
      expect(Logger.error).toHaveBeenNthCalledWith(
        4,
        expect.objectContaining({ message: '' }),
        expect.any(Object),
      );
    });

    it('falls back when JSON.stringify cannot serialize the failure', () => {
      const circular: Record<string, unknown> = {};
      circular.self = circular;

      reportQrSyncFailure(circular, {
        surface: QrSyncSurfaces.SESSION,
        operation: QrSyncOperations.TERMINATE_WITH_ERROR,
      });

      expect(Logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          message: '[object Object]',
        }),
        expect.any(Object),
      );
    });
  });
});
