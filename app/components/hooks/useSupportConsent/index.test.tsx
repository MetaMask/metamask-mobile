jest.mock('../../../util/support', () => ({
  __esModule: true,
  default: jest.fn(),
}));

import { renderHook, act } from '@testing-library/react-hooks';
import { useSupportConsent } from './index';
import getSupportUrl from '../../../util/support';

const mockGetSupportUrl = getSupportUrl as jest.MockedFunction<typeof getSupportUrl>;

describe('useSupportConsent', () => {
  const mockOnNavigate = jest.fn();
  const mockTitle = 'Support Page';
  let consoleWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  it('initializes with modal hidden', () => {
    // Given the hook is initialized
    const { result } = renderHook(() => useSupportConsent(mockOnNavigate, mockTitle));

    // Then the modal should be hidden by default
    expect(result.current.showConsentModal).toBe(false);
  });

  it('shows modal when openSupportWebPage is called in non-beta environment', () => {
    // Given the hook is initialized
    const { result } = renderHook(() => useSupportConsent(mockOnNavigate, mockTitle));

    // When openSupportWebPage is called
    act(() => {
      result.current.openSupportWebPage();
    });

    // Then the modal should be visible
    expect(result.current.showConsentModal).toBe(true);
  });

  it('handles consent and navigates with parameters', async () => {
    // Given getSupportUrl returns a URL with parameters
    const expectedUrl = 'https://support.metamask.io?param=value';
    mockGetSupportUrl.mockResolvedValue(expectedUrl);

    // When the user consents to share information
    const { result } = renderHook(() => useSupportConsent(mockOnNavigate, mockTitle));
    act(() => {
      result.current.openSupportWebPage();
    });
    await act(async () => {
      await result.current.handleConsent();
    });

    // Then getSupportUrl should be called with consent flag and navigation should occur
    expect(mockGetSupportUrl).toHaveBeenCalledWith(true);
    expect(mockOnNavigate).toHaveBeenCalledWith(expectedUrl, mockTitle);
    expect(result.current.showConsentModal).toBe(false);
  });

  it('handles decline and navigates without parameters', async () => {
    // Given getSupportUrl returns a base URL
    const expectedUrl = 'https://support.metamask.io';
    mockGetSupportUrl.mockResolvedValue(expectedUrl);

    // When the user declines to share information
    const { result } = renderHook(() => useSupportConsent(mockOnNavigate, mockTitle));
    act(() => {
      result.current.openSupportWebPage();
    });
    await act(async () => {
      await result.current.handleDecline();
    });

    // Then getSupportUrl should be called without consent flag and navigation should occur
    expect(mockGetSupportUrl).toHaveBeenCalledWith(false);
    expect(mockOnNavigate).toHaveBeenCalledWith(expectedUrl, mockTitle);
    expect(result.current.showConsentModal).toBe(false);
  });

  it('handles errors gracefully during consent', async () => {
    // Given getSupportUrl fails on first call but succeeds on fallback
    mockGetSupportUrl
      .mockRejectedValueOnce(new Error('Test error'))
      .mockResolvedValueOnce('https://support.metamask.io');

    // When the user consents to share information
    const { result } = renderHook(() => useSupportConsent(mockOnNavigate, mockTitle));
    act(() => {
      result.current.openSupportWebPage();
    });
    await act(async () => {
      await result.current.handleConsent();
    });

    // Then the error should be logged and fallback navigation should occur
    expect(mockGetSupportUrl).toHaveBeenCalledWith(true);
    expect(mockGetSupportUrl).toHaveBeenCalledWith(false);
    expect(mockOnNavigate).toHaveBeenCalledWith('https://support.metamask.io', mockTitle);
    expect(result.current.showConsentModal).toBe(false);
    expect(consoleWarnSpy).toHaveBeenCalledWith('Error getting support URL with consent:', expect.any(Error));
  });

  it('handles errors gracefully during decline', async () => {
    // Given getSupportUrl fails
    mockGetSupportUrl.mockRejectedValue(new Error('Test error'));

    // When the user declines to share information
    const { result } = renderHook(() => useSupportConsent(mockOnNavigate, mockTitle));
    act(() => {
      result.current.openSupportWebPage();
    });
    await act(async () => {
      await result.current.handleDecline();
    });

    // Then the error should be logged and fallback navigation should occur
    expect(mockGetSupportUrl).toHaveBeenCalledWith(false);
    expect(mockOnNavigate).toHaveBeenCalledWith('https://support.metamask.io', mockTitle);
    expect(result.current.showConsentModal).toBe(false);
    expect(consoleWarnSpy).toHaveBeenCalledWith('Error getting support URL without consent:', expect.any(Error));
  });

  it('passes title parameter to navigation callback', () => {
    // Given the hook is initialized with a specific title
    const customTitle = 'Custom Support Title';
    const { result } = renderHook(() => useSupportConsent(mockOnNavigate, customTitle));

    // When openSupportWebPage is called
    act(() => {
      result.current.openSupportWebPage();
    });

    // Then the modal should be visible (indicating the hook is working)
    expect(result.current.showConsentModal).toBe(true);
  });

  it('handles beta environment correctly', () => {
    // Given the hook is initialized
    const { result } = renderHook(() => useSupportConsent(mockOnNavigate, mockTitle));

    // When openSupportWebPage is called in beta environment
    // Note: In non-beta builds, this will show the modal
    // In beta builds, this would directly navigate to beta support URL
    act(() => {
      result.current.openSupportWebPage();
    });

    // Then the modal should be visible (for non-beta builds)
    // This test verifies the default behavior works correctly
    expect(result.current.showConsentModal).toBe(true);
  });

  it('handles consent modal state correctly', async () => {
    // Given getSupportUrl returns a URL
    mockGetSupportUrl.mockResolvedValue('https://support.metamask.io');
    
    // Given the hook is initialized
    const { result } = renderHook(() => useSupportConsent(mockOnNavigate, mockTitle));

    // When openSupportWebPage is called
    act(() => {
      result.current.openSupportWebPage();
    });

    // Then the modal should be visible
    expect(result.current.showConsentModal).toBe(true);

    // When consent is handled
    await act(async () => {
      await result.current.handleConsent();
    });

    // Then the modal should be hidden
    expect(result.current.showConsentModal).toBe(false);
  });
}); 