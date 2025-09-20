import { renderHook, act } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { useSupportConsent } from './index';
import {
  selectShouldShowConsentSheet,
  selectDataSharingPreference,
} from '../../../selectors/security';
import Routes from '../../../constants/navigation/Routes';

// Mock the support utility
jest.mock('../../../util/support', () => jest.fn());

// Mock Redux
jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

// Mock Navigation
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

// Mock the support utility
jest.mock('../../../util/support', () => ({
  __esModule: true,
  default: jest.fn(),
}));

import mockGetSupportUrl from '../../../util/support';
const mockGetSupportUrlTyped = mockGetSupportUrl as jest.MockedFunction<
  typeof mockGetSupportUrl
>;
const mockUseSelectorTyped = useSelector as jest.MockedFunction<
  typeof useSelector
>;
const mockUseNavigation = useNavigation as jest.MockedFunction<
  typeof useNavigation
>;

describe('useSupportConsent', () => {
  const mockOnNavigate = jest.fn();
  const mockTitle = 'Test Title';
  const mockNavigation = {
    navigate: jest.fn(),
  };
  let originalEnv: string | undefined;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSupportUrlTyped.mockResolvedValue('https://support.metamask.io');
    mockUseNavigation.mockReturnValue(mockNavigation);
    originalEnv = process.env.METAMASK_BUILD_TYPE;

    // Setup Redux mocks - default behavior
    mockUseSelectorTyped.mockImplementation((selector) => {
      // Return appropriate values based on which selector is called
      if (selector === selectShouldShowConsentSheet) {
        return true; // Default: show consent sheet
      }
      if (selector === selectDataSharingPreference) {
        return null; // Default: no preference saved
      }
      return null;
    });
  });

  afterEach(() => {
    process.env.METAMASK_BUILD_TYPE = originalEnv;
  });

  it('navigates to consent modal when openSupportWebPage is called in non-beta environment', () => {
    const { result } = renderHook(() =>
      useSupportConsent(mockOnNavigate, mockTitle, 'production'),
    );

    act(() => {
      result.current.openSupportWebPage();
    });

    expect(mockNavigation.navigate).toHaveBeenCalledWith(
      Routes.MODAL.ROOT_MODAL_FLOW,
      {
        screen: Routes.MODAL.SUPPORT_CONSENT_MODAL,
        params: {
          onConsent: expect.any(Function),
          onDecline: expect.any(Function),
        },
      },
    );
  });

  it('navigates with consent parameters when user consents', async () => {
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
  });

  it('navigates without consent parameters when user declines', async () => {
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

  it('falls back to base URL when consent request fails', async () => {
    mockGetSupportUrlTyped.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() =>
      useSupportConsent(mockOnNavigate, mockTitle),
    );

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
    mockGetSupportUrlTyped.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() =>
      useSupportConsent(mockOnNavigate, mockTitle),
    );

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

    await act(async () => {
      await result.current.handleConsent();
    });

    expect(mockOnNavigate).toHaveBeenCalledWith(
      'https://support.metamask.io',
      customTitle,
    );
  });

  it('navigates to consent modal and handles consent flow', async () => {
    const { result } = renderHook(() =>
      useSupportConsent(mockOnNavigate, mockTitle),
    );

    // Navigate to consent modal
    act(() => {
      result.current.openSupportWebPage();
    });
    expect(mockNavigation.navigate).toHaveBeenCalledWith(
      Routes.MODAL.ROOT_MODAL_FLOW,
      {
        screen: Routes.MODAL.SUPPORT_CONSENT_MODAL,
        params: {
          onConsent: expect.any(Function),
          onDecline: expect.any(Function),
        },
      },
    );

    // Handle consent
    await act(async () => {
      await result.current.handleConsent();
    });
    expect(mockOnNavigate).toHaveBeenCalledWith(
      'https://support.metamask.io',
      mockTitle,
    );
  });

  it('bypasses modal and navigates to beta support in beta environment', () => {
    const { result } = renderHook(() =>
      useSupportConsent(mockOnNavigate, mockTitle, 'beta'),
    );

    act(() => {
      result.current.openSupportWebPage();
    });

    expect(mockNavigation.navigate).not.toHaveBeenCalled();
    expect(mockOnNavigate).toHaveBeenCalledWith(
      'https://intercom.help/internal-beta-testing/en/',
      mockTitle,
    );
  });

  describe('Preference Persistence', () => {
    it('navigates directly to support when user has saved preference and disabled consent sheet', async () => {
      mockUseSelectorTyped.mockImplementation((selector) => {
        if (selector === selectShouldShowConsentSheet) {
          return false; // Don't show consent sheet
        }
        if (selector === selectDataSharingPreference) {
          return true; // Share data
        }
        return null;
      });

      const { result } = renderHook(() =>
        useSupportConsent(mockOnNavigate, mockTitle),
      );

      await act(async () => {
        result.current.openSupportWebPage();
      });

      expect(mockNavigation.navigate).not.toHaveBeenCalled();
      expect(mockOnNavigate).toHaveBeenCalledWith(
        'https://support.metamask.io',
        mockTitle,
      );
    });

    it('navigates to consent sheet when user has enabled consent sheet', async () => {
      mockUseSelectorTyped.mockImplementation((selector) => {
        if (selector === selectShouldShowConsentSheet) {
          return true; // Show consent sheet
        }
        if (selector === selectDataSharingPreference) {
          return true; // dataSharingPreference = true (ignored)
        }
        return null;
      });

      const { result } = renderHook(() =>
        useSupportConsent(mockOnNavigate, mockTitle),
      );

      await act(async () => {
        result.current.openSupportWebPage();
      });

      expect(mockNavigation.navigate).toHaveBeenCalledWith(
        Routes.MODAL.ROOT_MODAL_FLOW,
        {
          screen: Routes.MODAL.SUPPORT_CONSENT_MODAL,
          params: {
            onConsent: expect.any(Function),
            onDecline: expect.any(Function),
          },
        },
      );
      expect(mockOnNavigate).not.toHaveBeenCalled();
    });

    it('navigates to consent sheet when user has no saved data sharing preference', async () => {
      mockUseSelectorTyped.mockImplementation((selector) => {
        if (selector === selectShouldShowConsentSheet) {
          return false; // Don't show consent sheet
        }
        if (selector === selectDataSharingPreference) {
          return null; // No preference saved
        }
        return null;
      });

      const { result } = renderHook(() =>
        useSupportConsent(mockOnNavigate, mockTitle),
      );

      await act(async () => {
        result.current.openSupportWebPage();
      });

      expect(mockNavigation.navigate).toHaveBeenCalledWith(
        Routes.MODAL.ROOT_MODAL_FLOW,
        {
          screen: Routes.MODAL.SUPPORT_CONSENT_MODAL,
          params: {
            onConsent: expect.any(Function),
            onDecline: expect.any(Function),
          },
        },
      );
      expect(mockOnNavigate).not.toHaveBeenCalled();
    });

    it('handles network errors gracefully with saved preference', async () => {
      mockUseSelectorTyped.mockImplementation((selector) => {
        if (selector === selectShouldShowConsentSheet) {
          return false; // Don't show consent sheet
        }
        if (selector === selectDataSharingPreference) {
          return true; // Share data
        }
        return null;
      });
      mockGetSupportUrlTyped.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() =>
        useSupportConsent(mockOnNavigate, mockTitle),
      );

      await act(async () => {
        result.current.openSupportWebPage();
      });

      expect(mockNavigation.navigate).not.toHaveBeenCalled();
      expect(mockOnNavigate).toHaveBeenCalledWith(
        'https://support.metamask.io',
        mockTitle,
      );
    });
  });
});
