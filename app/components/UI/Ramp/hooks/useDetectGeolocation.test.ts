import { renderHook, waitFor } from '@testing-library/react-native';
import useDetectGeolocation from './useDetectGeolocation';
import { SdkEnvironment } from '@consensys/native-ramps-sdk';
import Logger from '../../../../util/Logger';

const mockDispatch = jest.fn();

jest.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
}));

const mockGetSdkEnvironment = jest.fn();
jest.mock('../Deposit/sdk/getSdkEnvironment', () => ({
  getSdkEnvironment: () => mockGetSdkEnvironment(),
}));

global.fetch = jest.fn();
const mockFetch = global.fetch as jest.Mock;

describe('useDetecGeolocation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('URL selection based on environment', () => {
    it('uses production URL when getSdkEnvironment returns Production', async () => {
      mockGetSdkEnvironment.mockReturnValue(SdkEnvironment.Production);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: jest.fn().mockResolvedValue('US'),
      });

      renderHook(() => useDetectGeolocation());

      expect(mockFetch).toHaveBeenCalledWith(
        'https://on-ramp.api.cx.metamask.io/geolocation',
      );
    });

    it('uses development URL when getSdkEnvironment returns Staging', async () => {
      mockGetSdkEnvironment.mockReturnValue(SdkEnvironment.Staging);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: jest.fn().mockResolvedValue('US'),
      });

      renderHook(() => useDetectGeolocation());

      expect(mockFetch).toHaveBeenCalledWith(
        'https://on-ramp.dev-api.cx.metamask.io/geolocation',
      );
    });

    it('uses development URL for any non-production environment', async () => {
      mockGetSdkEnvironment.mockReturnValue('unknown-environment');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: jest.fn().mockResolvedValue('US'),
      });

      renderHook(() => useDetectGeolocation());

      expect(mockFetch).toHaveBeenCalledWith(
        'https://on-ramp.dev-api.cx.metamask.io/geolocation',
      );
    });
  });

  describe('Successful geolocation detection', () => {
    it('dispatches setDetectedGeolocation with returned geolocation when fetch succeeds', async () => {
      const mockGeolocation = 'US';
      mockGetSdkEnvironment.mockReturnValue(SdkEnvironment.Production);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: jest.fn().mockResolvedValue(mockGeolocation),
      });

      renderHook(() => useDetectGeolocation());

      await waitFor(() =>
        expect(mockDispatch).toHaveBeenCalledWith({
          type: 'FIAT_SET_DETECTED_GEOLOCATION',
          payload: mockGeolocation,
        }),
      );
    });

    it('dispatches setDetectedGeolocation with undefined when response text is empty', async () => {
      mockGetSdkEnvironment.mockReturnValue(SdkEnvironment.Production);
      const mockGeolocation = '';
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: jest.fn().mockResolvedValue(mockGeolocation),
      });

      renderHook(() => useDetectGeolocation());

      await waitFor(() =>
        expect(mockDispatch).toHaveBeenCalledWith({
          type: 'FIAT_SET_DETECTED_GEOLOCATION',
          payload: undefined,
        }),
      );
    });

    it('dispatches setDetectedGeolocation with undefined when response text is null', async () => {
      mockGetSdkEnvironment.mockReturnValue(SdkEnvironment.Production);
      const mockGeolocation = null;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: jest.fn().mockResolvedValue(mockGeolocation),
      });

      renderHook(() => useDetectGeolocation());

      await waitFor(() =>
        expect(mockDispatch).toHaveBeenCalledWith({
          type: 'FIAT_SET_DETECTED_GEOLOCATION',
          payload: undefined,
        }),
      );
    });
  });

  describe('Failed geolocation detection', () => {
    it('logs error when fetch response is not ok', async () => {
      mockGetSdkEnvironment.mockReturnValue(SdkEnvironment.Production);

      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Not Found',
      });

      renderHook(() => useDetectGeolocation());
      const mockLoggerError = jest.spyOn(Logger, 'error');

      await waitFor(() =>
        expect(mockLoggerError).toHaveBeenCalledWith(
          expect.any(Error),
          'useDetectedGeolocation: Failed to detect geolocation',
        ),
      );
      expect(mockDispatch).not.toHaveBeenCalled();
    });

    it('logs error when fetch throws network error', async () => {
      const mockLoggerError = jest.spyOn(Logger, 'error');
      const networkError = new Error('Network error');
      mockGetSdkEnvironment.mockReturnValue(SdkEnvironment.Production);

      mockFetch.mockRejectedValueOnce(networkError);

      renderHook(() => useDetectGeolocation());
      await waitFor(() =>
        expect(mockLoggerError).toHaveBeenCalledWith(
          networkError,
          'useDetectedGeolocation: Failed to detect geolocation',
        ),
      );
      expect(mockDispatch).not.toHaveBeenCalled();
    });

    it('logs error when response.text() throws', async () => {
      const mockLoggerError = jest.spyOn(Logger, 'error');
      const textError = new Error('Text parsing error');
      mockGetSdkEnvironment.mockReturnValue(SdkEnvironment.Production);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: jest.fn().mockRejectedValue(textError),
      });

      renderHook(() => useDetectGeolocation());

      await waitFor(() =>
        expect(mockLoggerError).toHaveBeenCalledWith(
          textError,
          'useDetectedGeolocation: Failed to detect geolocation',
        ),
      );
      expect(mockDispatch).not.toHaveBeenCalled();
    });
  });

  describe('Hook lifecycle', () => {
    it('calls detectGeolocation on mount', async () => {
      mockGetSdkEnvironment.mockReturnValue(SdkEnvironment.Production);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: jest.fn().mockResolvedValue('US'),
      });

      renderHook(() => useDetectGeolocation());

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });
    });

    it('calls detectGeolocation again when URL changes due to environment change', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        text: jest.fn().mockResolvedValue('US'),
      });

      mockGetSdkEnvironment.mockReturnValue(SdkEnvironment.Production);
      const { rerender } = renderHook(() => useDetectGeolocation());

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          'https://on-ramp.api.cx.metamask.io/geolocation',
        );
      });

      mockGetSdkEnvironment.mockReturnValue(SdkEnvironment.Staging);
      rerender([]);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          'https://on-ramp.dev-api.cx.metamask.io/geolocation',
        );
        expect(mockFetch).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Error handling edge cases', () => {
    it('handles undefined response from fetch', async () => {
      const mockLoggerError = jest.spyOn(Logger, 'error');
      mockGetSdkEnvironment.mockReturnValue(SdkEnvironment.Production);

      mockFetch.mockResolvedValueOnce(undefined);

      renderHook(() => useDetectGeolocation());

      await waitFor(() => {
        expect(mockLoggerError).toHaveBeenCalledWith(
          expect.any(Error),
          'useDetectedGeolocation: Failed to detect geolocation',
        );
      });
    });

    it('handles response with missing text method', async () => {
      const mockLoggerError = jest.spyOn(Logger, 'error');
      mockGetSdkEnvironment.mockReturnValue(SdkEnvironment.Production);

      mockFetch.mockResolvedValueOnce({
        ok: true,
      });

      renderHook(() => useDetectGeolocation());

      await waitFor(() => {
        expect(mockLoggerError).toHaveBeenCalledWith(
          expect.any(Error),
          'useDetectedGeolocation: Failed to detect geolocation',
        );
      });
    });
  });
});
