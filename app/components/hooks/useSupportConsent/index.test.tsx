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
    const { result } = renderHook(() => useSupportConsent(mockOnNavigate));

    // Then the modal should be hidden by default
    expect(result.current.showConsentModal).toBe(false);
  });

  it('shows modal when handleSupportRedirect is called', () => {
    // Given the hook is initialized
    const { result } = renderHook(() => useSupportConsent(mockOnNavigate));

    // When handleSupportRedirect is called
    act(() => {
      result.current.handleSupportRedirect();
    });

    // Then the modal should be visible
    expect(result.current.showConsentModal).toBe(true);
  });

  it('handles consent and navigates with parameters', async () => {
    // Given getSupportUrl returns a URL with parameters
    const expectedUrl = 'https://support.metamask.io?param=value';
    mockGetSupportUrl.mockResolvedValue(expectedUrl);

    // When the user consents to share information
    const { result } = renderHook(() => useSupportConsent(mockOnNavigate));
    act(() => {
      result.current.handleSupportRedirect();
    });
    await act(async () => {
      await result.current.handleConsent();
    });

    // Then getSupportUrl should be called with consent flag and navigation should occur
    expect(mockGetSupportUrl).toHaveBeenCalledWith(true);
    expect(mockOnNavigate).toHaveBeenCalledWith(expectedUrl);
    expect(result.current.showConsentModal).toBe(false);
  });

  it('handles decline and navigates without parameters', async () => {
    // Given getSupportUrl returns a base URL
    const expectedUrl = 'https://support.metamask.io';
    mockGetSupportUrl.mockResolvedValue(expectedUrl);

    // When the user declines to share information
    const { result } = renderHook(() => useSupportConsent(mockOnNavigate));
    act(() => {
      result.current.handleSupportRedirect();
    });
    await act(async () => {
      await result.current.handleDecline();
    });

    // Then getSupportUrl should be called without consent flag and navigation should occur
    expect(mockGetSupportUrl).toHaveBeenCalledWith(false);
    expect(mockOnNavigate).toHaveBeenCalledWith(expectedUrl);
    expect(result.current.showConsentModal).toBe(false);
  });

  it('handles errors gracefully during consent', async () => {
    // Given getSupportUrl fails on first call but succeeds on fallback
    mockGetSupportUrl
      .mockRejectedValueOnce(new Error('Test error'))
      .mockResolvedValueOnce('https://support.metamask.io');

    // When the user consents to share information
    const { result } = renderHook(() => useSupportConsent(mockOnNavigate));
    act(() => {
      result.current.handleSupportRedirect();
    });
    await act(async () => {
      await result.current.handleConsent();
    });

    // Then the error should be logged and fallback navigation should occur
    expect(mockGetSupportUrl).toHaveBeenCalledWith(true);
    expect(mockGetSupportUrl).toHaveBeenCalledWith(false);
    expect(mockOnNavigate).toHaveBeenCalledWith('https://support.metamask.io');
    expect(result.current.showConsentModal).toBe(false);
    expect(consoleWarnSpy).toHaveBeenCalledWith('Error getting support URL with consent:', expect.any(Error));
  });

  it('handles errors gracefully during decline', async () => {
    // Given getSupportUrl fails
    mockGetSupportUrl.mockRejectedValue(new Error('Test error'));

    // When the user declines to share information
    const { result } = renderHook(() => useSupportConsent(mockOnNavigate));
    act(() => {
      result.current.handleSupportRedirect();
    });
    await act(async () => {
      await result.current.handleDecline();
    });

    // Then the error should be logged and fallback navigation should occur
    expect(mockGetSupportUrl).toHaveBeenCalledWith(false);
    expect(mockOnNavigate).toHaveBeenCalledWith('https://support.metamask.io');
    expect(result.current.showConsentModal).toBe(false);
    expect(consoleWarnSpy).toHaveBeenCalledWith('Error getting support URL without consent:', expect.any(Error));
  });
}); 