import { Alert } from 'react-native';
import { renderHook } from '@testing-library/react-native';
import { useQRScanner, type QRScanResult } from './useQRScanner';
import Routes from '../../../constants/navigation/Routes';
import { Authentication } from '../../../core';
import DeeplinkManager from '../../../core/DeeplinkManager/DeeplinkManager';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('../useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: jest.fn(),
    createEventBuilder: jest.fn(() => ({
      addProperties: jest.fn().mockReturnThis(),
      build: jest.fn(() => ({ name: 'test-event' })),
    })),
  }),
}));

jest.mock('../../../core', () => ({
  Authentication: { importAccountFromPrivateKey: jest.fn() },
}));

jest.mock('../../../core/DeeplinkManager/DeeplinkManager', () => ({
  parse: jest.fn(),
}));

/** Runs the scanner and hands back the `onScanSuccess` the QR tab switcher got. */
const arrangeScan = () => {
  const { result } = renderHook(() => useQRScanner());
  result.current.openQRScanner();
  const [, params] = mockNavigate.mock.calls[0];
  return params.onScanSuccess as (data: QRScanResult, content?: string) => void;
};

describe('useQRScanner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('navigates to the QR tab switcher', () => {
    const { result } = renderHook(() => useQRScanner());

    result.current.openQRScanner();

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.QR_TAB_SWITCHER,
      expect.objectContaining({ onScanSuccess: expect.any(Function) }),
    );
  });

  it('prompts before importing a scanned private key', () => {
    const onScanSuccess = arrangeScan();

    onScanSuccess({ private_key: '0xdeadbeef' });

    expect(Alert.alert).toHaveBeenCalled();
    expect(Authentication.importAccountFromPrivateKey).not.toHaveBeenCalled();
  });

  it('imports the private key when the user confirms', async () => {
    const onScanSuccess = arrangeScan();
    onScanSuccess({ private_key: '0xdeadbeef' });

    const buttons = jest.mocked(Alert.alert).mock.calls[0][2];
    await buttons?.[1]?.onPress?.();

    expect(Authentication.importAccountFromPrivateKey).toHaveBeenCalledWith(
      '0xdeadbeef',
    );
    expect(mockNavigate).toHaveBeenCalledWith('ImportPrivateKeyView', {
      screen: 'ImportPrivateKeySuccess',
    });
  });

  it('refuses a scanned seed phrase', () => {
    const onScanSuccess = arrangeScan();

    onScanSuccess({ seed: 'one two three' });

    expect(Alert.alert).toHaveBeenCalled();
    expect(DeeplinkManager.parse).not.toHaveBeenCalled();
  });

  it('hands anything else to the deeplink parser', () => {
    jest.useFakeTimers();
    const onScanSuccess = arrangeScan();

    onScanSuccess({}, 'https://metamask.app.link/foo');
    jest.runAllTimers();

    expect(DeeplinkManager.parse).toHaveBeenCalledWith(
      'https://metamask.app.link/foo',
      expect.objectContaining({ origin: expect.any(String) }),
    );
    jest.useRealTimers();
  });
});
