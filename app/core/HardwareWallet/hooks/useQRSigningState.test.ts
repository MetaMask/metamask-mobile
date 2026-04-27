import { act } from '@testing-library/react-native';
import { QrScanRequestType } from '@metamask/eth-qr-keyring';

import { renderHookWithProvider } from '../../../util/test/renderWithProvider';
import { scanRequested } from '../../redux/slices/qrKeyringScanner';
import { useQRSigningState } from './useQRSigningState';

const mockQrScanner = {
  rejectPendingScan: jest.fn(),
};

jest.mock('../../Engine', () => ({
  getQrKeyringScanner: jest.fn(() => mockQrScanner),
}));

describe('useQRSigningState', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('preserves the returned object reference across rerenders when QR state is unchanged', () => {
    const { result, rerender } = renderHookWithProvider(
      () => useQRSigningState(),
      {
        state: { qrKeyringScanner: {} },
      },
    );

    const initialValue = result.current;

    rerender(undefined as never);

    expect(result.current).toBe(initialValue);
  });

  it('returns a new object reference when QR state changes', () => {
    const { result, store } = renderHookWithProvider(
      () => useQRSigningState(),
      {
        state: { qrKeyringScanner: {} },
      },
    );

    const initialValue = result.current;

    act(() => {
      store.dispatch(
        scanRequested({
          type: QrScanRequestType.SIGN,
          request: {
            requestId: 'new-request',
            payload: { type: 'eth-sign-request', cbor: 'abc' },
          },
        }),
      );
    });

    expect(result.current).not.toBe(initialValue);
  });

  it('returns initial state when no pending scan request', () => {
    const { result } = renderHookWithProvider(() => useQRSigningState(), {
      state: { qrKeyringScanner: {} },
    });

    expect(result.current.pendingScanRequest).toBeUndefined();
    expect(result.current.isSigningQRObject).toBe(false);
    expect(result.current.isRequestCompleted).toBe(false);
  });

  it('detects signing QR object from Redux state', () => {
    const { result } = renderHookWithProvider(() => useQRSigningState(), {
      state: {
        qrKeyringScanner: {
          pendingScanRequest: {
            type: QrScanRequestType.SIGN,
            request: {
              requestId: 'test-id',
              payload: { type: 'eth-sign-request', cbor: 'abc' },
            },
          },
        },
      },
    });

    expect(result.current.isSigningQRObject).toBe(true);
    expect(result.current.pendingScanRequest).toBeDefined();
  });

  it('marks request as completed', () => {
    const { result } = renderHookWithProvider(() => useQRSigningState(), {
      state: { qrKeyringScanner: {} },
    });

    expect(result.current.isRequestCompleted).toBe(false);

    act(() => {
      result.current.setRequestCompleted();
    });

    expect(result.current.isRequestCompleted).toBe(true);
  });

  it('resets request completion when a new signing request arrives', () => {
    const { result, store } = renderHookWithProvider(
      () => useQRSigningState(),
      {
        state: {
          qrKeyringScanner: {
            pendingScanRequest: {
              type: QrScanRequestType.SIGN,
              request: {
                requestId: 'first-request',
                payload: { type: 'eth-sign-request', cbor: 'abc' },
              },
            },
          },
        },
      },
    );

    act(() => {
      result.current.setRequestCompleted();
    });

    expect(result.current.isRequestCompleted).toBe(true);

    act(() => {
      store.dispatch(
        scanRequested({
          type: QrScanRequestType.SIGN,
          request: {
            requestId: 'second-request',
            payload: { type: 'eth-sign-request', cbor: 'def' },
          },
        }),
      );
    });

    expect(result.current.pendingScanRequest?.request?.requestId).toBe(
      'second-request',
    );
    expect(result.current.isRequestCompleted).toBe(false);
  });

  it('cancelQRScanRequestIfPresent rejects pending scan when signing', async () => {
    const { result } = renderHookWithProvider(() => useQRSigningState(), {
      state: {
        qrKeyringScanner: {
          pendingScanRequest: {
            type: QrScanRequestType.SIGN,
            request: {
              requestId: 'test-id',
              payload: { type: 'eth-sign-request', cbor: 'abc' },
            },
          },
        },
      },
    });

    await act(async () => {
      await result.current.cancelQRScanRequestIfPresent();
    });

    expect(mockQrScanner.rejectPendingScan).toHaveBeenCalledTimes(1);
    expect(mockQrScanner.rejectPendingScan).toHaveBeenCalledWith(
      expect.any(Error),
    );
    expect(result.current.isRequestCompleted).toBe(true);
  });

  it('cancelQRScanRequestIfPresent is a no-op when not signing', async () => {
    const { result } = renderHookWithProvider(() => useQRSigningState(), {
      state: { qrKeyringScanner: {} },
    });

    await act(async () => {
      await result.current.cancelQRScanRequestIfPresent();
    });

    expect(mockQrScanner.rejectPendingScan).not.toHaveBeenCalled();
  });
});
