import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import { useSupportConsent } from './index';

// Mock the support utility
jest.mock('../../../util/support', () => ({
  __esModule: true,
  default: jest.fn(),
}));

const mockGetSupportUrl = require('../../../util/support').default;

describe('useSupportConsent', () => {
  const mockOnNavigate = jest.fn();
  const mockTitle = 'Test Title';
  let originalEnv: string | undefined;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSupportUrl.mockResolvedValue('https://support.metamask.io');
    originalEnv = process.env.METAMASK_BUILD_TYPE;
  });

  afterEach(() => {
    process.env.METAMASK_BUILD_TYPE = originalEnv;
  });

  it('initializes with modal hidden', () => {
    const { result } = renderHook(() =>
      useSupportConsent(mockOnNavigate, mockTitle),
    );

    expect(result.current.showConsentSheet).toBe(false);
  });

  it('shows modal when openSupportWebPage is called in non-beta environment', () => {
    const { result } = renderHook(() =>
      useSupportConsent(mockOnNavigate, mockTitle, 'production'),
    );

    act(() => {
      result.current.openSupportWebPage();
    });

    expect(result.current.showConsentSheet).toBe(true);
  });

  it('navigates with consent parameters when user consents', async () => {
    const { result } = renderHook(() =>
      useSupportConsent(mockOnNavigate, mockTitle),
    );

    act(() => {
      result.current.openSupportWebPage();
    });

    await act(async () => {
      await result.current.handleConsent();
    });

    expect(mockGetSupportUrl).toHaveBeenCalledWith(true);
    expect(mockOnNavigate).toHaveBeenCalledWith(
      'https://support.metamask.io',
      mockTitle,
    );
    expect(result.current.showConsentSheet).toBe(false);
  });

  it('navigates without consent parameters when user declines', async () => {
    const { result } = renderHook(() =>
      useSupportConsent(mockOnNavigate, mockTitle),
    );

    act(() => {
      result.current.openSupportWebPage();
    });

    await act(async () => {
      await result.current.handleDecline();
    });

    expect(mockGetSupportUrl).toHaveBeenCalledWith(false);
    expect(mockOnNavigate).toHaveBeenCalledWith(
      'https://support.metamask.io',
      mockTitle,
    );
    expect(result.current.showConsentSheet).toBe(false);
  });

  it('falls back to base URL when consent request fails', async () => {
    mockGetSupportUrl.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() =>
      useSupportConsent(mockOnNavigate, mockTitle),
    );

    act(() => {
      result.current.openSupportWebPage();
    });

    await act(async () => {
      await result.current.handleConsent();
    });

    expect(mockGetSupportUrl).toHaveBeenCalledTimes(2);
    expect(mockGetSupportUrl).toHaveBeenNthCalledWith(1, true);
    expect(mockGetSupportUrl).toHaveBeenNthCalledWith(2, false);
    expect(mockOnNavigate).toHaveBeenCalledWith(
      'https://support.metamask.io',
      mockTitle,
    );
  });

  it('uses fallback URL when decline request fails', async () => {
    mockGetSupportUrl.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() =>
      useSupportConsent(mockOnNavigate, mockTitle),
    );

    act(() => {
      result.current.openSupportWebPage();
    });

    await act(async () => {
      await result.current.handleDecline();
    });

    expect(mockOnNavigate).toHaveBeenCalledWith(
      'https://support.metamask.io',
      mockTitle,
    );
  });

  it('passes title parameter to navigation callback', async () => {
    const customTitle = 'Custom Support Title';
    const { result } = renderHook(() =>
      useSupportConsent(mockOnNavigate, customTitle),
    );

    act(() => {
      result.current.openSupportWebPage();
    });

    await act(async () => {
      await result.current.handleConsent();
    });

    expect(mockOnNavigate).toHaveBeenCalledWith(
      'https://support.metamask.io',
      customTitle,
    );
  });

  it('toggles sheet visibility when opening and consenting', async () => {
    const { result } = renderHook(() =>
      useSupportConsent(mockOnNavigate, mockTitle),
    );

    // Initially hidden
    expect(result.current.showConsentSheet).toBe(false);

    // Show modal
    act(() => {
      result.current.openSupportWebPage();
    });
    expect(result.current.showConsentSheet).toBe(true);

    // Hide sheet after consent
    await act(async () => {
      await result.current.handleConsent();
    });
    expect(result.current.showConsentSheet).toBe(false);
  });

  it('bypasses modal and navigates to beta support in beta environment', () => {
    const { result } = renderHook(() =>
      useSupportConsent(mockOnNavigate, mockTitle, 'beta'),
    );

    act(() => {
      result.current.openSupportWebPage();
    });

    expect(result.current.showConsentSheet).toBe(false);
    expect(mockOnNavigate).toHaveBeenCalledWith(
      'https://intercom.help/internal-beta-testing/en/',
      mockTitle,
    );
  });
}); 