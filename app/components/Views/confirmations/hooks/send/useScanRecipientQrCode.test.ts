import { act } from '@testing-library/react-native';

import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import Routes from '../../../../../constants/navigation/Routes';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { useScanRecipientQrCode } from './useScanRecipientQrCode';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

const mockTrackEvent = jest.fn();
const mockBuild = jest.fn().mockReturnValue({ event: 'qr_scanner_opened' });
const mockCreateEventBuilder = jest.fn().mockReturnValue({ build: mockBuild });

jest.mock('../../../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
}));

describe('useScanRecipientQrCode', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns an openScanner function', () => {
    const { result } = renderHookWithProvider(() =>
      useScanRecipientQrCode({ onAddressScanned: jest.fn() }),
    );

    expect(typeof result.current.openScanner).toBe('function');
  });

  it('tracks QR_SCANNER_OPENED and navigates to the scanner with SEND_TO origin', () => {
    const { result } = renderHookWithProvider(() =>
      useScanRecipientQrCode({ onAddressScanned: jest.fn() }),
    );

    act(() => {
      result.current.openScanner();
    });

    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.QR_SCANNER_OPENED,
    );
    expect(mockTrackEvent).toHaveBeenCalledWith({
      event: 'qr_scanner_opened',
    });
    expect(mockNavigate.mock.calls[0][0]).toBe(Routes.QR_TAB_SWITCHER);
    expect(mockNavigate.mock.calls[0][1]).toEqual(
      expect.objectContaining({ origin: Routes.SEND_FLOW.SEND_TO }),
    );
  });

  it('forwards the scanned address to onAddressScanned on success', () => {
    const onAddressScanned = jest.fn();
    const { result } = renderHookWithProvider(() =>
      useScanRecipientQrCode({ onAddressScanned }),
    );

    act(() => {
      result.current.openScanner();
    });

    const { onScanSuccess } = mockNavigate.mock.calls[0][1];
    onScanSuccess({
      target_address: '0x1234567890123456789012345678901234567890',
    });

    expect(onAddressScanned).toHaveBeenCalledWith(
      '0x1234567890123456789012345678901234567890',
    );
  });

  it('does not call onAddressScanned when no target_address is present', () => {
    const onAddressScanned = jest.fn();
    const { result } = renderHookWithProvider(() =>
      useScanRecipientQrCode({ onAddressScanned }),
    );

    act(() => {
      result.current.openScanner();
    });

    const { onScanSuccess } = mockNavigate.mock.calls[0][1];
    onScanSuccess({});

    expect(onAddressScanned).not.toHaveBeenCalled();
  });
});
