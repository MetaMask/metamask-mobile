import InAppBrowser from 'react-native-inappbrowser-reborn';
import { openUrlWithInAppBrowser } from './openUrlWithInAppBrowser';

jest.mock('react-native-inappbrowser-reborn', () => ({
  isAvailable: jest.fn(),
  open: jest.fn(),
}));

const mockNavigate = jest.fn();
const navigation = { navigate: mockNavigate };

describe('openUrlWithInAppBrowser', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('opens InAppBrowser when available', async () => {
    (InAppBrowser.isAvailable as jest.Mock).mockResolvedValue(true);
    (InAppBrowser.open as jest.Mock).mockResolvedValue(undefined);

    await openUrlWithInAppBrowser(
      'https://arbiscan.io/address/0xabc',
      navigation,
      'Arbiscan',
    );

    expect(InAppBrowser.open).toHaveBeenCalledWith(
      'https://arbiscan.io/address/0xabc',
    );
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('falls back to SimpleWebview when InAppBrowser is unavailable', async () => {
    (InAppBrowser.isAvailable as jest.Mock).mockResolvedValue(false);

    await openUrlWithInAppBrowser(
      'https://arbiscan.io/address/0xabc',
      navigation,
      'Arbiscan',
    );

    expect(InAppBrowser.open).not.toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('Webview', {
      screen: 'SimpleWebview',
      params: { url: 'https://arbiscan.io/address/0xabc', title: 'Arbiscan' },
    });
  });

  it('omits title in SimpleWebview params when not provided', async () => {
    (InAppBrowser.isAvailable as jest.Mock).mockResolvedValue(false);

    await openUrlWithInAppBrowser(
      'https://solana.explorer/address/sol',
      navigation,
    );

    expect(mockNavigate).toHaveBeenCalledWith('Webview', {
      screen: 'SimpleWebview',
      params: { url: 'https://solana.explorer/address/sol' },
    });
  });
});
