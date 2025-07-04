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

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSupportUrl.mockResolvedValue('https://support.metamask.io');
  });

  it('initializes with modal hidden', () => {
    const { result } = renderHook(() =>
      useSupportConsent(mockOnNavigate, mockTitle),
    );

    expect(result.current.showConsentModal).toBe(false);
  });

  it('shows modal when openSupportWebPage is called in non-beta environment', () => {
    // Mock non-beta environment
    const originalEnv = process.env.METAMASK_BUILD_TYPE;
    process.env.METAMASK_BUILD_TYPE = 'production';

    const { result } = renderHook(() =>
      useSupportConsent(mockOnNavigate, mockTitle),
    );

    act(() => {
      result.current.openSupportWebPage();
    });

    expect(result.current.showConsentModal).toBe(true);

    // Restore original environment
    process.env.METAMASK_BUILD_TYPE = originalEnv;
  });

  it('handles consent and navigates with parameters', async () => {
    const { result } = renderHook(() =>
      useSupportConsent(mockOnNavigate, mockTitle),
    );

    await act(async () => {
      await result.current.handleConsent();
    });

    expect(mockGetSupportUrl).toHaveBeenCalledWith(true);
    expect(mockOnNavigate).toHaveBeenCalledWith(
      'https://support.metamask.io',
      mockTitle,
    );
    expect(result.current.showConsentModal).toBe(false);
  });

  it('handles decline and navigates without parameters', async () => {
    const { result } = renderHook(() =>
      useSupportConsent(mockOnNavigate, mockTitle),
    );

    await act(async () => {
      await result.current.handleDecline();
    });

    expect(mockGetSupportUrl).toHaveBeenCalledWith(false);
    expect(mockOnNavigate).toHaveBeenCalledWith(
      'https://support.metamask.io',
      mockTitle,
    );
    expect(result.current.showConsentModal).toBe(false);
  });

  it('handles errors gracefully during consent', async () => {
    mockGetSupportUrl.mockRejectedValueOnce(new Error('Network error'));
    mockGetSupportUrl.mockResolvedValueOnce('https://support.metamask.io');

    const { result } = renderHook(() =>
      useSupportConsent(mockOnNavigate, mockTitle),
    );

    await act(async () => {
      await result.current.handleConsent();
    });

    expect(mockGetSupportUrl).toHaveBeenCalledWith(true);
    expect(mockGetSupportUrl).toHaveBeenCalledWith(false);
    expect(mockOnNavigate).toHaveBeenCalledWith(
      'https://support.metamask.io',
      mockTitle,
    );
  });

  it('handles errors gracefully during decline', async () => {
    mockGetSupportUrl.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() =>
      useSupportConsent(mockOnNavigate, mockTitle),
    );

    await act(async () => {
      await result.current.handleDecline();
    });

    expect(mockGetSupportUrl).toHaveBeenCalledWith(false);
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

    await act(async () => {
      await result.current.handleConsent();
    });

    expect(mockOnNavigate).toHaveBeenCalledWith(
      'https://support.metamask.io',
      customTitle,
    );
  });

  it('handles beta environment correctly', () => {
    // Mock beta environment
    const originalEnv = process.env.METAMASK_BUILD_TYPE;
    delete process.env.METAMASK_BUILD_TYPE;
    process.env.METAMASK_BUILD_TYPE = 'beta';

    const { result } = renderHook(() =>
      useSupportConsent(mockOnNavigate, mockTitle),
    );

    act(() => {
      result.current.openSupportWebPage();
    });

    expect(result.current.showConsentModal).toBe(false);
    expect(mockOnNavigate).toHaveBeenCalledWith(
      'https://intercom.help/internal-beta-testing/en/',
      mockTitle,
    );

    // Restore original environment
    process.env.METAMASK_BUILD_TYPE = originalEnv;
  });

  it('handles consent modal state correctly', () => {
    const { result } = renderHook(() =>
      useSupportConsent(mockOnNavigate, mockTitle),
    );

    // Initially hidden
    expect(result.current.showConsentModal).toBe(false);

    // Show modal
    act(() => {
      result.current.openSupportWebPage();
    });
    expect(result.current.showConsentModal).toBe(true);
  });
}); 